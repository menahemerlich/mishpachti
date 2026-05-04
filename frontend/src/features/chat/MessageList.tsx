import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/types/models';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  currentUserId: string;
  roomId: string;
}

export default function MessageList({ messages, currentUserId }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(messages.length);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 8,
    getItemKey: (i) => messages[i]?.id ?? i,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastLenRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
    lastLenRef.current = messages.length;
  }, [messages.length, virtualizer]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto bg-cream"
      style={{ contain: 'strict' }}
    >
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const msg = messages[virtualRow.index];
          if (!msg) return null;
          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-4 py-1"
            >
              <MessageBubble
                message={msg}
                isMine={msg.authorId === currentUserId}
              />
            </div>
          );
        })}
      </div>
      {messages.length === 0 && (
        <div className="text-center text-navy-400 py-12">
          אין הודעות עדיין — התחל את השיחה!
        </div>
      )}
    </div>
  );
}
