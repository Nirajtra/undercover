import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { PlayerList } from "./shared/PlayerList";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export const GameLobby = () => {
  const { gameState, startGame } = useGame();
  const { isHost } = usePeer();
  const { t } = useTranslation();

  const handleStartNextRound = () => {
    startGame();
  };

  // The next round starts right away
  useEffect(() => {
    if (isHost) handleStartNextRound();
  }, [isHost]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 animate-fade-in">
      <PlayerList
        players={gameState.players}
        showEliminated={true}
        lastEliminatedId={gameState.lastEliminatedId}
      />

      {isHost && (
        <Button
          onClick={handleStartNextRound}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-lg font-medium transition-colors duration-200"
        >
          {t("gameLobby.startNextRound", { count: gameState.players.filter(player => !player.isEliminated).length })}
        </Button>
      )}
    </div>
  );
};
