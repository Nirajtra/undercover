import { useEffect, useState } from "react";

/**
 * Counts down from `seconds` whenever `runKey` changes to a new truthy value.
 * Returns the remaining whole seconds, or null when no countdown is running.
 */
export const useCountdown = (seconds: number, runKey: string | undefined) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!seconds || !runKey) {
      setTimeLeft(null);
      return;
    }
    const endsAt = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
  }, [seconds, runKey]);

  return timeLeft;
};
