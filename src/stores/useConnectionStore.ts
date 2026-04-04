import { create } from 'zustand';

interface ConnectionStore {
  peerId: string | null;
  fullPeerId: string | null;
  partnerPeerId: string | null;
  connectionState: 'idle' | 'waiting' | 'connected';
  role: 'astronaut' | 'missionControl' | null;
  conn: any;
  setPeerId: (id: string) => void;
  setFullPeerId: (id: string) => void;
  setPartnerPeerId: (id: string) => void;
  setConnectionState: (state: 'idle' | 'waiting' | 'connected') => void;
  setRole: (role: 'astronaut' | 'missionControl') => void;
  setConn: (conn: any) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  peerId: null,
  fullPeerId: null,
  partnerPeerId: null,
  connectionState: 'idle',
  role: null,
  conn: null,
  setPeerId: (id) => set({ peerId: id }),
  setFullPeerId: (id) => set({ fullPeerId: id }),
  setPartnerPeerId: (id) => set({ partnerPeerId: id }),
  setConnectionState: (state) => set({ connectionState: state }),
  setRole: (role) => set({ role }),
  setConn: (conn) => set({ conn }),
}));
