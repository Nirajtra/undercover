import { toast } from "sonner";
import { TFunction } from "i18next";
import { PlayerRole } from "@/types/game";
import { roleColor } from "@/lib/roleColors";

// Toast shown to everyone when a player is voted out: dark glass card in the role's neon color
// (green = civilian, white = undercover, red = Mr. White)
export const showEliminationToast = (t: TFunction, name: string, role?: PlayerRole) => {
  const accent = roleColor(role);

  toast(t("results.eliminatedPlayer", { name }), {
    description: (
      <span>
        {t("results.theyWereA")}{" "}
        <strong
          className="text-base font-extrabold uppercase tracking-wide"
          style={{ color: accent.hex, textShadow: `0 0 10px rgba(${accent.rgb}, 0.7)` }}
        >
          {t(`roles.${role}`)}
        </strong>
      </span>
    ),
    duration: 12000,
    position: "bottom-right",
    style: {
      background: `linear-gradient(135deg, rgba(${accent.rgb}, 0.14), rgba(10, 8, 24, 0.6))`,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: `1px solid rgba(${accent.rgb}, 0.4)`,
      borderLeft: `4px solid ${accent.hex}`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 28px rgba(${accent.rgb}, 0.18)`,
      color: "#ffffff",
    },
    classNames: {
      title: "!text-lg !font-bold",
      description: "!text-white/75",
    },
  });
};
