import { createContext, useContext, useEffect, useState } from "react";

const SoundContext = createContext<{
  playSound: (src: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
}>( {
  playSound: () => {},
  isMuted: false,
  toggleMute: () => {},
});

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  // Muted by default so nothing plays out loud in the office; the choice is remembered per browser
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem("muted") !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("muted", String(isMuted));
    } catch {
      // storage unavailable — keep in-memory state only
    }
  }, [isMuted]);
  const audioCache = new Map<string, HTMLAudioElement>();

  useEffect(() => {
    const soundsToPreload = ["/submit-vote.wav", "/new-page.mp3", "/click-sound.mp3"];
    soundsToPreload.forEach((src) => {
      const audio = new Audio(src);
      audio.preload = "auto"; 
      audioCache.set(src, audio);
    });
  }, []);

  const playSound = (src: string) => {
    if (!isMuted) {
      let audio = audioCache.get(src);
      if (!audio) {
        audio = new Audio(src); // Fallback in case sound wasn't preloaded
        audioCache.set(src, audio);
      }
      audio.play();
    }
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  return (
    <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);