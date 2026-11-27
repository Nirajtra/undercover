import { GameProvider } from "../context/GameContext";
import { PeerProvider } from "../context/PeerContext";
import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { GameSetup } from "../components/GameSetup";
import { GameLobby } from "../components/GameLobby";
import { WordReveal } from "../components/WordReveal";
import { MultiplayerSetup } from "../components/MultiplayerSetup";
import { VotingScreen } from "../components/VotingScreen";
import { Results } from "../components/Results";
import { GameEnd } from "../components/GameEnd";
import { Button } from "@/components/ui/button";
import { Github, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { buildScreenPreview, PREVIEW_SCREENS, PreviewScreen } from "@/dev/previewState";
import { useTranslation } from "react-i18next";
import { showEliminationToast } from "@/lib/eliminationToast";
import { SoundProvider, useSound } from "@/context/SoundContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
const MuteToggle = () => {
  const { isMuted, toggleMute } = useSound();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMute}
      aria-label={isMuted ? "Unmute" : "Mute"}
      className="h-9 w-9 rounded-full border border-white/10 bg-black/30 text-white hover:bg-white/10"
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
};

// Dev-only screen preview with a sample game: ?preview=voting or ?preview=discussion
const previewParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
const previewScreen = PREVIEW_SCREENS.find(s => s === previewParam);

const ScreenPreview = ({ screen }: { screen: PreviewScreen }) => {
  const { setGameState } = useGame();
  const { peer, hostGame } = usePeer();
  const [ready, setReady] = useState(false);

  // Wait for our peer ID so the sample game can include "you"
  useEffect(() => {
    if (!peer) return;
    // Setup is only interesting as the host (editable roles/timer, game ID shown)
    if (screen === "setup") hostGame("Priya");
    const rounds = Number(new URLSearchParams(window.location.search).get("rounds")) || 2;
    setGameState(buildScreenPreview(peer.id, screen, rounds));
    setReady(true);
  }, [peer]);

  return ready ? <PhaseScreen /> : <div className="text-center text-white/70">Loading preview…</div>;
};

const GameContent = () => {
  const { hostId } = usePeer();

  if (previewScreen) {
    return <ScreenPreview screen={previewScreen} />;
  }

  if (!hostId) {
    return <MultiplayerSetup />;
  }

  return <PhaseScreen />;
};

const PhaseScreen = () => {
  const { gameState } = useGame();

  if (gameState.phase === "setup" && gameState.currentRound === 0) {
    return <GameSetup />;
  }

  if (gameState.phase === "setup" && gameState.currentRound >= 1) {
    return <GameLobby />;
  }

  switch (gameState.phase) {
    case "wordReveal":
      return <WordReveal />;
    case "voting":
      return <VotingScreen />;
    case "results":
      return <Results />;
    case "gameEnd":
      return <GameEnd />;
    default:
      return <GameLobby />;
  }
};

let toastPreviewShown = false;

const Index = () => {
  const { t } = useTranslation();

  // Dev-only: open http://localhost:8080/?previewToasts to see all three elimination toasts
  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(window.location.search).has("previewToasts")) return;
    if (toastPreviewShown) return; // StrictMode runs effects twice in dev
    toastPreviewShown = true;
    showEliminationToast(t, "Alex", "civilian");
    showEliminationToast(t, "Sam", "undercover");
    showEliminationToast(t, "Jo", "mrwhite");
  }, []);

  return (
    <div className="min-h-screen text-white">
      <div className="w-full px-4 py-3">
        <SoundProvider>
          <GameProvider>
            <PeerProvider>
              {/* Full width here; each screen sets its own max width (the discussion table can use it all) */}
              <div className="w-full space-y-4">
                <div className="mx-auto flex w-full max-w-4xl justify-end gap-2">
                  <MuteToggle />
                  <LanguageSwitcher />
                </div>
                <GameContent />
              </div>
            </PeerProvider>
          </GameProvider>
        </SoundProvider>
      </div>
      <a
        href="https://github.com/antebrl/undercover-word-game"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 md:bottom-8 md:left-8"
      >
        <Button
          variant="secondary"
          className="glass-morphism hover:bg-white/10 transition-all duration-300"
        >
          <Github className="mr-2 h-4 w-4" />
          View on GitHub
        </Button>
      </a>
    </div>
  );
};

export default Index;