import { GameState, Player, PlayerRole, RoundRecord } from "@/types/game";
import { calculateDefaultDistribution } from "@/config/roleDistribution";

// Dev-only sample game for previewing screens without real players:
//   http://localhost:8080/?preview=voting  or  ?preview=discussion
//   add &rounds=4 to start in a later round (more columns in the comments table)

const PLAYERS: { name: string; role: PlayerRole }[] = [
  { name: "Priya", role: "civilian" }, // "you"
  { name: "Alex", role: "civilian" },
  { name: "Sam", role: "undercover" },
  { name: "Jo", role: "mrwhite" },
  { name: "Mia", role: "civilian" },
  { name: "Ravi", role: "civilian" },
  { name: "Lena", role: "civilian" },
  { name: "Omar", role: "undercover" },
];

// Comments per round (cycled if more rounds are asked for)
const COMMENTS = [
  ["bitter", "morning", "leaves", "hot drink", "beans", "cafe", "aroma", "kettle"],
  ["caffeine", "espresso", "green", "mug", "latte", "barista", "roast", "biscuit"],
  ["grinder", "black", "herbal", "steam", "cappuccino", "filter", "brew", "infusion"],
  ["mocha", "americano", "chai", "spoon", "foam", "decaf", "crema", "teapot"],
  ["arabica", "cold brew", "matcha", "warm", "frappe", "drip", "robusta", "earl grey"],
];

// Who gets voted out after each earlier round (index into PLAYERS)
const ELIMINATION_ORDER = [5, 7, 6, 4];

export type PreviewScreen = "setup" | "discussion" | "voting" | "results" | "guess" | "end";
export const PREVIEW_SCREENS: PreviewScreen[] = ["setup", "discussion", "voting", "results", "guess", "end"];

// Every screen is built from the voting state, then adjusted
export const buildScreenPreview = (myId: string, screen: PreviewScreen, rounds = 2): GameState => {
  if (screen === "discussion") return buildPreviewState(myId, "discussion", rounds);

  const state = buildPreviewState(myId, "voting", rounds);
  const alive = state.players.filter(p => !p.isEliminated);
  const voteAll = (targetId: string) =>
    Object.fromEntries(alive.filter(p => p.id !== targetId).map(p => [p.id, targetId]));

  switch (screen) {
    case "setup":
      // Lobby before the first game: no roles, words or history yet
      return {
        ...state,
        phase: "setup",
        currentRound: 0,
        players: state.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
        speakingOrder: undefined,
        votingResults: undefined,
        history: [],
        lastEliminatedId: undefined,
      };
    case "results": {
      // Everyone voted out Sam, the undercover
      const sam = alive.find(p => p.role === "undercover")!;
      return { ...state, phase: "results", votingResults: voteAll(sam.id), lastEliminatedId: sam.id };
    }
    case "guess": {
      // You are Mr. White and just got voted out: make your final guess
      const players = state.players.map(p =>
        p.id === myId ? { ...p, role: "mrwhite" as const, word: "" }
          : p.role === "mrwhite" ? { ...p, role: "civilian" as const, word: "Coffee" }
            : p
      );
      return { ...state, players, phase: "results", votingResults: voteAll(myId), lastEliminatedId: myId };
    }
    case "end":
      return { ...state, phase: "gameEnd", winner: "civilian" };
    default:
      return state;
  }
};

export const buildPreviewState = (myId: string, phase: "voting" | "discussion", rounds = 2): GameState => {
  const currentRound = Math.max(1, Math.min(rounds, ELIMINATION_ORDER.length + 1));
  const ids = PLAYERS.map((_, i) => (i === 0 ? myId : `p-${PLAYERS[i].name.toLowerCase()}`));
  const eliminatedBefore = (round: number) => ELIMINATION_ORDER.slice(0, round - 1).map(i => ids[i]);
  const commentFor = (round: number, playerIndex: number) =>
    COMMENTS[(round - 1) % COMMENTS.length][playerIndex] + (round > COMMENTS.length ? ` ${round}` : "");

  const aliveNow = ids.filter(id => !eliminatedBefore(currentRound).includes(id));
  // Voting: everyone has commented. Discussion: the first two speakers have, the third is up.
  const commentedNow = phase === "voting" ? aliveNow : aliveNow.slice(0, 2);

  const players: Player[] = PLAYERS.map((p, i) => ({
    id: ids[i],
    name: p.name,
    role: p.role,
    word: p.role === "mrwhite" ? "" : p.role === "undercover" ? "Tea" : "Coffee",
    score: i % 4,
    isEliminated: eliminatedBefore(currentRound).includes(ids[i]),
    submittedDescription: commentedNow.includes(ids[i]) ? commentFor(currentRound, i) : undefined,
  }));

  const history: RoundRecord[] = [];
  for (let round = 1; round <= currentRound; round++) {
    const alive = ids.filter(id => !eliminatedBefore(round).includes(id));
    history.push({
      game: 1,
      round,
      majorityWord: "Coffee",
      undercoverWord: "Tea",
      eliminatedId: round < currentRound ? ids[ELIMINATION_ORDER[round - 1]] : undefined,
      entries: alive.map(id => {
        const i = ids.indexOf(id);
        const text = round < currentRound || commentedNow.includes(id) ? commentFor(round, i) : undefined;
        return { playerId: id, name: PLAYERS[i].name, role: PLAYERS[i].role, text };
      }),
    });
  }

  return {
    players,
    phase: phase === "voting" ? "voting" : "wordReveal",
    currentRound,
    gameNumber: 1,
    majorityWord: "Coffee",
    undercoverWord: "Tea",
    speakingOrder: aliveNow,
    turnTimer: 30,
    lastEliminatedId: currentRound > 1 ? ids[ELIMINATION_ORDER[currentRound - 2]] : undefined,
    roleDistribution: calculateDefaultDistribution(players.length),
    // Two votes already in, so the "still to vote" panel has something to show
    votingResults: phase === "voting" ? { [aliveNow[1]]: aliveNow[2], [aliveNow[3]]: aliveNow[2] } : {},
    history,
  };
};
