import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MediaAsset } from '@/types/models';
import Lightbox from '@/features/gallery/Lightbox';

export default function AlbumPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: album } = useQuery({
    queryKey: ['album', id],
    queryFn: () => api.albums.get(id),
    enabled: !!id,
  });

  const { data: gallery } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.gallery.feed({ take: 200 }),
  });

  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const addAssetsMutation = useMutation({
    mutationFn: (assetIds: string[]) => api.albums.addAssets(id, assetIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', id] });
      qc.invalidateQueries({ queryKey: ['albums'] });
      setPicking(false);
      setSelected(new Set());
      toast.success('המדיה התווספה לאלבום');
    },
    onError: () => toast.error('הוספה נכשלה'),
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: () => api.albums.remove(id),
    onSuccess: () => {
      toast.success('האלבום נמחק');
      navigate('/gallery');
    },
    onError: () => toast.error('המחיקה נכשלה'),
  });

  if (!album) {
    return <div className="p-6 text-navy-500">טוען…</div>;
  }

  const assets: MediaAsset[] = album.assets?.map((a) => a.asset) ?? [];
  const canManage = album.ownerId === me?.id || me?.role === 'ADMIN';
  const existingIds = new Set(assets.map((a) => a.id));
  const availableToAdd = (gallery ?? []).filter((g) => !existingIds.has(g.id));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/gallery')} className="text-sm text-teal-600 mb-1">
            ‹ חזרה לגלריה
          </button>
          <h1 className="text-2xl font-bold text-navy-900">{album.title}</h1>
          {album.description && (
            <p className="text-sm text-navy-500 mt-1">{album.description}</p>
          )}
          <p className="text-xs text-navy-400 mt-1">
            נוצר ע"י {album.owner?.name} · {assets.length} פריטים
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setPicking(true)} className="btn-primary">+ הוסף מדיה</button>
            <button
              onClick={() => {
                if (confirm('למחוק את האלבום?')) deleteAlbumMutation.mutate();
              }}
              className="btn-danger"
            >
              מחק
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {assets.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setLightboxIdx(i)}
            className="relative aspect-square overflow-hidden rounded-lg bg-navy-100"
          >
            {a.thumbnailUrl ? (
              <img src={a.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🎥</div>
            )}
          </button>
        ))}
        {assets.length === 0 && (
          <p className="col-span-full text-center text-navy-400 py-12">
            האלבום ריק. הוסף מדיה כדי להתחיל.
          </p>
        )}
      </div>

      {picking && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => setPicking(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">בחר מדיה להוספה</h2>
              <button onClick={() => setPicking(false)} className="btn-ghost px-2">✕</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableToAdd.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(g.id)) next.delete(g.id);
                    else next.add(g.id);
                    setSelected(next);
                  }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    selected.has(g.id) ? 'border-teal-500' : 'border-transparent'
                  }`}
                >
                  {g.thumbnailUrl ? (
                    <img src={g.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-navy-100 flex items-center justify-center">🎥</div>
                  )}
                  {selected.has(g.id) && (
                    <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center text-2xl text-white">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPicking(false)} className="btn-ghost">ביטול</button>
              <button
                onClick={() => addAssetsMutation.mutate(Array.from(selected))}
                disabled={selected.size === 0 || addAssetsMutation.isPending}
                className="btn-primary"
              >
                הוסף {selected.size > 0 && `(${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox assets={assets} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
