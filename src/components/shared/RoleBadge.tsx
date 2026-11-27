import { useTranslation } from "react-i18next";
import { roleColor } from "@/lib/roleColors";

// Neon pill showing a player's role in its role color
export const RoleBadge = ({ role, size = "sm" }: { role?: string; size?: "xs" | "sm" }) => {
  const { t } = useTranslation();
  if (!role) return null;
  const c = roleColor(role);

  return (
    <span
      className={`inline-block rounded-full border font-semibold uppercase tracking-wide whitespace-nowrap ${
        size === "xs" ? "px-1.5 text-[9px]" : "px-2 py-0.5 text-[11px]"
      }`}
      style={{
        color: c.hex,
        background: `rgba(${c.rgb}, 0.12)`,
        borderColor: `rgba(${c.rgb}, 0.45)`,
        textShadow: `0 0 8px rgba(${c.rgb}, 0.6)`,
        boxShadow: `0 0 10px rgba(${c.rgb}, 0.15)`,
      }}
    >
      {t(`roles.${role}`)}
    </span>
  );
};
