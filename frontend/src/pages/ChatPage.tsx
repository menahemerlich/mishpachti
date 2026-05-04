import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import RoomList from '@/features/chat/RoomList';
import ChatView from '@/features/chat/ChatView';
import ChatRightPanel from '@/features/chat/ChatRightPanel';
import Avatar from '@/components/Avatar';

export default function ChatPage() {
  const { roomId: routeRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: api.chat.rooms });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: api.users.list });

  const activeRoomId = useMemo(() => {
    if (routeRoomId) return routeRoomId;
    return rooms?.find((r) => r.type === 'FAMILY')?.id ?? rooms?.[0]?.id ?? null;
  }, [routeRoomId, rooms]);

  const activeRoom = rooms?.find((r) => r.id === activeRoomId);

  useEffect(() => {
    if (!routeRoomId && activeRoomId) {
      navigate(`/chat/${activeRoomId}`, { replace: true });
    }
  }, [routeRoomId, activeRoomId, navigate]);

  const [showRoomList, setShowRoomList] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const dmMutation = useMutation({
    mutationFn: (userId: string) => api.chat.dm(userId),
    onSuccess: async (room) => {
      await qc.invalidateQueries({ queryKey: ['rooms'] });
      navigate(`/chat/${room.id}`);
      setShowNewChat(false);
      setShowRoomList(false);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'פתיחת הצ׳אט נכשלה';
      toast.error(msg);
    },
  });

  const candidates = useMemo(() => {
    const list = users ?? [];
    return me ? list.filter((u) => u.id !== me.id) : list;
  }, [users, me]);

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] flex bg-cream pb-14 md:pb-0">
      {/* Room list (left) */}
      <aside
        className={`${
          showRoomList ? 'flex' : 'hidden'
        } md:flex w-full md:w-72 shrink-0 flex-col bg-white border-l border-navy-100 absolute md:static inset-0 z-10`}
      >
        <RoomList
          rooms={rooms ?? []}
          activeId={activeRoomId}
          onNewChat={() => setShowNewChat(true)}
          onSelect={(id) => {
            navigate(`/chat/${id}`);
            setShowRoomList(false);
          }}
        />
      </aside>

      {showNewChat &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/30 flex"
            onClick={() => setShowNewChat(false)}
          >
            <div
              className="bg-white w-full h-full md:h-auto md:max-h-[80vh] md:w-[520px] md:rounded-2xl md:shadow-soft md:m-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-navy-100 flex items-center justify-between">
                <div className="font-semibold text-navy-900">צ׳אט אישי חדש</div>
                <button type="button" className="btn-ghost px-2 py-1" onClick={() => setShowNewChat(false)}>
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {candidates.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    className="w-full text-right flex items-center gap-3 px-4 py-3 hover:bg-navy-50 border-b border-navy-50"
                    onClick={() => dmMutation.mutate(u.id)}
                    disabled={dmMutation.isPending}
                  >
                    <Avatar src={u.profilePicture} name={u.name} userId={u.id} showOnline />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-navy-900 truncate">{u.name}</div>
                      <div className="text-xs text-navy-500 truncate">{u.email}</div>
                    </div>
                  </button>
                ))}
                {candidates.length === 0 && (
                  <div className="p-6 text-center text-navy-500">אין משתמשים זמינים</div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Main chat */}
      <section className="flex-1 flex flex-col min-w-0">
        {activeRoom && me ? (
          <ChatView
            room={activeRoom}
            currentUserId={me.id}
            onOpenRooms={() => setShowRoomList(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-navy-500">
            בוחר חדר…
          </div>
        )}
      </section>

      {/* Right panel — participants */}
      {activeRoom && (
        <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-white border-r border-navy-100">
          <ChatRightPanel
            room={activeRoom}
            allUsers={users ?? []}
          />
        </aside>
      )}
    </div>
  );
}
