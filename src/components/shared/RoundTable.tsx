import { useTranslation } from "react-i18next";
import { RoundRecord } from "@/types/game";
import { RoleBadge } from "./RoleBadge";

// Stable per-name color for the avatar dot
const AVATAR_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-lime-500", "bg-blue-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500"];
const avatarColor = (name: string) =>
  AVATAR_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

// Players as rows, one column of comments per round
export const RoundTable = ({
  rounds,
  showRoles = false,
  highlightPlayerId,
  title,
  liveRound,
}: {
  rounds: RoundRecord[];
  showRoles?: boolean;
  highlightPlayerId?: string;
  title?: string;
  liveRound?: number; // round still being played, marked in the header
}) => {
  const { t } = useTranslation();
  const sortedRounds = [...rounds].sort((a, b) => a.round - b.round);

  // One row per player, in the order they first appeared
  const players = new Map<string, { name: string; role?: string }>();
  sortedRounds.forEach(r => r.entries.forEach(e => {
    if (!players.has(e.playerId)) players.set(e.playerId, { name: e.name, role: e.role });
  }));

  return (
    <div className="glass-morphism hud-corners overflow-hidden rounded-xl">
      {title && (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="text-xs text-white/40">{t("playerList.players", { count: players.size })}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/45">
              <th className="pl-2 pr-1 py-2 font-semibold">{t("history.player")}</th>
              {showRoles && <th className="px-2 py-2 font-semibold">{t("history.role")}</th>}
              {sortedRounds.map(r => (
                <th
                  key={r.round}
                  title={t("history.round", { number: r.round })}
                  className={`px-1 py-2 font-semibold whitespace-nowrap ${r.round === liveRound ? "text-neon-cyan" : ""}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {r.round === liveRound && <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan shadow-[0_0_6px_#22e5ff] animate-pulse" />}
                    {t("history.roundShort", { number: r.round })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {[...players.entries()].map(([id, player]) => {
              const isOut = sortedRounds.some(r => r.eliminatedId === id);
              const isSpeaking = id === highlightPlayerId;

              return (
                <tr
                  key={id}
                  className={`transition-colors ${isSpeaking ? "bg-neon-indigo/10" : "hover:bg-white/[0.03]"}`}
                >
                  <td className={`pl-1.5 pr-1 py-1.5 whitespace-nowrap border-l-2 ${isSpeaking ? "border-primary" : "border-transparent"}`}>
                    <span className={`inline-flex items-center gap-1.5 ${isOut ? "opacity-60" : ""}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(player.name)}`}>
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      {/* Role tag sits under the name (once voted out the role is public) to keep the column narrow */}
                      <span className="flex flex-col items-start leading-tight">
                        <span className={`font-medium ${isOut ? "text-white/70 line-through decoration-white/30" : "text-white"}`}>
                          {player.name}
                        </span>
                        {!showRoles && player.role && isOut && (
                          <span className="mt-0.5"><RoleBadge role={player.role} size="xs" /></span>
                        )}
                      </span>
                    </span>
                  </td>
                  {showRoles && (
                    <td className="px-2 py-2 text-white/70 whitespace-nowrap">
                      {player.role ? t(`roles.${player.role}`) : "—"}
                    </td>
                  )}
                  {sortedRounds.map(r => {
                    const entry = r.entries.find(e => e.playerId === id);
                    // The role already sits next to the name, so the round they went out just says "out"
                    const role = r.eliminatedId === id ? (entry?.role ?? player.role) : undefined;
                    return (
                      <td key={r.round} className="px-1 py-1.5 align-middle break-words">
                        {entry?.text ? (
                          <span className="inline-block rounded-md bg-white/[0.07] px-1.5 py-0.5 text-white/90">
                            {entry.text}
                          </span>
                        ) : (
                          <span className="text-white/25">{entry ? "—" : ""}</span>
                        )}
                        {r.eliminatedId === id && (
                          <span
                            title={role ? t("history.outAs", { role: t(`roles.${role}`) }) : undefined}
                            className="ml-1 inline-block rounded-full border border-neon-mrwhite/40 bg-neon-mrwhite/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neon-mrwhite whitespace-nowrap"
                          >
                            {t("history.out")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
