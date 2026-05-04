import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import type { Message } from '@/types/models';
import Avatar from '@/components/Avatar';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface Props {
  message: Message;
  isMine: boolean;
}

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isMine }: Props) {
  const me = useAuthStore((s) => s.user);
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  function toggleReaction(emoji: string) {
    const socket = getSocket();
    if (!socket || !me) return;
    const mine = message.reactions?.find((r) => r.userId === me.id && r.emoji === emoji);
    if (mine) {
      socket.emit('reaction:remove', { messageId: message.id, emoji });
    } else {
      socket.emit('reaction:add', { messageId: message.id, emoji });
    }
    setShowPicker(false);
  }

  function handleDelete() {
    if (!confirm('למחוק את ההודעה?')) return;
    const socket = getSocket();
    socket?.emit('message:delete', { messageId: message.id });
  }

  // Aggregate reactions
  const reactionMap = new Map<string, { emoji: string; users: string[] }>();
  for (const r of message.reactions ?? []) {
    const cur = reactionMap.get(r.emoji) ?? { emoji: r.emoji, users: [] };
    cur.users.push(r.userId);
    reactionMap.set(r.emoji, cur);
  }

  return (
    <div
      className={clsx('flex gap-2 my-1', isMine ? 'flex-row-reverse' : '')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowPicker(false);
      }}
    >
      {!isMine && (
        <Avatar
          src={message.author?.profilePicture}
          name={message.author?.name ?? '?'}
          size="sm"
        />
      )}
      <div className={clsx('max-w-[78%] flex flex-col', isMine ? 'items-start' : 'items-end')}>
        {!isMine && message.author && (
          <span className="text-[11px] text-navy-500 px-2">{message.author.name}</span>
        )}

        <div
          className={clsx(
            'px-3 py-2 text-sm break-words',
            isMine ? 'bubble-mine' : 'bubble-theirs',
            message.pending && 'opacity-60',
          )}
        >
          {message.replyTo && (
            <div className="mb-2 ps-2 border-s-2 border-teal-400 text-xs text-navy-600">
              <div className="font-medium">{message.replyTo.author?.name}</div>
              <div className="opacity-80 truncate">{message.replyTo.content ?? ''}</div>
            </div>
          )}

          {message.type === 'TEXT' && <div className="whitespace-pre-wrap">{message.content}</div>}

          {message.type === 'IMAGE' && message.mediaAsset && (
            <a href={message.mediaAsset.url} target="_blank" rel="noopener noreferrer">
              <img
                src={message.mediaAsset.thumbnailUrl ?? message.mediaAsset.url}
                alt=""
                className="rounded-xl max-w-[260px] max-h-[260px] object-cover"
                loading="lazy"
              />
            </a>
          )}

          {message.type === 'VIDEO' && message.mediaAsset && (
            <video
              controls
              poster={message.mediaAsset.thumbnailUrl ?? undefined}
              className="rounded-xl max-w-[300px] max-h-[300px]"
            >
              <source src={message.mediaAsset.url} />
            </video>
          )}

          {message.type === 'VOICE' && message.mediaAsset && (
            <VoiceMessagePlayer asset={message.mediaAsset} mine={isMine} />
          )}

          <div className={clsx('flex items-center gap-1.5 mt-1 text-[10px]', isMine ? 'text-teal-700' : 'text-navy-400')}>
            <span>{format(parseISO(message.createdAt), 'HH:mm')}</span>
            {message.editedAt && <span>(נערך)</span>}
            {isMine && <SeenIndicator readsCount={message.reads?.length ?? 0} />}
          </div>
        </div>

        {/* Reactions */}
        {reactionMap.size > 0 && (
          <div className={clsx('flex gap-1 mt-1', isMine ? 'flex-row-reverse' : '')}>
            {Array.from(reactionMap.values()).map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(r.emoji)}
                className="text-xs bg-white border border-navy-100 rounded-full px-2 py-0.5 hover:bg-navy-50"
              >
                {r.emoji} {r.users.length > 1 ? r.users.length : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions (hover) */}
      {showActions && !message.pending && (
        <div className={clsx('relative flex items-center gap-1 self-center')}>
          <button
            onClick={() => setShowPicker((s) => !s)}
            className="w-7 h-7 rounded-full bg-white border border-navy-100 hover:bg-navy-50 flex items-center justify-center text-xs"
            title="הוסף תגובה"
          >
            😊
          </button>
          {isMine && (
            <button
              onClick={handleDelete}
              className="w-7 h-7 rounded-full bg-white border border-navy-100 hover:bg-red-50 flex items-center justify-center text-xs"
              title="מחק"
            >
              🗑️
            </button>
          )}
          {showPicker && (
            <div className={clsx(
              'absolute z-30 top-8 bg-white rounded-xl shadow-soft border border-navy-100 p-1 flex gap-0.5',
              isMine ? 'right-0' : 'left-0',
            )}>
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => toggleReaction(e)}
                  className="text-xl hover:scale-110 transition-transform p-1"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeenIndicator({ readsCount }: { readsCount: number }) {
  if (readsCount === 0) return <span>✓</span>;
  return <span className="text-teal-500">✓✓</span>;
}
