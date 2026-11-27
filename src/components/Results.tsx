import { useGame } from "../context/GameContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePeer } from "@/context/PeerContext";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useSound } from "@/context/SoundContext";
import { MrWhiteGuess } from "./shared/MrWhiteGuess";
import { PlayerList } from "./shared/PlayerList";
import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/use-countdown";
import { CountdownBar } from "./shared/CountdownBar";
import { showEliminationToast } from "@/lib/eliminationToast";
import { RoleBadge } from "./shared/RoleBadge";

export const Results = () => {
  const { gameState, submitMrWhiteGuess, continueAfterResults } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const [guess, setGuess] = useState("");
  const [tieBreakerPlayers, setTieBreakerPlayers] = useState<string[]>([]);
  const [showEliminatedCard, setShowEliminatedCard] = useState(false);
  const { t } = useTranslation();

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);
  const eliminatedPlayer = gameState.players
    .find(p => p.id === gameState.lastEliminatedId);

  const playEliminationSound = () => {
    if (gameState.mrWhiteGuess) {
      return playSound("/sounds/mrwhite-wrong-guess.mp3");
    }

    switch (eliminatedPlayer?.role) {
      case "mrwhite":
        playSound("/sounds/mrwhite-eliminated.mp3");
        break;
      case "undercover":
        playSound("/sounds/undercover-eliminated.mp3");
        break;
      case "civilian":
        playSound("/sounds/civilian-eliminated.mp3");
        break;
    }
  };

  useEffect(() => {
    if (gameState.lastEliminatedId && gameState.votingResults) {
      // Count votes for each player to determine if there was a tie
      const voteCount: Record<string, number> = {};
      Object.values(gameState.votingResults).forEach(targetId => {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(voteCount));
      const mostVotedPlayers = Object.entries(voteCount)
        .filter(([_, votes]) => votes === maxVotes)
        .map(([id]) => id);

      setTieBreakerPlayers(mostVotedPlayers);

      if (mostVotedPlayers.length > 1) {
        // Let the tie-breaker animation play first
        const timeout = setTimeout(() => {
          setShowEliminatedCard(true);
          playEliminationSound();
        }, 7000);
        return () => clearTimeout(timeout);
      } else {
        setShowEliminatedCard(true);
        playEliminationSound();
      }
    }
  }, [gameState.lastEliminatedId, gameState.votingResults]);

  const currentPlayerGotEliminated = eliminatedPlayer?.id === currentPlayer?.id;
  const isMrWhiteGuessing = eliminatedPlayer?.role === "mrwhite" && !gameState.mrWhiteGuess;

  // Mr. White gets double the turn timer for the final guess
  const guessTimer = (gameState.turnTimer ?? 0) * 2;
  const guessTimerKey = showEliminatedCard && isMrWhiteGuessing ? gameState.lastEliminatedId : undefined;
  const guessTimeLeft = useCountdown(guessTimer, guessTimerKey);

  // When time runs out, Mr. White submits whatever they typed
  useEffect(() => {
    if (guessTimeLeft === 0 && currentPlayerGotEliminated && guess.trim()) {
      handleGuessSubmit();
    }
  }, [guessTimeLeft]);

  // The host ends the guess if nothing arrived shortly after the timer ended
  useEffect(() => {
    if (!isHost || !guessTimer || !guessTimerKey) return;
    const timeout = setTimeout(() => {
      submitMrWhiteGuess(t("results.timeUpNoGuess"));
    }, guessTimer * 1000 + 1500);
    return () => clearTimeout(timeout);
  }, [isHost, guessTimer, guessTimerKey]);

  // Sort players by speaking order (and filter out eliminated players)
  const activePlayers = gameState.speakingOrder
    .map(id => gameState.players.find(p => p.id === id));

  const handleGuessSubmit = () => {
    if (!guess.trim()) {
      toast.error(t("results.guessRequired"));
      return;
    }

    if (isHost) {
      submitMrWhiteGuess(guess.trim());
    } else {
      // Send guess to host
      sendToHost({
        type: "MR_WHITE_GUESS",
        guess: guess.trim()
      });
    }
  };

  // Once the result is known (and Mr. White has guessed, if needed) move on right away.
  // A toast keeps the elimination visible since this screen is skipped past.
  const readyToContinue = showEliminatedCard && !isMrWhiteGuessing;
  useEffect(() => {
    if (!readyToContinue || !eliminatedPlayer) return;
    showEliminationToast(t, eliminatedPlayer.name, eliminatedPlayer.role);
    if (isHost) continueAfterResults();
  }, [readyToContinue]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-4 text-gradient">
        {t("results.title")}
      </h2>

      {showEliminatedCard && eliminatedPlayer && (
        <Card className="p-6 text-center glass-morphism hud-corners">
          <h3 className="text-xl font-bold mb-4 text-white">
            {currentPlayerGotEliminated
              ? t("results.eliminatedYou")
              : t("results.eliminatedPlayer", { name: eliminatedPlayer.name })}
          </h3>
          <p className="text-lg mb-2 text-white">
            {t(
              currentPlayerGotEliminated
                ? "results.youWereA"
                : "results.theyWereA",
            )}{" "}
            <RoleBadge role={eliminatedPlayer.role} />
          </p>
          {eliminatedPlayer.role !== "mrwhite" &&
            currentPlayer?.isEliminated &&
            !currentPlayerGotEliminated && (
              <p className="text-white/80">
                {t("results.theirWordWas")} {eliminatedPlayer.word}
              </p>
            )}

          {guessTimeLeft !== null && (
            <div className="mt-4">
              <CountdownBar timeLeft={guessTimeLeft} total={guessTimer} />
            </div>
          )}

          {/* Everyone else waits while Mr. White makes the final guess */}
          {isMrWhiteGuessing && !currentPlayerGotEliminated && (
            <p className="mt-4 text-white/80 animate-pulse">
              {t("results.waitingForGuess", { name: eliminatedPlayer.name })}
            </p>
          )}

          {isMrWhiteGuessing && currentPlayerGotEliminated && (
            <div className="mt-4 space-y-4">
              <p className="text-white/80">{t("results.finalGuess")}</p>
              <div className="flex gap-2">
                <Input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleGuessSubmit(); }}
                  placeholder={t("results.enterGuess")}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  onClick={handleGuessSubmit}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <MrWhiteGuess />
        </Card>
      )}

      <PlayerList
        players={activePlayers}
        votingResults={gameState.votingResults}
        currentPlayerId={peer?.id}
        tieBreakerPlayers={
          gameState.mrWhiteGuess == null // prevent playing tiebreaker animation again after mrWhite guess
            ? tieBreakerPlayers
            : []
        }
        lastEliminatedId={gameState.lastEliminatedId}
      />
    </div>
  );
};