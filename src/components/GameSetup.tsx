import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Link, Hash, Plus, Minus, Timer } from "lucide-react";
import { toast } from "sonner";
import { PlayerList } from "./shared/PlayerList";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { distributionMeetsLimits } from "@/config/roleDistribution";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const TIMER_PRESETS = [10, 20, 30, 40];
const MIN_CUSTOM_SECONDS = 5;
const MAX_CUSTOM_SECONDS = 300;

export const GameSetup = () => {
  const { gameState, startGame, updateRoleDistribution, updateTurnTimer } = useGame();
  const { hostId, isHost } = usePeer();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const turnTimer = gameState.turnTimer ?? 0;
  const timerEnabled = turnTimer > 0;
  const [isCustomTimer, setIsCustomTimer] = useState(timerEnabled && !TIMER_PRESETS.includes(turnTimer));
  const [customSeconds, setCustomSeconds] = useState(timerEnabled ? String(turnTimer) : "");

  const handleTimerToggle = (enabled: boolean) => {
    setIsCustomTimer(false);
    updateTurnTimer(enabled ? 30 : 0);
  };

  const handleTimerPreset = (value: string) => {
    if (value === "custom") {
      setIsCustomTimer(true);
      setCustomSeconds(String(turnTimer));
      return;
    }
    setIsCustomTimer(false);
    updateTurnTimer(Number(value));
  };

  const handleCustomSeconds = (value: string) => {
    setCustomSeconds(value);
    const seconds = Math.floor(Number(value));
    if (seconds >= MIN_CUSTOM_SECONDS && seconds <= MAX_CUSTOM_SECONDS) {
      updateTurnTimer(seconds);
    }
  };

  const handleCopyLink = () => {
    if (hostId) {
      const gameLink = `${window.location.origin}${import.meta.env.BASE_URL}?gameId=${hostId}`;
      navigator.clipboard.writeText(gameLink);
      toast.success(t("gameSetup.copied"));
    }
  };

  const hasEnoughPlayers = gameState.players.length >= 4;
  const roleDistribution = gameState.roleDistribution;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">{t("gameSetup.title")}</h1>

      <div
        onClick={handleCopyLink}
        className="glass-morphism p-6 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2 text-white/90 text-lg mb-4">
          <Hash className="h-5 w-5" />
          <span>{t("gameSetup.shareLabel")}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 w-full">
            <code className="bg-white/5 px-4 py-2 rounded-lg text-[#1EAEDB] font-mono text-lg w-full text-center">{hostId}</code>
            <Link className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-2 gap-6'}`}>
        <PlayerList
          players={gameState.players}
          showScores={gameState.players.some(p => p.score > 0)}
        />

        <div className="space-y-6">
          <Card className="p-6 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-6">{t("gameSetup.roleDistribution")}</h3>
            <div className="space-y-6">
              <div className="text-center text-white/70">
                {gameState.players.length - roleDistribution.mrWhites - roleDistribution.undercovers} {t("gameSetup.civilians")}
              </div>
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoleDistribution({ ...roleDistribution, undercovers: roleDistribution.undercovers - 1 })}
                  disabled={!isHost || !distributionMeetsLimits(
                    {
                      ...roleDistribution,
                      undercovers: roleDistribution.undercovers - 1
                    },
                    gameState.players.length)
                  }
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center text-white">
                  {roleDistribution.undercovers} {t("gameSetup.undercovers")}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoleDistribution({ ...roleDistribution, undercovers: roleDistribution.undercovers + 1 })}
                  disabled={!isHost || !distributionMeetsLimits(
                    {
                      ...roleDistribution,
                      undercovers: roleDistribution.undercovers + 1
                    },
                    gameState.players.length)
                  }
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoleDistribution({ ...roleDistribution, mrWhites: roleDistribution.mrWhites - 1 })}
                  disabled={!isHost || !distributionMeetsLimits(
                    {
                      ...roleDistribution,
                      mrWhites: roleDistribution.mrWhites - 1
                    },
                    gameState.players.length)
                  }
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center text-white">
                  {roleDistribution.mrWhites} {t("gameSetup.mrWhites")}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateRoleDistribution({ ...roleDistribution, mrWhites: roleDistribution.mrWhites + 1 })}
                  disabled={!isHost || !distributionMeetsLimits(
                    {
                      ...roleDistribution,
                      mrWhites: roleDistribution.mrWhites + 1
                    },
                    gameState.players.length)
                  }
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Timer className="h-5 w-5" />
                {t("gameSetup.turnTimer")}
              </h3>
              <Switch
                checked={timerEnabled}
                onCheckedChange={handleTimerToggle}
                disabled={!isHost}
              />
            </div>
            {timerEnabled ? (
              isHost ? (
                <div className="space-y-3">
                  <Select
                    value={isCustomTimer ? "custom" : String(turnTimer)}
                    onValueChange={handleTimerPreset}
                  >
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMER_PRESETS.map(seconds => (
                        <SelectItem key={seconds} value={String(seconds)}>
                          {t("gameSetup.seconds", { count: seconds })}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">{t("gameSetup.customTimer")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomTimer && (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        min={MIN_CUSTOM_SECONDS}
                        max={MAX_CUSTOM_SECONDS}
                        value={customSeconds}
                        onChange={(e) => handleCustomSeconds(e.target.value)}
                        placeholder={t("gameSetup.customSecondsPlaceholder")}
                        className="bg-white/10 border-white/10 text-white"
                      />
                      <p className="text-xs text-white/50">
                        {t("gameSetup.customSecondsHint", { min: MIN_CUSTOM_SECONDS, max: MAX_CUSTOM_SECONDS })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">{t("gameSetup.seconds", { count: turnTimer })}</div>
              )
            ) : (
              <div className="text-center text-white/70">{t("gameSetup.noTimer")}</div>
            )}
          </Card>

          <div className="space-y-2">
            {!hasEnoughPlayers && (
              <div className="text-red-500 text-sm text-center mb-2">
                {t("gameSetup.atLeastFourPlayers")}
              </div>
            )}
            <Button
              onClick={startGame}
              size="lg"
              disabled={!isHost || !hasEnoughPlayers}
              className="w-full bg-primary hover:bg-primary/90 text-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {t("gameSetup.startGame", { count: gameState.players.length })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
