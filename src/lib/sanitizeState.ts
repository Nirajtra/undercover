import { GameState } from "@/types/game";

/**
 * The game state the host sends to one player: only what that player may know, so nobody can
 * read roles or secret words from the browser's dev tools.
 * - Their own role/word, and roles/words of players already voted out (those are public).
 * - The player being voted out right now (results screen) — their role is revealed there.
 * - Everything once the game is over.
 * - Other players' early comments are never sent.
 */
export const sanitizeStateFor = (state: GameState, recipientId: string): GameState => {
  const gameOver = state.phase === "gameEnd";
  const currentGame = state.gameNumber ?? 1;
  const isPublic = (playerId: string) => {
    if (gameOver || playerId === recipientId) return true;
    if (state.phase === "results" && playerId === state.lastEliminatedId) return true;
    return !!state.players.find(p => p.id === playerId)?.isEliminated;
  };

  return {
    ...state,
    // Both secret words stay hidden until the game is over
    majorityWord: gameOver ? state.majorityWord : "",
    undercoverWord: gameOver ? state.undercoverWord : "",
    players: state.players.map(p => {
      const visible = isPublic(p.id);
      return {
        ...p,
        role: visible || p.role === "spectator" ? p.role : undefined,
        word: visible ? p.word : undefined,
        pendingDescription: p.id === recipientId ? p.pendingDescription : undefined,
        pendingRejected: p.id === recipientId ? p.pendingRejected : undefined,
      };
    }),
    history: state.history?.map(r => {
      if (r.game !== currentGame || gameOver) return r; // earlier games are over: nothing to hide
      return {
        ...r,
        majorityWord: "",
        undercoverWord: "",
        entries: r.entries.map(e => (isPublic(e.playerId) ? e : { ...e, role: undefined })),
      };
    }),
  };
};
