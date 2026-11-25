import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CountdownBar = ({ timeLeft, total }: { timeLeft: number; total: number }) => {
  const { t } = useTranslation();
  const isLow = timeLeft <= 5;

  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-center gap-2 font-mono text-lg font-bold ${isLow ? "text-red-500 animate-pulse" : "text-white"}`}>
        <Timer className="h-5 w-5" />
        {t("wordReveal.timeLeft", { seconds: timeLeft })}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-linear ${isLow ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${(timeLeft / total) * 100}%` }}
        />
      </div>
    </div>
  );
};
