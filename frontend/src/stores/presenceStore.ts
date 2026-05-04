import { create } from 'zustand';

interface PresenceState {
  online: Set<string>;
  typingByRoom: Record<string, Set<string>>; // roomId → set of userIds
  setInitialOnline: (ids: string[]) => void;
  setOnline: (userId: string, online: boolean) => void;
  setTyping: (roomId: string, userId: string, typing: boolean) => void;
  isOnline: (userId: string) => boolean;
  typersIn: (roomId: string) => string[];
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  online: new Set(),
  typingByRoom: {},
  setInitialOnline: (ids) => set({ online: new Set(ids) }),
  setOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.online);
      if (online) next.add(userId);
      else next.delete(userId);
      return { online: next };
    }),
  setTyping: (roomId, userId, typing) =>
    set((s) => {
      const map = { ...s.typingByRoom };
      const set2 = new Set(map[roomId] ?? []);
      if (typing) set2.add(userId);
      else set2.delete(userId);
      map[roomId] = set2;
      return { typingByRoom: map };
    }),
  isOnline: (userId) => get().online.has(userId),
  typersIn: (roomId) => Array.from(get().typingByRoom[roomId] ?? []),
}));
