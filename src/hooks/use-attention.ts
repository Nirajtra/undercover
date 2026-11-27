import { useEffect } from "react";

const BASE_TITLE = "Team Notes";

/**
 * While `active`, the browser tab reads "(1) Team Notes" — like an unread message — so a player in
 * another tab notices it's their move without the page giving away that it's a game.
 */
export const useAttention = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    document.title = `(1) ${BASE_TITLE}`;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [active]);
};
