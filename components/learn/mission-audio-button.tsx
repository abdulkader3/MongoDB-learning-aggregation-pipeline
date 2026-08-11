"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MissionAudioButton({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const restart = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  });

  const restartRef = useRef(restart);
  useEffect(() => {
    restartRef.current = restart;
  });

  useEffect(() => {
    let tabHeld = false;
    const isEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return (
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        Boolean(el?.isContentEditable)
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.metaKey && (e.key === "Control" || e.key === "Alt")) {
        const combo = e.key === "Control" ? e.altKey : e.ctrlKey;
        if (combo) {
          if (e.repeat) return;
          e.preventDefault();
          toggleRef.current();
          return;
        }
      }
      if (e.code === "Tab") {
        tabHeld = true;
        return;
      }
      if (e.code === "KeyR" && tabHeld && !isEditable(e.target)) {
        e.preventDefault();
        restartRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Tab") tabHeld = false;
    };
    const onBlur = () => {
      tabHeld = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        className="hidden"
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-label={playing ? "Pause mission audio" : "Play mission audio"}
        title={playing ? "Pause audio (Ctrl+Alt)" : "Play audio (Ctrl+Alt)"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={restart}
        aria-label="Restart mission audio"
        title="Restart audio (Tab R)"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
