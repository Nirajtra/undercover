import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { useGame } from "@/context/GameContext";
import { RoundRecord } from "@/types/game";
import { RoundTable } from "./RoundTable";

export const CommentHistory = () => {
  const { gameState } = useGame();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const history = gameState.history ?? [];
  if (history.length === 0) return null;

  // Group rounds by game, newest game first
  const games = new Map<number, RoundRecord[]>();
  history.forEach(r => games.set(r.game, [...(games.get(r.game) ?? []), r]));
  const gameNumbers = [...games.keys()].sort((a, b) => b - a);

  // Roles and words of the game in progress stay hidden until it ends
  const isOngoing = (game: number) =>
    game === gameState.gameNumber && gameState.currentRound > 0 && gameState.phase !== "gameEnd";

  return (
    <Card className="glass-morphism">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-white/90"
      >
        <span className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4" />
          {t("history.title")}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-6 px-4 pb-4">
          {gameNumbers.map(game => {
            const rounds = games.get(game)!.sort((a, b) => a.round - b.round);
            const revealed = !isOngoing(game);

            return (
              <div key={game} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">
                    {t("history.game", { number: game })}
                    {!revealed && <span className="ml-2 text-white/50">{t("history.inProgress")}</span>}
                  </span>
                  {revealed && (
                    <span className="text-white/60">
                      {t("history.words", { majority: rounds[0].majorityWord, undercover: rounds[0].undercoverWord })}
                    </span>
                  )}
                </div>

                <RoundTable rounds={rounds} showRoles={revealed} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
