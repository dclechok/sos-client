import { useEffect, useMemo } from "react";
import clickSoundFile from '../sounds/button_click2.wav'

export default function useButtonClickSound() {
  const clickSound = useMemo(() => new Audio(clickSoundFile), []);

  useEffect(() => {
    function handleClick(e) {
      // Only trigger for actual buttons
      const isButton =
        e.target.tagName === "BUTTON" ||
        e.target.closest("button");

      if (!isButton) return;

      clickSound.currentTime = 0;
      clickSound.volume = 0.5;
      clickSound.play();
    }

    // Global listener
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [clickSound]);
}
