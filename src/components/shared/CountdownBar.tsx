import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CountdownBar = ({ timeLeft, total }: { timeLeft: number; total: number }) => {
  const { t } = useTranslation();
  const isLow = timeLeft <= 5;

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-center gap-2 font-mono text-lg font-bold ${isLow ? "text-neon-mrwhite animate-shake" : "text-neon-cyan"}`}
        style={{ textShadow: isLow ? "0 0 10px rgba(255,51,102,0.7)" : "0 0 10px rgba(34,229,255,0.6)" }}
      >
        <Timer className="h-5 w-5" />
        {t("wordReveal.timeLeft", { seconds: timeLeft })}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${
            isLow
              ? "bg-neon-mrwhite shadow-[0_0_10px_#ff3366]"
              : "bg-gradient-to-r from-neon-cyan to-neon-indigo shadow-[0_0_10px_rgba(34,229,255,0.6)]"
          }`}
          style={{ width: `${(timeLeft / total) * 100}%` }}
        />
      </div>
    </div>
  );
};
