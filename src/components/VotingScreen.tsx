import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import React, { useEffect, useState } from "react";
import { PlayerList } from "./shared/PlayerList";
import { useSound } from "@/context/SoundContext";
import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/use-countdown";
import { CountdownBar } from "./shared/CountdownBar";

export const VotingScreen = () => {
  const { gameState, submitVote, closeVoting } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const { t } = useTranslation();

  const tieCandidates = gameState.tieCandidates;

  // Play again and clear the old selection when a tie re-vote starts
  useEffect(() => {
    playSound("/sounds/new-page.mp3");
    setSelectedPlayer("");
  }, [tieCandidates?.join(",")]);

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);
  const hasVoted = currentPlayer && gameState.votingResults?.[currentPlayer.id];
  const isEliminated = currentPlayer?.isEliminated;

  // Voting gets the same time as a speaker turn; a re-vote restarts it
  const voteTimer = gameState.turnTimer ?? 0;
  const voteTimerKey = `${gameState.currentRound}-${tieCandidates?.join(",") ?? "all"}`;
  const timeLeft = useCountdown(voteTimer, voteTimerKey);

  const handleVote = () => {
    playSound("/sounds/submit-vote.wav");
    if (currentPlayer && selectedPlayer) {
      //playSound("/sounds/vote.mp3");
      if (isHost) {
        submitVote(currentPlayer.id, selectedPlayer);
      } else {
        sendToHost({
          type: "SUBMIT_VOTE",
          voterId: currentPlayer.id,
          targetId: selectedPlayer
        });
      }
    }
  };

  // When time runs out, a selected-but-unsent vote is submitted
  useEffect(() => {
    if (timeLeft === 0 && !isEliminated && !hasVoted && selectedPlayer) {
      handleVote();
    }
  }, [timeLeft]);

  // The host closes voting shortly after the timer ended; non-voters are skipped
  useEffect(() => {
    if (!isHost || !voteTimer) return;
    const timeout = setTimeout(closeVoting, voteTimer * 1000 + 1500);
    return () => clearTimeout(timeout);
  }, [isHost, voteTimer, voteTimerKey]);

  // Sort players by speaking order (and filter out eliminated players);
  // during a re-vote only the tied players are shown
  const activePlayers = gameState.speakingOrder
    .map(id => gameState.players.find(p => p.id === id))
    .filter(p => p && (!tieCandidates || tieCandidates.includes(p.id)));

  const tieNames = tieCandidates
    ?.map(id => gameState.players.find(p => p.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  const tieBanner = tieCandidates && (
    <p className="text-center text-sm text-white/80 -mt-2">
      {t("voting.tieRevote", { names: tieNames })}
    </p>
  );
  const countdown = timeLeft !== null && <CountdownBar timeLeft={timeLeft} total={voteTimer} />;

  // Everyone still in the game who hasn't voted yet (in speaking order)
  const pendingVoters = gameState.speakingOrder
    .map(id => gameState.players.find(p => p.id === id))
    .filter(p => p && !p.isEliminated && !gameState.votingResults?.[p.id]);

  const pendingPanel = (
    <Card className="p-4 glass-morphism md:sticky md:top-4">
      <div className="flex items-center gap-2 text-white/90 mb-3">
        <Hourglass className="h-4 w-4" />
        <span className="font-semibold">{t("voting.stillToVote", { count: pendingVoters.length })}</span>
      </div>
      {pendingVoters.length > 0 ? (
        <ul className="space-y-2">
          {pendingVoters.map(player => (
            <li key={player.id} className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-white">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              <span className="truncate">{player.name}</span>
              {player.id === peer?.id && <span className="text-primary">{t("common.you")}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">{t("voting.everyoneVoted")}</p>
      )}
    </Card>
  );

  const layout = (title: string, main: React.ReactNode) => (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-4 text-gradient">{title}</h2>
      {tieBanner}
      {countdown}
      <div className="grid gap-6 md:grid-cols-[1fr_220px] md:items-start">
        <div className="space-y-4">{main}</div>
        {pendingPanel}
      </div>
    </div>
  );

  // Don't show voting UI if player is eliminated
  if (isEliminated) {
    return layout(
      t("voting.inProgress"),
      <PlayerList
        players={activePlayers}
        allPlayers={gameState.players}
        votingResults={gameState.votingResults}
        currentPlayerId={peer?.id}
      />
    );
  }

  return layout(
    t("voting.voteToEliminate"),
    <>
      <PlayerList
        players={activePlayers}
        selectedPlayer={selectedPlayer}
        onPlayerClick={!hasVoted ? setSelectedPlayer : undefined}
        allPlayers={gameState.players}
        votingResults={gameState.votingResults}
        currentPlayerId={peer?.id}
      />

      {!hasVoted && (
        <Button
          onClick={handleVote}
          disabled={!selectedPlayer}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {t("voting.submitVote")}
        </Button>
      )}
    </>
  );
};
