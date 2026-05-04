import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { ChatRoom, User } from '@/types/models';
import Avatar from '@/components/Avatar';
import { api } from '@/lib/api';
import { useCallStore } from '@/stores/callStore';

interface Props {
  room: ChatRoom;
  allUsers: User[];
}

export default function ChatRightPanel({ room, allUsers }: Props) {
  const navigate = useNavigate();
  const setActive = useCallStore((s) => s.setActive);

  const startCallMutation = useMutation({
    mutationFn: () => api.calls.start(room.id, true),
    onSuccess: (data) => {
      setActive(data);
      navigate(`/chat/${room.id}`);
    },
    onError: () => toast.error('פתיחת השיחה נכשלה'),
  });

  const memberIds = new Set(room.members.map((m) => m.userId));
  const participants = allUsers.filter((u) => memberIds.has(u.id));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-2">
        <button
          onClick={() => startCallMutation.mutate()}
          disabled={startCallMutation.isPending}
          className="btn-primary w-full"
        >
          📹 התחל שיחת וידאו קבוצתית
        </button>
      </div>
      <div className="px-4">
        <h3 className="font-semibold text-navy-900 mb-3">משתתפים</h3>
        <div className="space-y-3">
          {participants.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <Avatar
                src={u.profilePicture}
                name={u.name}
                userId={u.id}
                showOnline
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy-900 truncate">
                  {u.name}
                  {u.role === 'ADMIN' && (
                    <span className="badge bg-teal-100 text-teal-700 mr-1 text-[10px]">מנהל</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
