import { useGame } from "@/context/GameContext";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const MrWhiteGuess = () => {
    const { gameState } = useGame();
  const { t } = useTranslation();

    if (!gameState.mrWhiteGuess) return null;

    // Decided by the host (players don't receive the secret word until the game is over)
    const isCorrect = !!gameState.mrWhiteGuessCorrect;
    return (
      <div className={`mt-4 p-4 rounded-lg border ${isCorrect ? 'bg-neon-mrwhite/10 border-neon-mrwhite/40' : 'bg-neon-civilian/10 border-neon-civilian/40'}`}>
        <div className="flex items-center gap-2">
          {/* A correct guess is a win for Mr. White (red); a wrong one is good news for civilians (green) */}
          {isCorrect ? (
            <CheckCircle className="text-neon-mrwhite" />
          ) : (
            <XCircle className="text-neon-civilian" />
          )}
          <p className="text-white">
            {t("gameEnd.mrWhiteGuessed")} <span className="font-bold">{gameState.mrWhiteGuess}</span>
          </p>
        </div>
      </div>
    );
};