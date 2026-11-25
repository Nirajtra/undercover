import { useGame } from "../context/GameContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePeer } from "../context/PeerContext";
import { PlayerList } from "./shared/PlayerList";
import { useEffect, useState } from "react";
import { useSound } from "@/context/SoundContext";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/use-countdown";
import { CountdownBar } from "./shared/CountdownBar";

export const WordReveal = () => {
  const { gameState, setPhase, submitDescription, rerollWords } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const { t } = useTranslation();

  const [description, setDescription] = useState("");
  const [revealed, setRevealed] = useState(false);

  const turnTimer = gameState.turnTimer ?? 0;
  const currentSpeakerId = gameState.speakingOrder
    ?.map(id => gameState.players.find(p => p.id === id))
    .find(p => p && !p.isEliminated && !p.submittedDescription)?.id;

  // Local countdown, restarted whenever the speaker changes
  const timeLeft = useCountdown(turnTimer, currentSpeakerId);

  // When time runs out, the speaker submits whatever they typed
  useEffect(() => {
    if (timeLeft === 0 && currentSpeakerId === peer?.id && description.trim()) {
      handleSubmitDescription();
    }
  }, [timeLeft]);

  // The host skips the speaker if nothing arrived shortly after the timer ended
  useEffect(() => {
    if (!isHost || !turnTimer || !currentSpeakerId) return;
    const timeout = setTimeout(() => {
      submitDescription(currentSpeakerId, t("wordReveal.timeUpSkipped"));
    }, turnTimer * 1000 + 1500);
    return () => clearTimeout(timeout);
  }, [isHost, currentSpeakerId, turnTimer]);

  useEffect(() => {
    if (gameState.currentRound === 1) {
      playSound("/sounds/word-reveal.mp3");
    } else {
      playSound("/sounds/new-page.mp3");
    }
  }, []);

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);

  const handleStartVoting = () => {
    setPhase("voting");
  };

  const handleSubmitDescription = () => {
    if (!description.trim()) return;

    if (!currentPlayer) return;

    if (description.trim().toLowerCase() === currentPlayer.word.toLowerCase()) {
      toast.error(t("wordReveal.cannotUseWordDirectly"));
      return;
    }

    if (isHost) {
      submitDescription(currentPlayer.id, description.trim());
    } else {
      sendToHost({
        type: "SUBMIT_DESCRIPTION",
        playerId: currentPlayer.id,
        description: description.trim()
      });
    }
    setDescription("");
  };

  if (!peer) {
    return <div className="text-white text-center">{t("wordReveal.connecting")}</div>;
  }

  if (!currentPlayer) {
    return (
      <div className="text-white text-center">
        <p>{t("wordReveal.waitingForData")}</p>
        <p className="text-sm opacity-70">{t("wordReveal.yourId")} {peer.id}</p>
      </div>
    );
  }

  // Convert speaking order IDs to player objects
  const speakingOrderPlayers = gameState.speakingOrder
    ? gameState.speakingOrder
      .map(id => gameState.players.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined && !p.isEliminated)
    : [];


  const currentSpeakerIndex = gameState.speakingOrder ? speakingOrderPlayers.findIndex(p => !p.submittedDescription) : 0;
  const myIndex = gameState.speakingOrder ? speakingOrderPlayers.findIndex(p => p.id === currentPlayer.id) : 0;
  const isMyTurn = gameState.speakingOrder && currentSpeakerIndex === myIndex;

  return (
    <div className="max-w-md mx-auto p-6 space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">{currentPlayer.isEliminated ? t("wordReveal.titleEliminated") : t("wordReveal.titleDiscussion")}</h2>
      <Card className="p-6 text-center glass-morphism">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-lg text-white">
              {currentPlayer.isEliminated ? t("wordReveal.yourWordWas") : t("wordReveal.yourWordIs")}
            </p>
            {/* Fixed-size box: the hidden placeholder and the revealed word take the same space, so nothing shifts */}
            <div
              onClick={() => setRevealed(r => !r)}
              onMouseEnter={() => setRevealed(true)}
              onMouseLeave={() => setRevealed(false)}
              title={t("wordReveal.hoverToReveal", "Hover or tap to reveal")}
              className={`mx-auto flex h-12 w-full max-w-xs items-center justify-center rounded-lg px-3 text-xl font-bold cursor-pointer select-none transition-colors duration-200 ${revealed ? "bg-white/10 text-primary" : "bg-white/20 text-white/40 tracking-widest"}`}
            >
              <span className="truncate">
                {revealed
                  ? (currentPlayer.role === "mrwhite" ? t("wordReveal.mrWhite") : currentPlayer.word)
                  : "••••••"}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/50">{t("wordReveal.hoverToReveal", "Hover or tap to reveal")}</p>
          <p className="text-sm text-white/70">
            {currentPlayer.role === "mrwhite" && revealed
              ? (
                <>
                  {t("wordReveal.listenCarefully")}
                  <br />
                  {t("wordReveal.figureOutSecretWord")}
                </>
              )
              : (
                <>
                  {t("wordReveal.describeWithoutSaying")}
                  <br />
                  {t("wordReveal.beClever")}
                </>
              )}
          </p>
        </div>
      </Card>

      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">{isMyTurn ? t("wordReveal.yourTurn") : t("wordReveal.speakingOrder")}</h3>

        {timeLeft !== null && <CountdownBar timeLeft={timeLeft} total={turnTimer} />}

        {isMyTurn && (
          <div className="relative flex h-10 w-full min-w-[200px]">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmitDescription(); }}
              autoFocus
              placeholder={t("wordReveal.enterWordOrPhrase")}
              maxLength={25}
              className="peer h-full w-full rounded-[7px] border px-3 py-2.5 pr-20 text-sm font-normal outline-none transition-all"
            />
            {description.trim() && (
              <button
                onClick={handleSubmitDescription}
                type="button"
                className="!absolute right-1 top-1 z-10 select-none rounded bg-primary hover:bg-primary/90 py-2 px-4 text-center align-middle text-xs font-bold uppercase text-white shadow-md shadow-primary/20 transition-all focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none"
                data-ripple-light="true"
              >
                {t("wordReveal.submit")}
              </button>
            )}
          </div>
        )}

        <PlayerList
          players={speakingOrderPlayers}
          currentPlayerId={peer.id}
          speakingOrder={true}
        />
      </div>

      {isHost && (
        <div className="space-y-2">
          <Button
            onClick={handleStartVoting}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-lg font-medium transition-colors duration-200"
          >
            {t("wordReveal.startVoting")}
          </Button>
          {gameState.currentRound === 1 && (
            <Button
              onClick={() => {
                rerollWords();
                toast.success(t("wordReveal.rerolled"));
              }}
              variant="outline"
              size="lg"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              {t("wordReveal.rerollWords")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};