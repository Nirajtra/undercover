import { useTranslation } from "react-i18next";
import { RoundRecord } from "@/types/game";

// Players as rows, one column of comments per round
export const RoundTable = ({
  rounds,
  showRoles = false,
  highlightPlayerId,
}: {
  rounds: RoundRecord[];
  showRoles?: boolean;
  highlightPlayerId?: string;
}) => {
  const { t } = useTranslation();
  const sortedRounds = [...rounds].sort((a, b) => a.round - b.round);

  // One row per player, in the order they first appeared
  const players = new Map<string, { name: string; role?: string }>();
  sortedRounds.forEach(r => r.entries.forEach(e => {
    if (!players.has(e.playerId)) players.set(e.playerId, { name: e.name, role: e.role });
  }));

  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-white/70">
          <tr>
            <th className="px-3 py-2 font-medium">{t("history.player")}</th>
            {showRoles && <th className="px-3 py-2 font-medium">{t("history.role")}</th>}
            {sortedRounds.map(r => (
              <th key={r.round} className="px-3 py-2 font-medium whitespace-nowrap">
                {t("history.round", { number: r.round })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...players.entries()].map(([id, player]) => (
            <tr key={id} className={`border-t border-white/10 ${id === highlightPlayerId ? "bg-primary/10" : ""}`}>
              <td className="px-3 py-2 text-white whitespace-nowrap">{player.name}</td>
              {showRoles && (
                <td className="px-3 py-2 text-white/70 whitespace-nowrap">
                  {player.role ? t(`roles.${player.role}`) : "—"}
                </td>
              )}
              {sortedRounds.map(r => {
                const entry = r.entries.find(e => e.playerId === id);
                return (
                  <td key={r.round} className="px-3 py-2 text-white/80">
                    {entry ? (entry.text || "—") : <span className="text-white/30">·</span>}
                    {r.eliminatedId === id && (
                      <span className="ml-2 rounded bg-red-500/30 px-1.5 py-0.5 text-xs text-red-300 whitespace-nowrap">
                        {t("history.out")}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
