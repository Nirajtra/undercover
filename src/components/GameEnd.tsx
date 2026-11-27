import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, User } from "lucide-react";
import { useSound } from "@/context/SoundContext";
import { useEffect } from "react";
import { MrWhiteGuess } from "./shared/MrWhiteGuess";
import { useTranslation } from "react-i18next";
import { RoleBadge } from "./shared/RoleBadge";
import { roleColor } from "@/lib/roleColors";
import { Player } from "@/types/game";

export const GameEnd = () => {
  const { gameState, resetGame } = useGame();
  const { peer, isHost } = usePeer();
  const { playSound } = useSound();
  const { t } = useTranslation();

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);

  // Points are awarded by the game logic the moment the game ends; this screen only celebrates
  useEffect(() => {
    switch (gameState.winner) {
      case "civilian":
        playSound("/sounds/civilians-win.mp3");
        break;
      case "infiltrators":
      case "undercover":
        playSound("/sounds/undercover-win.mp3");
        break;
      case "mrwhite":
        playSound("/sounds/mrwhite-win.mp3");
        break;
    }
  }, []);

  const isWinner = (player?: Player) => {
    if (!player?.role) return false;
    if (gameState.winner === "infiltrators") return player.role === "undercover" || player.role === "mrwhite";
    return player.role === gameState.winner;
  };

  const winnerColor = roleColor(gameState.winner === "infiltrators" ? "mrwhite" : gameState.winner);
  // Everyone who played this game (not spectators), winners first
  const players = gameState.players
    .filter(p => p.role && p.role !== "spectator")
    .sort((a, b) => Number(isWinner(b)) - Number(isWinner(a)));
  const scoreboard = [...gameState.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        {isWinner(currentPlayer) ? (
          <Trophy className="w-16 h-16 text-neon-amber mx-auto animate-float drop-shadow-[0_0_18px_rgba(255,197,61,0.7)]" />
        ) : (
          <User className="w-16 h-16 text-white/40 mx-auto" />
        )}
        <h1 className="text-4xl font-bold text-gradient text-center">{t("gameEnd.title")}</h1>
        {currentPlayer?.role && currentPlayer.role !== "spectator" && (
          <p className="text-lg font-semibold text-white/80">
            {isWinner(currentPlayer) ? t("gameEnd.youWon") : t("gameEnd.youLost")}
          </p>
        )}
      </div>

      <MrWhiteGuess />

      <Card className="p-6 glass-morphism hud-corners">
        <div className="space-y-4">
          {/* Winner line glows in the winning side's color */}
          <h2
            className="text-2xl font-bold text-center"
            style={{ color: winnerColor.hex, textShadow: `0 0 16px rgba(${winnerColor.rgb}, 0.6)` }}
          >
            {gameState.winner === "civilian" && t("gameEnd.civilianWin")}
            {gameState.winner === "undercover" && t("gameEnd.undercoverWin")}
            {gameState.winner === "mrwhite" && t("gameEnd.mrWhiteWin")}
            {gameState.winner === "infiltrators" && t("gameEnd.infiltratorsWin")}
          </h2>

          {/* The two secret words, finally revealed */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-lg border border-neon-civilian/30 bg-neon-civilian/5 p-2">
              <div className="text-white/50">{t("gameEnd.civilianWord")}</div>
              <div className="text-lg font-bold text-neon-civilian">{gameState.majorityWord}</div>
            </div>
            <div className="rounded-lg border border-white/30 bg-white/5 p-2">
              <div className="text-white/50">{t("gameEnd.undercoverWord")}</div>
              <div className="text-lg font-bold text-neon-undercover">{gameState.undercoverWord}</div>
            </div>
          </div>

          {/* Everyone's role and word; winners first */}
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-lg p-3 ${isWinner(player) ? "bg-white/[0.07]" : "bg-white/[0.02] opacity-70"}`}
              >
                {isWinner(player) ? (
                  <Trophy className="h-5 w-5 shrink-0 text-neon-amber" />
                ) : (
                  <User className="h-5 w-5 shrink-0" style={{ color: roleColor(player.role).hex }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg text-white">
                    {player.name}
                    {player.id === peer?.id && <span className="ml-2 text-sm text-neon-cyan/80">{t("common.you")}</span>}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <RoleBadge role={player.role} />
                    {player.word && `${t("gameEnd.word")} ${player.word}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Points across all games in this session */}
      <Card className="p-4 glass-morphism">
        <h3 className="mb-3 font-semibold text-white">{t("gameEnd.scoreboard")}</h3>
        <ol className="space-y-1.5">
          {scoreboard.map((player, i) => (
            <li key={player.id} className="flex items-center gap-3 rounded-md bg-white/[0.04] px-3 py-1.5 text-sm">
              <span className={`w-5 text-center font-bold ${i === 0 ? "text-neon-amber" : "text-white/40"}`}>{i + 1}</span>
              <span className="flex-1 truncate text-white">{player.name}</span>
              <span className="font-bold text-white">{player.score ?? 0}</span>
              <span className="text-white/50">{t("playerList.points")}</span>
            </li>
          ))}
        </ol>
      </Card>

      {isHost ? (
        <Button
          onClick={resetGame}
          size="lg"
          className="w-full text-lg font-semibold animate-glow-pulse"
        >
          {t("gameEnd.startNewRound")}
        </Button>
      ) : (
        <p className="text-center text-sm text-white/60 animate-pulse">{t("gameEnd.waitingForHost")}</p>
      )}
    </div>
  );
};
