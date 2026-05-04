import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { MediaAsset } from '@/types/models';

interface Props {
  asset: MediaAsset;
  mine: boolean;
}

export default function VoiceMessagePlayer({ asset, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const duration = asset.duration ?? 0;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnded);
    };
  }, []);

  const peaks: number[] = (asset.waveform as number[] | null) ?? Array(40).fill(0.5);
  const playedFrac = duration > 0 ? progress / duration : 0;

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        onClick={toggle}
        className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0',
          mine ? 'bg-teal-600' : 'bg-navy-700',
        )}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 flex items-end gap-px h-8" style={{ direction: 'ltr' }}>
        {peaks.map((p, i) => {
          const height = `${Math.max(20, Math.min(100, p * 100))}%`;
          const played = i / peaks.length <= playedFrac;
          return (
            <div
              key={i}
              className={clsx(
                'flex-1 rounded-sm',
                played ? (mine ? 'bg-teal-500' : 'bg-navy-700') : 'bg-navy-200',
              )}
              style={{ height }}
            />
          );
        })}
      </div>
      <span className="text-[10px] tabular-nums text-navy-500 shrink-0 w-10 text-end">
        {formatTime(playing ? progress : duration)}
      </span>
      <audio ref={audioRef} src={asset.url} preload="metadata" />
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
