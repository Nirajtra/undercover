import { useGame } from "../context/GameContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePeer } from "../context/PeerContext";
import { PlayerList } from "./shared/PlayerList";
import { useEffect, useRef, useState } from "react";
import { useSound } from "@/context/SoundContext";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/use-countdown";
import { CountdownBar } from "./shared/CountdownBar";
import { RoundTable } from "./shared/RoundTable";
import { RoundRecord } from "@/types/game";
import { containsSecretWord, isDuplicateComment } from "@/lib/comments";
import { Check, Send } from "lucide-react";
import { useAttention } from "@/hooks/use-attention";

export const WordReveal = () => {
  const { gameState, setPhase, submitDescription, timeoutSpeaker, rerollWords } = useGame();
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
  // (a comment they wrote early is used instead of skipping)
  useEffect(() => {
    if (!isHost || !turnTimer || !currentSpeakerId) return;
    const timeout = setTimeout(() => {
      timeoutSpeaker(currentSpeakerId, t("wordReveal.timeUpSkipped"));
    }, turnTimer * 1000 + 1500);
    return () => clearTimeout(timeout);
  }, [isHost, currentSpeakerId, turnTimer]);

  // Once everyone has commented, voting starts right away
  const allCommented = !!gameState.speakingOrder?.length && !currentSpeakerId;
  useEffect(() => {
    if (isHost && allCommented) setPhase("voting");
  }, [isHost, allCommented]);

  useEffect(() => {
    if (gameState.currentRound === 1) {
      playSound("/sounds/word-reveal.mp3");
    } else {
      playSound("/sounds/new-page.mp3");
    }
  }, []);

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);
  const isMyTurn = !!currentPlayer && currentSpeakerId === currentPlayer.id;

  // Someone revealed the same comment before this player's turn: their saved one was dropped
  const pendingRejected = currentPlayer?.pendingRejected;
  useEffect(() => {
    if (pendingRejected) toast.error(t("wordReveal.savedCommentTaken", { comment: pendingRejected }));
  }, [pendingRejected]);

  // Your turn: flag the browser tab, and give a nudge if you haven't written anything yet
  useAttention(isMyTurn);
  useEffect(() => {
    if (!isMyTurn) return;
    playSound("/sounds/click-sound.mp3");
    if (!currentPlayer?.pendingDescription) toast(t("wordReveal.yourTurn"), { duration: 3000 });
  }, [isMyTurn]);

  // The host rerolled the words: tell everyone their word changed
  const myWord = currentPlayer?.word;
  const previousWord = useRef(myWord);
  useEffect(() => {
    if (previousWord.current !== undefined && myWord !== previousWord.current && !isHost) {
      toast.info(t("wordReveal.wordsRerolled"));
    }
    previousWord.current = myWord;
  }, [myWord]);

  const handleStartVoting = () => {
    setPhase("voting");
  };

  const handleSubmitDescription = () => {
    if (!description.trim()) return;

    if (!currentPlayer) return;

    // Blocks the word itself anywhere in the comment ("big apple" when the word is "apple")
    if (containsSecretWord(description, currentPlayer.word)) {
      toast.error(t("wordReveal.cannotUseWordDirectly"));
      return;
    }

    if (isDuplicateComment(gameState, description)) {
      toast.error(t("wordReveal.duplicateComment"));
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
    // Text stays in the box so an early comment can still be edited and re-sent
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


  const myIndex = speakingOrderPlayers.findIndex(p => p.id === currentPlayer.id);
  const isSpectator = currentPlayer.role === "spectator";
  const canWrite = !currentPlayer.isEliminated && myIndex !== -1 && !currentPlayer.submittedDescription;
  // The text in the box is exactly the early comment the host is holding
  const isSaved = !!currentPlayer.pendingDescription && description.trim() === currentPlayer.pendingDescription;

  // From round 2 on, show this game's earlier rounds next to the live current round
  const gameNumber = gameState.gameNumber ?? 1;
  const roundTable: RoundRecord[] = gameState.currentRound >= 2
    ? [
      ...(gameState.history ?? []).filter(r => r.game === gameNumber && r.round < gameState.currentRound),
      {
        game: gameNumber,
        round: gameState.currentRound,
        majorityWord: "",
        undercoverWord: "",
        entries: speakingOrderPlayers.map(p => ({ playerId: p.id, name: p.name, text: p.submittedDescription })),
      },
    ]
    : [];

  const main = (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-4 text-gradient">
        {isSpectator ? t("wordReveal.titleSpectating") : currentPlayer.isEliminated ? t("wordReveal.titleEliminated") : t("wordReveal.titleDiscussion")}
      </h2>
      {isSpectator ? (
        // Joined mid-game: nothing to reveal, they play from the next game
        <Card className="p-6 text-center glass-morphism hud-corners text-white/80">
          {t("wordReveal.spectatorInfo")}
        </Card>
      ) : (
      <Card className="p-6 text-center glass-morphism hud-corners">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-lg text-white">
              {currentPlayer.isEliminated ? t("wordReveal.yourWordWas") : t("wordReveal.yourWordIs")}
            </p>
            {/* Fixed-size box: the hidden placeholder and the revealed word take the same space, so nothing shifts */}
            {/* Mouse: hover reveals. Touch: tap toggles (touch also fires "enter", which used to
                reveal and then immediately un-reveal on the same tap) */}
            <div
              onClick={() => setRevealed(r => !r)}
              onPointerEnter={(e) => { if (e.pointerType === "mouse") setRevealed(true); }}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") setRevealed(false); }}
              title={t("wordReveal.hoverToReveal", "Hover or tap to reveal")}
              className={`mx-auto flex h-12 w-full max-w-xs items-center justify-center rounded-lg px-3 text-xl font-bold cursor-pointer select-none transition-colors duration-200 ${revealed ? "bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan [text-shadow:0_0_12px_rgba(34,229,255,0.7)]" : "bg-white/10 border border-white/10 text-white/40 tracking-widest"}`}
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
      )}

      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">{isMyTurn ? t("wordReveal.yourTurn") : t("wordReveal.speakingOrder")}</h3>

        {/* Only the player whose turn it is sees their countdown */}
        {isMyTurn && timeLeft !== null && <CountdownBar timeLeft={timeLeft} total={turnTimer} />}

        {/* Everyone can write right away; it's revealed when their turn comes */}
        {canWrite && !isMyTurn && (
          <p className="text-center text-sm text-white/70">
            {currentPlayer.pendingDescription ? t("wordReveal.commentQueued") : t("wordReveal.writeEarly")}
          </p>
        )}

        {canWrite && (
          <div className="relative flex h-10 w-full min-w-[200px]">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              onKeyDown={(e) => { if (e.key === "Enter" && !isSaved) handleSubmitDescription(); }}
              autoFocus
              placeholder={t("wordReveal.enterWordOrPhrase")}
              maxLength={25}
              className="peer h-full w-full rounded-[7px] border px-3 py-2.5 pr-12 text-sm font-normal outline-none transition-all"
            />
            {/* Always-visible send button; shows a tick once the early comment is saved, and
                turns back into send as soon as the text is edited, so it can be changed any time */}
            <button
              onClick={handleSubmitDescription}
              type="button"
              disabled={!description.trim() || isSaved}
              title={isSaved ? t("wordReveal.commentSaved") : t("wordReveal.submit")}
              aria-label={isSaved ? t("wordReveal.commentSaved") : t("wordReveal.submit")}
              className={`!absolute right-1 top-1 z-10 flex h-8 w-9 items-center justify-center rounded text-white transition-all ${
                isSaved
                  ? "bg-neon-civilian/20 text-neon-civilian border border-neon-civilian/50 shadow-[0_0_10px_rgba(57,255,159,0.4)]"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(79,107,255,0.5)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none"
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
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

  if (roundTable.length === 0) {
    return <div className="max-w-md mx-auto p-6 animate-fade-in">{main}</div>;
  }

  return (
    // Main column stays centered; the table takes all the space to its left (scrolls only if it overflows)
    <div className="w-full p-6 animate-fade-in grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem_minmax(0,1fr)] lg:items-start">
      {/* Left on desktop, below the main content on mobile */}
      <div className="order-last min-w-0 space-y-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:sticky lg:top-4">
        <RoundTable
          rounds={roundTable}
          highlightPlayerId={currentSpeakerId}
          title={t("wordReveal.commentsSoFar")}
          liveRound={gameState.currentRound}
        />
      </div>
      <div className="w-full max-w-md mx-auto lg:max-w-none lg:col-start-2 lg:row-start-1">{main}</div>
    </div>
  );
};