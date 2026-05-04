import { useEffect, useState } from 'react';
import type { MediaAsset } from '@/types/models';

interface Props {
  assets: MediaAsset[];
  startIndex: number;
  onClose: () => void;
}

export default function Lightbox({ assets, startIndex, onClose }: Props) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.min(i + 1, assets.length - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assets.length, onClose]);

  const a = assets[idx];
  if (!a) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 left-4 text-white text-2xl z-10"
      >
        ✕
      </button>
      <div className="absolute top-4 right-4 text-white/80 text-sm z-10">
        {idx + 1} / {assets.length}
      </div>

      <div
        className="flex-1 flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {a.type === 'IMAGE' ? (
          <img src={a.url} alt="" className="max-w-full max-h-full object-contain" />
        ) : a.type === 'VIDEO' ? (
          <video src={a.url} controls autoPlay className="max-w-full max-h-full" />
        ) : (
          <audio src={a.url} controls autoPlay />
        )}
      </div>

      <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <button
          disabled={idx >= assets.length - 1}
          onClick={() => setIdx(idx + 1)}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
        >
          ‹ הקודם
        </button>
        <div className="text-sm">
          {a.owner?.name && <span>שותף ע"י {a.owner.name}</span>}
        </div>
        <button
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
        >
          הבא ›
        </button>
      </div>
    </div>
  );
}
