import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { ChatRoom, Message, MessageType } from '@/types/models';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCallStore } from '@/stores/callStore';
import { usePresenceStore } from '@/stores/presenceStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface Props {
  room: ChatRoom;
  currentUserId: string;
  onOpenRooms: () => void;
}

export default function ChatView({ room, currentUserId, onOpenRooms }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setActive = useCallStore((s) => s.setActive);
  // Important: avoid returning a new Array from the store selector (causes infinite rerenders).
  const typersSet = usePresenceStore((s) => s.typingByRoom[room.id]);
  const typers = useMemo(() => Array.from(typersSet ?? []), [typersSet]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', room.id],
    queryFn: () => api.chat.messages(room.id, { take: 100 }),
  });

  // mark last message as read whenever messages change
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.authorId === currentUserId) return;
    getSocket()?.emit('read:receipt', { roomId: room.id, messageId: lastMsg.id });
  }, [messages, room.id, currentUserId]);

  const sendMutation = useMutation({
    mutationFn: async (msg: {
      type: MessageType;
      content?: string;
      mediaAssetId?: string;
      replyToId?: string;
      tempMessage: Message;
    }) => {
      // Use socket for instant delivery + optimistic UI; server sends back ack
      const socket = getSocket();
      if (!socket) throw new Error('No socket connection');
      return new Promise<Message>((resolve, reject) => {
        socket.emit(
          'message:send',
          {
            roomId: room.id,
            type: msg.type,
            content: msg.content,
            mediaAssetId: msg.mediaAssetId,
            replyToId: msg.replyToId,
            tempId: msg.tempMessage.tempId,
          },
          (resp: { ok: boolean; message?: Message; error?: string }) => {
            if (resp?.ok && resp.message) resolve(resp.message);
            else reject(new Error(resp?.error ?? 'שליחה נכשלה'));
          },
        );
      });
    },
    onMutate: ({ tempMessage }) => {
      // Optimistic insert
      qc.setQueryData<Message[]>(['messages', room.id], (old) => [...(old ?? []), tempMessage]);
    },
    onError: (_err, { tempMessage }) => {
      qc.setQueryData<Message[]>(['messages', room.id], (old) =>
        (old ?? []).filter((m) => m.tempId !== tempMessage.tempId),
      );
      toast.error('שליחת ההודעה נכשלה');
    },
    onSuccess: () => {
      // server broadcasts message:new which reconciles via socket handler
    },
  });

  const startCallMutation = useMutation({
    mutationFn: (isVideo: boolean) => api.calls.start(room.id, isVideo),
    onSuccess: (data) => {
      setActive(data);
      navigate(`/chat/${room.id}`);
    },
    onError: () => toast.error('פתיחת השיחה נכשלה'),
  });

  const otherMembers = useMemo(
    () => room.members.filter((m) => m.userId !== currentUserId).map((m) => m.user),
    [room, currentUserId],
  );

  const headerName =
    room.type === 'FAMILY' ? room.name : otherMembers[0]?.name ?? room.name;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <header className="h-14 border-b border-navy-100 px-4 flex items-center gap-3 bg-white">
        <button onClick={onOpenRooms} className="md:hidden btn-ghost px-2 py-1">☰</button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-900 truncate">{headerName}</div>
          <div className="text-xs text-navy-500 truncate">
            {typers.length > 0 ? 'מקליד…' : `${room.members.length} משתתפים`}
          </div>
        </div>
        <button
          onClick={() => startCallMutation.mutate(true)}
          disabled={startCallMutation.isPending}
          className="btn-ghost p-2 rounded-full hover:bg-teal-50 text-teal-600 text-xl"
          title="שיחת וידאו"
        >
          📹
        </button>
        <button
          onClick={() => startCallMutation.mutate(false)}
          disabled={startCallMutation.isPending}
          className="btn-ghost p-2 rounded-full hover:bg-teal-50 text-teal-600 text-xl"
          title="שיחת אודיו"
        >
          📞
        </button>
      </header>

      <MessageList messages={messages} currentUserId={currentUserId} roomId={room.id} />

      <MessageInput
        onSendText={(text) => {
          const tempId = `temp_${Date.now()}_${Math.random()}`;
          const tempMessage: Message = {
            id: tempId,
            tempId,
            roomId: room.id,
            authorId: currentUserId,
            type: 'TEXT',
            content: text,
            mediaAssetId: null,
            replyToId: null,
            createdAt: new Date().toISOString(),
            editedAt: null,
            deletedAt: null,
            pending: true,
          };
          sendMutation.mutate({ type: 'TEXT', content: text, tempMessage });
        }}
        onSendMedia={(asset, mediaType) => {
          const tempId = `temp_${Date.now()}_${Math.random()}`;
          const tempMessage: Message = {
            id: tempId,
            tempId,
            roomId: room.id,
            authorId: currentUserId,
            type: mediaType,
            content: null,
            mediaAssetId: asset.id,
            replyToId: null,
            createdAt: new Date().toISOString(),
            editedAt: null,
            deletedAt: null,
            mediaAsset: asset,
            pending: true,
          };
          sendMutation.mutate({
            type: mediaType,
            mediaAssetId: asset.id,
            tempMessage,
          });
        }}
        onTypingChange={(typing) => {
          const socket = getSocket();
          socket?.emit(typing ? 'typing:start' : 'typing:stop', { roomId: room.id });
        }}
      />
    </div>
  );
}
