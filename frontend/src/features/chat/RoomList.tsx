import type { ChatRoom } from '@/types/models';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  rooms: ChatRoom[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
}

export default function RoomList({ rooms, activeId, onSelect, onNewChat }: Props) {
  const me = useAuthStore((s) => s.user);
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-navy-100 flex items-center justify-between">
        <h2 className="font-semibold text-navy-900">צ'אטים</h2>
        <button
          type="button"
          onClick={() => onNewChat?.()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
          title="צ׳אט אישי חדש"
          aria-label="צ׳אט אישי חדש"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rooms.map((room) => {
          const lastMsg = room.messages?.[0];
          const others = room.members
            .filter((m) => m.userId !== me?.id)
            .map((m) => m.user);
          const display = room.type === 'FAMILY' ? room : others[0];
          const name = room.type === 'FAMILY' ? room.name : display && 'name' in display ? display.name : room.name;
          return (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={`w-full text-right flex items-center gap-3 px-4 py-3 transition-colors hover:bg-navy-50 ${
                activeId === room.id ? 'bg-teal-50' : ''
              }`}
            >
              {room.type === 'FAMILY' ? (
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg">
                  👨‍👩‍👧‍👦
                </div>
              ) : others[0] ? (
                <Avatar
                  src={others[0].profilePicture}
                  name={others[0].name}
                  userId={others[0].id}
                  showOnline
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-navy-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy-900 truncate">{name}</div>
                <div className="text-xs text-navy-500 truncate">
                  {lastMsg ? lastMessagePreview(lastMsg) : 'אין הודעות עדיין'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function lastMessagePreview(msg: NonNullable<ChatRoom['messages']>[number]): string {
  const prefix = msg.author?.name ? `${msg.author.name}: ` : '';
  if (msg.type === 'TEXT') return prefix + (msg.content ?? '');
  if (msg.type === 'IMAGE') return prefix + '📷 תמונה';
  if (msg.type === 'VIDEO') return prefix + '🎥 וידאו';
  if (msg.type === 'VOICE') return prefix + '🎙️ הודעה קולית';
  return prefix;
}
