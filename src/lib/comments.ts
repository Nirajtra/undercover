import { GameState } from "@/types/game";

export const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

/** True if the comment contains the player's own secret word (as a whole word, any case). */
export const containsSecretWord = (text: string, word?: string) => {
  if (!word?.trim()) return false;
  const escaped = normalize(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(normalize(text));
};

/**
 * True if `text` was already revealed as a comment in the current game — in an earlier
 * round or this one. Comments written early but not yet revealed don't count: whoever
 * reveals a comment first gets it.
 */
export const isDuplicateComment = (state: GameState, text: string) => {
  const target = normalize(text);
  const game = state.gameNumber ?? 1;

  const earlierRounds = (state.history ?? [])
    .filter(r => r.game === game)
    .flatMap(r => r.entries.map(e => e.text));
  const thisRound = state.players.map(p => p.submittedDescription);

  return [...earlierRounds, ...thisRound].some(used => used && normalize(used) === target);
};
