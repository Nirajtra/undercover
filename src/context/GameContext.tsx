import React, { createContext, useContext, useState } from "react";
import { GameState, Player, GamePhase, PlayerRole, RoleDistribution, RoundRecord } from "../types/game";
import { toast } from "sonner";
import { calculateDefaultDistribution, distributionMeetsLimits } from "../config/roleDistribution";
import { useTranslation } from "react-i18next";
import { shuffle } from "@/lib/utils";
import { isDuplicateComment, normalize } from "@/lib/comments";

interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addPlayer: (name: string, id: string) => void;
  removePlayer: (id: string) => void;
  startGame: () => void;
  setPhase: (phase: GamePhase) => void;
  submitVote: (voterId: string, targetId: string) => void;
  closeVoting: () => void;
  submitMrWhiteGuess: (guess: string) => void;
  submitDescription: (playerId: string, description: string) => void;
  timeoutSpeaker: (playerId: string, fallback: string) => void;
  resetGame: () => void;
  updateRoleDistribution: (distribution: RoleDistribution) => void;
  updateTurnTimer: (seconds: number) => void;
  checkGameEnd: (players: Player[]) => string | null;
  continueAfterResults: () => void;
  rerollWords: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    phase: "setup",
    currentRound: 0,
    majorityWord: "",
    undercoverWord: "",
    mrWhiteGuess: undefined,
    roleDistribution: calculateDefaultDistribution(4),
    turnTimer: 0,
  });

  const addPlayer = (name: string, id: string) => {
    setGameState((prev) => {
      // Same connection joining twice (e.g. double-clicked Join) — keep the existing player
      if (prev.players.some(p => p.id === id)) return prev;

      if (prev.players.length >= 10) {
        toast.error(t("gameSetup.maxPlayers"));
        return prev;
      }

      // Two different people with the same name get "Name 2", "Name 3", ...
      let uniqueName = name;
      for (let n = 2; prev.players.some(p => p.name.toLowerCase() === uniqueName.toLowerCase()); n++) {
        uniqueName = `${name} ${n}`;
      }

      const score = 0;
      let role = undefined;
      let isEliminated = undefined;
      if (prev.phase !== "setup") {
        role = "spectator";
        isEliminated = true;
      }

      const newPlayers = [...prev.players, { id, name: uniqueName, role, isEliminated, score }];
      return {
        ...prev,
        players: newPlayers,
        roleDistribution: calculateDefaultDistribution(newPlayers.length),
      };
    });
  };

  const removePlayer = (id: string) => {
    setGameState((prev) => {
      const player = prev.players.find(p => p.id === id);
      if (!player) return prev;

      const newSpeakingOrder = prev.speakingOrder?.filter(s => s !== id);
      // If the leaver was speaking, the next players' early comments may now be due
      const newPlayers = revealDueComments(prev, prev.players.filter(p => p.id !== id), newSpeakingOrder);
      let next: GameState = { ...prev, players: newPlayers, speakingOrder: newSpeakingOrder };

      if (prev.phase === "setup") {
        // Keep the role setup valid for the smaller group
        return distributionMeetsLimits(prev.roleDistribution, newPlayers.length)
          ? next
          : { ...next, roleDistribution: calculateDefaultDistribution(newPlayers.length) };
      }

      const winner = checkGameEnd(newPlayers);
      if (winner) return endGame(next, winner);

      if (prev.phase === "voting") {
        // Drop the leaver's vote and votes cast for them (those voters vote again);
        // then, if everyone left has voted, count the votes instead of waiting forever
        const votingResults = Object.fromEntries(
          Object.entries(prev.votingResults ?? {}).filter(([voter, target]) => voter !== id && target !== id)
        );
        const tieCandidates = prev.tieCandidates?.filter(c => c !== id);
        next = { ...next, votingResults, tieCandidates: tieCandidates?.length ? tieCandidates : undefined };
        const active = newPlayers.filter(p => !p.isEliminated);
        if (active.length > 0 && active.every(p => p.id in votingResults)) return resolveVotes(next, votingResults);
      }

      // The player being voted out left before the result was handled: just move on
      if (prev.phase === "results" && prev.lastEliminatedId === id) {
        return finishResults(next);
      }

      return next;
    });
  };

  // Points per winning player
  const withScores = (players: Player[], winner: string) =>
    players.map(p => {
      let points = 0;
      if (winner === "civilian" && p.role === "civilian") points = 2;
      if ((winner === "undercover" || winner === "infiltrators") && p.role === "undercover") points = 10;
      if ((winner === "mrwhite" || winner === "infiltrators") && p.role === "mrwhite") points = 6;
      return { ...p, score: (p.score || 0) + points };
    });

  // The one place a game ends: sets the winner and awards points exactly once
  const endGame = (state: GameState, winner: string): GameState => ({
    ...state,
    phase: "gameEnd",
    winner,
    players: withScores(state.players, winner),
  });

  // After a vote: the voted-out player is eliminated, then either the game ends or the next round starts
  const finishResults = (prev: GameState): GameState => {
    if (prev.phase !== "results") return prev;
    const players = prev.players.map(p => ({
      ...p,
      isEliminated: p.id === prev.lastEliminatedId ? true : p.isEliminated,
      submittedDescription: undefined,
      pendingDescription: undefined,
      pendingRejected: undefined,
    }));
    const next: GameState = { ...prev, players, votingResults: {} };
    const winner = checkGameEnd(players);
    return winner ? endGame(next, winner) : { ...next, phase: "discussion" };
  };

  const continueAfterResults = () => setGameState(finishResults);

  // The current speaker is the first alive player in speaking order without a revealed comment
  const getCurrentSpeaker = (players: Player[], speakingOrder?: string[]) =>
    speakingOrder
      ?.map(id => players.find(p => p.id === id))
      .find(p => p && !p.isEliminated && !p.submittedDescription);

  // Reveal early-written comments, in speaking order, for every speaker whose turn has come.
  // An early comment someone else revealed first is dropped instead, and that player has to
  // write a new one (they're told via `pendingRejected`).
  const revealDueComments = (state: GameState, players: Player[], speakingOrder?: string[]) => {
    let updated = players;
    let speaker = getCurrentSpeaker(updated, speakingOrder);
    while (speaker?.pendingDescription) {
      const { id, pendingDescription } = speaker;
      if (isDuplicateComment({ ...state, players: updated }, pendingDescription)) {
        updated = updated.map(p =>
          p.id === id ? { ...p, pendingDescription: undefined, pendingRejected: pendingDescription } : p
        );
        break;
      }
      updated = updated.map(p =>
        p.id === id ? { ...p, submittedDescription: pendingDescription, pendingDescription: undefined } : p
      );
      speaker = getCurrentSpeaker(updated, speakingOrder);
    }
    return updated;
  };

  const generateSpeakingOrder = (players: Player[]) => {
    const activePlayers = players.filter(p => !p.isEliminated);
    const nonWhitePlayers = activePlayers.filter(p => p.role !== "mrwhite");

    // Ensure the first player is not a Mr. White
    const firstPlayer = nonWhitePlayers[Math.floor(Math.random() * nonWhitePlayers.length)];

    const remainingPlayers = activePlayers.filter(p => p.id !== firstPlayer.id);
    const shuffledRemaining = shuffle(remainingPlayers);

    return [firstPlayer, ...shuffledRemaining].map(player => player.id);
  };

  const checkGameEnd = (players: Player[]) => {
    const alivePlayers = players.filter(p => !p.isEliminated);
    const aliveCivilians = alivePlayers.filter(p => p.role === "civilian");
    const aliveUndercovers = alivePlayers.filter(p => p.role === "undercover");
    const aliveMrWhites = alivePlayers.filter(p => p.role === "mrwhite");

    if (aliveUndercovers.length === 0 && aliveMrWhites.length === 0) {
      if (aliveCivilians.length === 0) return null;
      return "civilian";
    }

    if (aliveCivilians.length <= 1) {
      if (aliveUndercovers.length > 0) {
        if (aliveMrWhites.length > 0) {
          return "infiltrators";
        }
        return "undercover";
      }
      return "mrwhite";
    }

    return null;
  };

  const generateAndAssignWords = (players: Player[]) => {
    const wordPairs = t("wordPairs", { returnObjects: true }) as [string, string][];
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    const [majorityWord, undercoverWord] = randomPair;

    const updatedPlayers = players.map(player => ({
      ...player,
      word: player.role === "mrwhite" ? "" : player.role === "undercover" ? undercoverWord : majorityWord,
      submittedDescription: undefined,
      pendingDescription: undefined,
      pendingRejected: undefined,
    }));

    return {
      players: updatedPlayers,
      majorityWord,
      undercoverWord,
    };
  };

  const rerollWords = () => {
    setGameState(prev => {
      if (prev.currentRound !== 1) return prev;

      const { players, majorityWord, undercoverWord } = generateAndAssignWords(prev.players);
      return {
        ...prev,
        players,
        majorityWord,
        undercoverWord,
        // Comments made for the old words no longer apply
        history: (prev.history ?? []).filter(r => !(r.game === (prev.gameNumber ?? 1) && r.round === 1)),
      };
    });
  };

  const startGame = () => {
    setGameState((prev) => {
      // A round is already running (e.g. start triggered twice)
      if (prev.phase === "wordReveal") return prev;

      if (prev.currentRound === 0) {
        if (prev.players.length < 4) {
          toast.error(t("gameSetup.atLeastFourPlayers"));
          return prev;
        }

        const shuffledPlayers = shuffle(prev.players);
        const { undercovers, mrWhites } = prev.roleDistribution;

        const playersWithRoles = shuffledPlayers.map((player, index) => {
          let role: PlayerRole = "civilian";
          if (index < mrWhites) {
            role = "mrwhite";
          } else if (index < mrWhites + undercovers) {
            role = "undercover";
          }

          return {
            ...player,
            role,
            isEliminated: false,
          };
        });

        const { players, majorityWord, undercoverWord } = generateAndAssignWords(playersWithRoles);
        const speakingOrder = generateSpeakingOrder(players);

        return {
          ...prev,
          players,
          speakingOrder,
          phase: "wordReveal",
          majorityWord,
          undercoverWord,
          currentRound: 1,
          mrWhiteGuess: undefined,
          mrWhiteGuessCorrect: undefined,
          winner: undefined,
          lastEliminatedId: undefined,
          votingResults: {},
          tieCandidates: undefined,
          gameNumber: (prev.gameNumber ?? 0) + 1,
        };
      } else {
        return {
          ...prev,
          speakingOrder: generateSpeakingOrder(prev.players),
          phase: "wordReveal",
          votingResults: {},
          tieCandidates: undefined,
          currentRound: prev.currentRound + 1,
          mrWhiteGuess: undefined,
          mrWhiteGuessCorrect: undefined,
        };
      }
    });
  };

  // Record this round's comments so they can be looked back on later. Called on every
  // comment, so the table is always up to date; existing comments are never dropped.
  const snapshotRound = (prev: GameState): RoundRecord[] => {
    const game = prev.gameNumber ?? 1;
    const existing = prev.history?.find(r => r.game === game && r.round === prev.currentRound);
    const entries: RoundRecord["entries"] = (prev.speakingOrder ?? [])
      .map(id => prev.players.find(p => p.id === id))
      .filter((p): p is Player => !!p && !p.isEliminated)
      .map(p => ({
        playerId: p.id,
        name: p.name,
        role: p.role,
        text: p.submittedDescription ?? existing?.entries.find(e => e.playerId === p.id)?.text,
      }));
    // Keep comments from players who left mid-round
    existing?.entries.forEach(e => {
      if (!entries.some(x => x.playerId === e.playerId)) entries.push(e);
    });
    const record: RoundRecord = {
      game,
      round: prev.currentRound,
      majorityWord: prev.majorityWord,
      undercoverWord: prev.undercoverWord,
      eliminatedId: existing?.eliminatedId,
      entries,
    };
    const others = (prev.history ?? []).filter(r => r !== existing);
    return [...others, record];
  };

  const setPhase = (phase: GamePhase) => {
    setGameState((prev) => ({
      ...prev,
      phase,
      // Fresh vote whenever voting (re)starts
      ...(phase === "voting"
        ? { votingResults: {}, tieCandidates: undefined, history: snapshotRound(prev) }
        : {}),
    }));
  };

  // Players may write before their turn: the comment is held as pending and revealed
  // (in speaking order) once their turn comes.
  const submitDescription = (playerId: string, description: string) => {
    setGameState((prev) => {
      // Ignore late submissions (e.g. after the turn timer already skipped this player)
      if (prev.players.find(p => p.id === playerId)?.submittedDescription) return prev;
      // Every comment in a game must be unique
      if (isDuplicateComment(prev, description)) return prev;

      const isTheirTurn = getCurrentSpeaker(prev.players, prev.speakingOrder)?.id === playerId;
      const updatedPlayers = revealDueComments(
        prev,
        prev.players.map(p =>
          p.id !== playerId ? p
            : isTheirTurn ? { ...p, submittedDescription: description, pendingDescription: undefined, pendingRejected: undefined }
              : { ...p, pendingDescription: description, pendingRejected: undefined }
        ),
        prev.speakingOrder,
      );

      const next = { ...prev, players: updatedPlayers };
      return { ...next, history: snapshotRound(next) };
    });
  };

  // Turn timer ran out: use the speaker's early comment if they wrote one, else the fallback
  const timeoutSpeaker = (playerId: string, fallback: string) => {
    setGameState((prev) => {
      const speaker = getCurrentSpeaker(prev.players, prev.speakingOrder);
      if (speaker?.id !== playerId) return prev;

      // An early comment someone else already revealed can't be used
      const early = speaker.pendingDescription && !isDuplicateComment(prev, speaker.pendingDescription)
        ? speaker.pendingDescription
        : undefined;
      const updatedPlayers = revealDueComments(
        prev,
        prev.players.map(p =>
          p.id === playerId
            ? { ...p, submittedDescription: early || fallback, pendingDescription: undefined, pendingRejected: undefined }
            : p
        ),
        prev.speakingOrder,
      );

      const next = { ...prev, players: updatedPlayers };
      return { ...next, history: snapshotRound(next) };
    });
  };

  // Tally the votes cast so far and move on: elimination, or a re-vote on a tie
  const resolveVotes = (prev: GameState, votingResults: Record<string, string>): GameState => {
    const voteCount: Record<string, number> = {};
    Object.values(votingResults).forEach(id => {
      voteCount[id] = (voteCount[id] || 0) + 1;
    });

    // Find the highest vote count
    const maxVotes = Math.max(...Object.values(voteCount));

    // Get all players with the highest votes
    let mostVotedPlayers = Object.entries(voteCount)
      .filter(([_, votes]) => votes === maxVotes)
      .map(([id]) => id);

    // Nobody voted before the timer ran out: every valid target is "tied" and gets drawn from
    const noVotes = mostVotedPlayers.length === 0;
    if (noVotes) {
      mostVotedPlayers = prev.tieCandidates
        ?? prev.players.filter(p => !p.isEliminated).map(p => p.id);
    }

    // Tie: re-vote between only the tied players. If a re-vote ties between the
    // exact same players again it's a deadlock, so fall back to a random pick.
    const isDeadlock = prev.tieCandidates?.length === mostVotedPlayers.length
      && mostVotedPlayers.every(id => prev.tieCandidates.includes(id));
    if (mostVotedPlayers.length > 1 && !isDeadlock && !noVotes) {
      return {
        ...prev,
        votingResults: {},
        tieCandidates: mostVotedPlayers,
      };
    }

    const eliminatedId = mostVotedPlayers[Math.floor(Math.random() * mostVotedPlayers.length)];

    const history = (prev.history ?? []).map(r =>
      r.game === (prev.gameNumber ?? 1) && r.round === prev.currentRound ? { ...r, eliminatedId } : r
    );

    return {
      ...prev,
      votingResults,
      tieCandidates: undefined,
      phase: "results",
      lastEliminatedId: eliminatedId,
      history,
    };
  };

  const submitVote = (voterId: string, targetId: string) => {
    setGameState((prev) => {
      // Ignore votes that arrive after voting closed
      if (prev.phase !== "voting") return prev;
      // During a re-vote only the tied players are valid targets
      if (prev.tieCandidates && !prev.tieCandidates.includes(targetId)) return prev;

      const newVotingResults = { ...(prev.votingResults || {}), [voterId]: targetId };
      const activePlayers = prev.players.filter(p => !p.isEliminated);
      const allVoted = activePlayers.every(p => p.id in newVotingResults);

      if (allVoted) {
        return resolveVotes(prev, newVotingResults);
      }

      return {
        ...prev,
        votingResults: newVotingResults
      };
    });
  };

  // Called by the host when the voting timer runs out; players who didn't vote are skipped
  const closeVoting = () => {
    setGameState((prev) => {
      if (prev.phase !== "voting") return prev;
      return resolveVotes(prev, prev.votingResults || {});
    });
  };

  const submitMrWhiteGuess = (guess: string) => {
    setGameState((prev) => {
      // Ignore a late guess arriving after the timer already ended the guess
      if (prev.mrWhiteGuess || prev.phase !== "results") return prev;

      if (normalize(guess) === normalize(prev.majorityWord)) {
        return endGame({ ...prev, mrWhiteGuess: guess, mrWhiteGuessCorrect: true }, "mrwhite");
      }

      // Wrong guess: Mr. White is out, so check for a winner without them
      // (counting them as alive could wrongly hand the win to Mr. White)
      const next: GameState = { ...prev, mrWhiteGuess: guess, mrWhiteGuessCorrect: false };
      const playersAfter = prev.players.map(p => (p.id === prev.lastEliminatedId ? { ...p, isEliminated: true } : p));
      const winner = checkGameEnd(playersAfter);
      // No winner yet: stay on the results screen, which shows the guess and then moves on
      return winner ? endGame({ ...next, players: playersAfter }, winner) : next;
    });
  };

  const resetGame = () => {
    setGameState((prev) => {
      const players = prev.players.map(p => ({ ...p, isEliminated: false, submittedDescription: undefined, pendingDescription: undefined, pendingRejected: undefined }));
      return {
        players: players,
        phase: "setup",
        currentRound: 0,
        majorityWord: "",
        undercoverWord: "",
        mrWhiteGuess: undefined,
        roleDistribution: prev.roleDistribution,
        turnTimer: prev.turnTimer,
        gameNumber: prev.gameNumber,
        history: prev.history,
      };
    });
  };

  const updateRoleDistribution = (distribution: RoleDistribution) => {
    setGameState(prev => ({
      ...prev,
      roleDistribution: distribution
    }));
  };

  const updateTurnTimer = (seconds: number) => {
    setGameState(prev => ({
      ...prev,
      turnTimer: seconds
    }));
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        addPlayer,
        removePlayer,
        startGame,
        setPhase,
        submitVote,
        closeVoting,
        submitMrWhiteGuess,
        submitDescription,
        timeoutSpeaker,
        resetGame,
        updateRoleDistribution,
        updateTurnTimer,
        checkGameEnd,
        continueAfterResults,
        rerollWords,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};