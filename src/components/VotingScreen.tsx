import { useGame } from "../context/GameContext";
import { usePeer } from "../context/PeerContext";
import { Card } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import React, { useEffect } from "react";
import { PlayerList } from "./shared/PlayerList";
import { useSound } from "@/context/SoundContext";
import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/use-countdown";
import { CountdownBar } from "./shared/CountdownBar";
import { RoundTable } from "./shared/RoundTable";
import { useAttention } from "@/hooks/use-attention";

export const VotingScreen = () => {
  const { gameState, submitVote, closeVoting } = useGame();
  const { peer, isHost, sendToHost } = usePeer();
  const { playSound } = useSound();
  const { t } = useTranslation();

  const tieCandidates = gameState.tieCandidates;

  // Play again when a tie re-vote starts
  useEffect(() => {
    playSound("/sounds/new-page.mp3");
  }, [tieCandidates?.join(",")]);

  const currentPlayer = gameState.players.find(p => p.id === peer?.id);
  const hasVoted = currentPlayer && gameState.votingResults?.[currentPlayer.id];
  const isEliminated = currentPlayer?.isEliminated;

  // Flag the browser tab until you've voted
  useAttention(!!currentPlayer && !isEliminated && !hasVoted);

  // Voting gets the same time as a speaker turn; a re-vote restarts it
  const voteTimer = gameState.turnTimer ?? 0;
  const voteTimerKey = `${gameState.currentRound}-${tieCandidates?.join(",") ?? "all"}`;
  const timeLeft = useCountdown(voteTimer, voteTimerKey);

  // Voting happens straight from the Vote button on a player's row
  const handleVote = (targetId: string) => {
    if (!currentPlayer || hasVoted) return;
    playSound("/sounds/submit-vote.wav");
    if (isHost) {
      submitVote(currentPlayer.id, targetId);
    } else {
      sendToHost({
        type: "SUBMIT_VOTE",
        voterId: currentPlayer.id,
        targetId
      });
    }
  };

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
    <Card className="p-4 glass-morphism lg:sticky lg:top-4">
      <div className="flex items-center gap-2 text-white/90 mb-3">
        <Hourglass className="h-4 w-4 text-neon-amber" />
        <span className="font-semibold">{t("voting.stillToVote", { count: pendingVoters.length })}</span>
      </div>
      {pendingVoters.length > 0 ? (
        <ul className="space-y-2">
          {pendingVoters.map(player => (
            <li key={player.id} className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-white">
              <span className="h-2 w-2 shrink-0 rounded-full bg-neon-amber shadow-[0_0_8px_#ffc53d] animate-pulse" />
              <span className="truncate">{player.name}</span>
              {player.id === peer?.id && <span className="text-neon-cyan/80">{t("common.you")}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">{t("voting.everyoneVoted")}</p>
      )}
    </Card>
  );

  // From round 2 on, show this game's comments so voters can look back before deciding
  const gameNumber = gameState.gameNumber ?? 1;
  const roundTable = gameState.currentRound >= 2
    ? (gameState.history ?? []).filter(r => r.game === gameNumber && r.round <= gameState.currentRound)
    : [];

  // Desktop: comments table | player list (centered) | still to vote. Smaller screens stack them.
  const layout = (title: string, main: React.ReactNode) => (
    <div className="w-full p-6 space-y-6 animate-fade-in">
      <div className="mx-auto max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center text-gradient">{title}</h2>
        {tieBanner}
        {countdown}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem_minmax(0,1fr)] lg:items-start">
        <div className="mx-auto w-full max-w-md space-y-4 lg:max-w-none lg:col-start-2 lg:row-start-1">{main}</div>
        <div className="mx-auto w-full max-w-md lg:max-w-[16rem] lg:mx-0 lg:col-start-3 lg:row-start-1">{pendingPanel}</div>
        {roundTable.length > 0 && (
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:sticky lg:top-4">
            <RoundTable rounds={roundTable} title={t("wordReveal.commentsSoFar")} />
          </div>
        )}
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
    <PlayerList
      players={activePlayers}
      onVote={!hasVoted ? handleVote : undefined}
      allPlayers={gameState.players}
      votingResults={gameState.votingResults}
      currentPlayerId={peer?.id}
    />
  );
};
