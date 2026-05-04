import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { MediaAsset } from '@/types/models';
import Lightbox from '@/features/gallery/Lightbox';

export default function GalleryPage() {
  const [tab, setTab] = useState<'feed' | 'albums'>('feed');

  const { data: assets } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.gallery.feed({ take: 200 }),
    enabled: tab === 'feed',
  });

  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: api.albums.list,
    enabled: tab === 'albums',
  });

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const createAlbumMutation = useMutation({
    mutationFn: (title: string) => api.albums.create(title),
    onSuccess: (album) => {
      qc.invalidateQueries({ queryKey: ['albums'] });
      navigate(`/albums/${album.id}`);
    },
    onError: () => toast.error('יצירת אלבום נכשלה'),
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-navy-900">גלריה</h1>
        <div className="flex bg-navy-50 rounded-xl p-1">
          <button
            onClick={() => setTab('feed')}
            className={`px-4 py-1.5 rounded-lg text-sm transition ${
              tab === 'feed' ? 'bg-white shadow-card text-navy-900' : 'text-navy-500'
            }`}
          >
            כל המדיה
          </button>
          <button
            onClick={() => setTab('albums')}
            className={`px-4 py-1.5 rounded-lg text-sm transition ${
              tab === 'albums' ? 'bg-white shadow-card text-navy-900' : 'text-navy-500'
            }`}
          >
            אלבומים
          </button>
        </div>
      </div>

      {tab === 'feed' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {assets?.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setLightboxIdx(i)}
              className="relative aspect-square overflow-hidden rounded-lg bg-navy-100 group"
            >
              {a.thumbnailUrl ? (
                <img
                  src={a.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : a.type === 'VIDEO' ? (
                <div className="w-full h-full flex items-center justify-center text-3xl">🎥</div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🎙️</div>
              )}
              {a.type === 'VIDEO' && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] rounded px-1.5 py-0.5">
                  ▶
                </div>
              )}
            </button>
          ))}
          {assets?.length === 0 && (
            <p className="col-span-full text-center text-navy-400 py-12">
              אין מדיה עדיין. שתף תמונות וסרטונים בצ'אט והם יופיעו כאן.
            </p>
          )}
        </div>
      )}

      {tab === 'albums' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const title = prompt('שם האלבום:');
              if (title?.trim()) createAlbumMutation.mutate(title.trim());
            }}
            className="aspect-[4/3] rounded-2xl border-2 border-dashed border-navy-200 hover:border-teal-500 flex items-center justify-center text-navy-500 hover:text-teal-600 transition"
          >
            <div className="text-center">
              <div className="text-4xl">+</div>
              <div className="text-sm mt-2">אלבום חדש</div>
            </div>
          </button>

          {albums?.map((alb) => (
            <Link
              key={alb.id}
              to={`/albums/${alb.id}`}
              className="card overflow-hidden p-0 hover:shadow-soft transition"
            >
              <div className="aspect-[4/3] bg-navy-100">
                {alb.coverAsset?.thumbnailUrl ? (
                  <img src={alb.coverAsset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold text-navy-900 truncate">{alb.title}</div>
                <div className="text-xs text-navy-500 mt-0.5">
                  {alb._count?.assets ?? 0} פריטים
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {lightboxIdx !== null && assets && (
        <Lightbox
          assets={assets}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
