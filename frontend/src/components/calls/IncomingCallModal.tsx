import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useCallStore } from '@/stores/callStore';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/Avatar';

export default function IncomingCallModal() {
  const incoming = useCallStore((s) => s.incoming);
  const setIncoming = useCallStore((s) => s.setIncoming);
  const setActive = useCallStore((s) => s.setActive);

  const acceptMutation = useMutation({
    mutationFn: () => api.calls.join(incoming!.callId),
    onSuccess: (data) => {
      setActive(data);
      getSocket()?.emit('call:accept', { callId: incoming!.callId, roomId: incoming!.roomId });
    },
    onError: () => toast.error('הצטרפות לשיחה נכשלה'),
  });

  // Auto-stop ringing after 30s
  useEffect(() => {
    if (!incoming) return;
    const t = window.setTimeout(() => setIncoming(null), 30_000);
    return () => window.clearTimeout(t);
  }, [incoming, setIncoming]);

  if (!incoming) return null;

  function handleReject() {
    if (!incoming) return;
    getSocket()?.emit('call:reject', { callId: incoming.callId, roomId: incoming.roomId });
    setIncoming(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft p-8 w-full max-w-sm text-center animate-slide-up">
        <div className="ring-pulse inline-block rounded-full mb-4">
          <Avatar
            src={incoming.startedBy.profilePicture}
            name={incoming.startedBy.name}
            size="lg"
          />
        </div>
        <h2 className="text-xl font-bold text-navy-900">{incoming.startedBy.name}</h2>
        <p className="text-sm text-navy-500 mt-1">
          {incoming.isVideo ? 'שיחת וידאו נכנסת...' : 'שיחת אודיו נכנסת...'}
        </p>

        <div className="flex justify-center gap-6 mt-8">
          <button
            onClick={handleReject}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl flex items-center justify-center"
            title="דחה"
          >
            ✕
          </button>
          <button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white text-2xl flex items-center justify-center"
            title="ענה"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
