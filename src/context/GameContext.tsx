import React, { createContext, useContext, useState } from "react";
import { GameState, Player, GamePhase, PlayerRole, RoleDistribution, RoundRecord } from "../types/game";
import { toast } from "sonner";
import { calculateDefaultDistribution } from "../config/roleDistribution";
import { useTranslation } from "react-i18next";
import { shuffle } from "@/lib/utils";

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
  resetGame: () => void;
  updateRoleDistribution: (distribution: RoleDistribution) => void;
  updateTurnTimer: (seconds: number) => void;
  checkGameEnd: (players: Player[]) => string | null;
  eliminatePlayer: (eliminatedId: string) => void;
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

      const newPlayers = prev.players.filter(p => p.id !== id);
      const newSpeakingOrder = prev.speakingOrder?.filter(s => s !== id);

      if (prev.phase !== "setup") {
        const gameEnd = checkGameEnd(newPlayers);
        if (gameEnd) {
          return {
            ...prev,
            phase: "gameEnd",
            winner: gameEnd,
            players: newPlayers,
            speakingOrder: newSpeakingOrder,
          };
        }
      }

      return {
        ...prev,
        players: newPlayers,
        speakingOrder: newSpeakingOrder,
      };
    });
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

  const submitDescription = (playerId: string, submittedDescription: string) => {
    setGameState((prev) => {
      // Ignore late submissions (e.g. after the turn timer already skipped this player)
      if (prev.players.find(p => p.id === playerId)?.submittedDescription) return prev;

      const updatedPlayers = prev.players.map(p =>
        p.id === playerId ? { ...p, submittedDescription } : p
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

  const eliminatePlayer = (eliminatedId: string) => {
    setGameState((prev) => {
      const updatedPlayers = prev.players.map(p =>
        p.id === eliminatedId ? { ...p, isEliminated: true, submittedDescription: undefined } : { ...p, submittedDescription: undefined }
      );

      return {
        ...prev,
        players: updatedPlayers,
        phase: "results",
        lastEliminatedId: eliminatedId,
      };
    });
  };

  const submitMrWhiteGuess = (guess: string) => {
    setGameState((prev) => {
      // Ignore a late guess arriving after the timer already ended the guess
      if (prev.mrWhiteGuess) return prev;

      if (guess.toLowerCase() === prev.majorityWord.toLowerCase()) {
        return {
          ...prev,
          phase: "gameEnd",
          winner: "mrwhite",
          mrWhiteGuess: guess
        };
      } else {
        const gameWinner = checkGameEnd(prev.players);
        return {
          ...prev,
          phase: gameWinner ? "gameEnd" : "results",
          winner: gameWinner || undefined,
          mrWhiteGuess: guess
        };
      }
    });
  };

  const resetGame = () => {
    setGameState((prev) => {
      const players = prev.players.map(p => ({ ...p, isEliminated: false, submittedDescription: undefined }));
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
        resetGame,
        updateRoleDistribution,
        updateTurnTimer,
        checkGameEnd,
        eliminatePlayer,
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