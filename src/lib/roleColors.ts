import { PlayerRole } from "@/types/game";

// Neon theme colors. Role colors: green = civilian, white = undercover, red = Mr. White.
// Keep in sync with `neon` in tailwind.config.ts.
export const NEON = {
  civilian: { hex: "#39ff9f", rgb: "57, 255, 159" },
  undercover: { hex: "#f4f7ff", rgb: "244, 247, 255" },
  mrwhite: { hex: "#ff3366", rgb: "255, 51, 102" },
  indigo: { hex: "#4f6bff", rgb: "79, 107, 255" },
  cyan: { hex: "#22e5ff", rgb: "34, 229, 255" },
  amber: { hex: "#ffc53d", rgb: "255, 197, 61" },
};

export const roleColor = (role?: PlayerRole | string) =>
  role === "civilian" ? NEON.civilian
    : role === "undercover" ? NEON.undercover
      : role === "mrwhite" ? NEON.mrwhite
        : NEON.indigo;
