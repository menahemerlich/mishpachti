import { create } from 'zustand';
import { IncomingCall, CallToken } from '@/types/models';

interface CallState {
  incoming: IncomingCall | null;
  active: CallToken | null;
  setIncoming: (c: IncomingCall | null) => void;
  setActive: (c: CallToken | null) => void;
  clearAll: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  incoming: null,
  active: null,
  setIncoming: (incoming) => set({ incoming }),
  setActive: (active) => set({ active, incoming: null }),
  clearAll: () => set({ incoming: null, active: null }),
}));
