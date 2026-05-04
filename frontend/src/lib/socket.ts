import { io, Socket } from 'socket.io-client';
import { config } from './config';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useCallStore } from '@/stores/callStore';
import { queryClient } from './queryClient';
import type { Message, Reaction, IncomingCall, CalendarEvent } from '@/types/models';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

function resolveSocketUrl(): string {
  if (config.socketUrl) return config.socketUrl;

  // If API URL is absolute (e.g. http://localhost:4000/api), derive socket base from it.
  const apiUrl = config.apiUrl;
  if (/^https?:\/\//i.test(apiUrl)) {
    try {
      const u = new URL(apiUrl);
      // Many setups use /api as REST prefix; Socket.IO is served from the same host.
      u.pathname = '/';
      u.search = '';
      u.hash = '';
      return u.origin;
    } catch {
      // fall through
    }
  }

  // Default to current origin (works when a reverse proxy serves /api and /socket.io)
  return window.location.origin;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(resolveSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] connected', socket?.id);
  });
  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('[socket] disconnected:', reason);
  });
  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[socket] connect_error:', err.message);
  });

  // ----- Presence -----
  socket.on('presence:list', (ids: string[]) => {
    usePresenceStore.getState().setInitialOnline(ids);
  });
  socket.on('presence:update', ({ userId, online }: { userId: string; online: boolean }) => {
    usePresenceStore.getState().setOnline(userId, online);
  });

  // ----- Messages -----
  socket.on('message:new', (msg: Message) => {
    queryClient.setQueryData<Message[]>(['messages', msg.roomId], (old) => {
      const list = old ?? [];
      // Reconcile optimistic temp message
      if (msg.tempId) {
        const idx = list.findIndex((m) => m.tempId === msg.tempId);
        if (idx >= 0) {
          const next = list.slice();
          next[idx] = { ...msg, pending: false };
          return next;
        }
      }
      // Avoid duplicates
      if (list.some((m) => m.id === msg.id)) return list;
      return [...list, msg];
    });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
  });

  socket.on('message:edited', (msg: Message) => {
    queryClient.setQueryData<Message[]>(['messages', msg.roomId], (old) =>
      (old ?? []).map((m) => (m.id === msg.id ? msg : m)),
    );
  });

  socket.on('message:deleted', ({ id, roomId }: { id: string; roomId: string }) => {
    queryClient.setQueryData<Message[]>(['messages', roomId], (old) =>
      (old ?? []).filter((m) => m.id !== id),
    );
  });

  // ----- Reactions -----
  socket.on('reaction:added', (r: Reaction) => {
    queryClient.setQueriesData<Message[]>({ queryKey: ['messages'] }, (old) => {
      if (!old) return old;
      return old.map((m) => {
        if (m.id !== r.messageId) return m;
        const reactions = m.reactions ?? [];
        if (reactions.some((x) => x.id === r.id)) return m;
        return { ...m, reactions: [...reactions, r] };
      });
    });
  });

  socket.on(
    'reaction:removed',
    ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
      queryClient.setQueriesData<Message[]>({ queryKey: ['messages'] }, (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            reactions: (m.reactions ?? []).filter(
              (r) => !(r.userId === userId && r.emoji === emoji),
            ),
          };
        });
      });
    },
  );

  // ----- Typing -----
  socket.on('typing:start', ({ roomId, userId }: { roomId: string; userId: string }) => {
    usePresenceStore.getState().setTyping(roomId, userId, true);
    // auto-clear after 5s
    setTimeout(() => usePresenceStore.getState().setTyping(roomId, userId, false), 5000);
  });
  socket.on('typing:stop', ({ roomId, userId }: { roomId: string; userId: string }) => {
    usePresenceStore.getState().setTyping(roomId, userId, false);
  });

  // ----- Read receipts -----
  socket.on(
    'read:receipt',
    (data: { roomId: string; messageId: string; userId: string; readAt: string }) => {
      queryClient.setQueryData<Message[]>(['messages', data.roomId], (old) =>
        (old ?? []).map((m) => {
          if (m.id !== data.messageId) return m;
          const reads = m.reads ?? [];
          if (reads.some((r) => r.userId === data.userId)) return m;
          return {
            ...m,
            reads: [...reads, { messageId: data.messageId, userId: data.userId, readAt: data.readAt }],
          };
        }),
      );
    },
  );

  // ----- Calendar -----
  socket.on('calendar:created', (e: CalendarEvent) => {
    queryClient.setQueryData<CalendarEvent[]>(['calendar'], (old) => {
      if (!old) return [e];
      if (old.some((x) => x.id === e.id)) return old;
      return [...old, e];
    });
  });
  socket.on('calendar:updated', (e: CalendarEvent) => {
    queryClient.setQueryData<CalendarEvent[]>(['calendar'], (old) =>
      (old ?? []).map((x) => (x.id === e.id ? e : x)),
    );
  });
  socket.on('calendar:deleted', ({ id }: { id: string }) => {
    queryClient.setQueryData<CalendarEvent[]>(['calendar'], (old) =>
      (old ?? []).filter((x) => x.id !== id),
    );
  });

  // ----- Calls -----
  socket.on('call:incoming', (data: IncomingCall) => {
    const me = useAuthStore.getState().user?.id;
    if (data.startedBy.id === me) return; // don't show ringing on starter
    if (useCallStore.getState().active) return; // already in a call
    useCallStore.getState().setIncoming(data);
  });
  socket.on('call:ended', () => {
    useCallStore.getState().clearAll();
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
