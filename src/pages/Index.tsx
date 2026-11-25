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
import { Volume2, VolumeX } from "lucide-react";
import { SoundProvider, useSound } from "@/context/SoundContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CommentHistory } from "@/components/shared/CommentHistory";

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

const GameContent = () => {
  const { hostId } = usePeer();

  if (!hostId) {
    return <MultiplayerSetup />;
  }

  return (
    <>
      <PhaseScreen />
      <div className="mx-auto w-full max-w-3xl px-6">
        <CommentHistory />
      </div>
    </>
  );
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

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-secondary to-accent text-white">
      <div className="container mx-auto px-4 py-3">
        <SoundProvider>
          <GameProvider>
            <PeerProvider>
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                <div className="flex justify-end gap-2">
                  <MuteToggle />
                  <LanguageSwitcher />
                </div>
                <GameContent />
              </div>
            </PeerProvider>
          </GameProvider>
        </SoundProvider>
      </div>
    </div>
  );
};

export default Index;