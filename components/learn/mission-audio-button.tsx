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
        title={playing ? "Pause audio" : "Play audio"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={restart}
        aria-label="Restart mission audio"
        title="Restart audio"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
