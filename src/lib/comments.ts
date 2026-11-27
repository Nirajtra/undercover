import { GameState } from "@/types/game";

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * True if `text` was already used as a comment in the current game — in an earlier
 * round, or this round (revealed or written early). The player's own early comment
 * doesn't count, since submitting again replaces it.
 */
export const isDuplicateComment = (state: GameState, playerId: string, text: string) => {
  const target = normalize(text);
  const game = state.gameNumber ?? 1;

  const earlierRounds = (state.history ?? [])
    .filter(r => r.game === game)
    .flatMap(r => r.entries.map(e => e.text));
  const thisRound = state.players.flatMap(p => [
    p.submittedDescription,
    p.id === playerId ? undefined : p.pendingDescription,
  ]);

  return [...earlierRounds, ...thisRound].some(used => used && normalize(used) === target);
};
