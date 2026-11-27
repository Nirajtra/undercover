import { useState, useEffect } from "react";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, UserPlus, Copy, Link } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const MultiplayerSetup = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { peer, hostGame, joinGame, hostId, isConnecting } = usePeer();
  // Not ready until the peer server handed us an ID; busy while a join is in flight
  const isBusy = !peer || isConnecting;
  const [showJoinForm, setShowJoinForm] = useState(searchParams.get("gameId") != undefined);
  const [showHostForm, setShowHostForm] = useState(false);
  const [joinId, setJoinId] = useState(showJoinForm ? searchParams.get("gameId") : "");
  // Remember the name between games (per browser)
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem("username") ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("username", username);
    } catch {
      // storage unavailable — the name just isn't remembered
    }
  }, [username]);

  useEffect(() => {
    const gameId = searchParams.get("gameId");
    if (gameId) {
      setJoinId(gameId);
      setShowJoinForm(true);
    }  
  }, [searchParams]);

  const handleJoin = () => {
    if (isBusy) return;
    if (!joinId.trim()) {
      toast.error(t("multiplayerSetup.enterGameIdError"));
      return;
    }
    if (!username.trim()) {
      toast.error(t("multiplayerSetup.enterUsernameError"));
      return;
    }
    joinGame(joinId.trim(), username.trim());
  };

  const handleHost = () => {
    if (isBusy) return;
    if (!username.trim()) {
      toast.error(t("multiplayerSetup.enterUsernameError"));
      return;
    }
    hostGame(username.trim());
  };

  return (
    <Card className="max-w-md mx-auto p-6 space-y-6 glass-morphism hud-corners">
      <div className="space-y-4">
        {!showHostForm && !showJoinForm && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowHostForm(true)}
              className="w-full font-semibold animate-glow-pulse"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t("multiplayerSetup.hostNewGame")}
            </Button>

            <div className="relative flex items-center">
              <span className="flex-grow border-t border-white/10"></span>
              <span className="px-4 text-xs uppercase text-muted-foreground">
                {t("multiplayerSetup.joinExistingGame")}
              </span>
              <span className="flex-grow border-t border-white/10"></span>
            </div>
            
            <Button
              onClick={() => setShowJoinForm(true)}
              variant="secondary"
              className="w-full font-semibold"
            >
              <Users className="mr-2 h-4 w-4" />
              {t("multiplayerSetup.joinGame")}
            </Button>
          </div>
        )}

        {showHostForm && (
          <form
            className="space-y-4 animate-fade-in"
            onSubmit={(e) => { e.preventDefault(); handleHost(); }}
          >
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("multiplayerSetup.enterUsername")}
              maxLength={25}
              autoFocus
              className="w-full bg-secondary/20 border-secondary/30"
            />
            <Button
              type="submit"
              disabled={isBusy}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isBusy ? t("multiplayerSetup.connecting") : t("multiplayerSetup.startHosting")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowHostForm(false)}
              className="w-full"
            >
              {t("multiplayerSetup.back")}
            </Button>
          </form>
        )}

        {showJoinForm && (
          <form
            className="space-y-4 animate-fade-in"
            onSubmit={(e) => { e.preventDefault(); handleJoin(); }}
          >
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("multiplayerSetup.enterUsername")}
              maxLength={25}
              autoFocus
              className="w-full bg-secondary/20 border-secondary/30"
            />
            <Input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder={t("multiplayerSetup.enterGameId")}
              className="w-full bg-secondary/20 border-secondary/30"
            />
            <Button
              type="submit"
              disabled={isBusy}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isBusy ? t("multiplayerSetup.connecting") : t("multiplayerSetup.joinGame")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowJoinForm(false)}
              className="w-full"
            >
              {t("multiplayerSetup.back")}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};