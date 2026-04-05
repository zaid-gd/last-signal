import { create } from 'zustand';
import { P2PManager } from '../network/P2PManager';

interface ConnectionStore {
  peer: P2PManager | null;
  roomId: string | null;
  peerId: string | null;
  fullPeerId: string | null;
  partnerPeerId: string | null;
  connectionRole: 'host' | 'joiner' | null;
  connectionState: 'idle' | 'waiting' | 'connected';
  role: 'astronaut' | 'missionControl' | null;
  conn: ReturnType<P2PManager['getConnection']> | null;
  setConnectionState: (state: 'idle' | 'waiting' | 'connected') => void;
  setRole: (role: 'astronaut' | 'missionControl') => void;
  setConn: (conn: ReturnType<P2PManager['getConnection']> | null) => void;
  createRoom: () => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
}

function cleanupConnection(store: ConnectionStore) {
  if (store.peer) {
    store.peer.close();
  }
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  peer: null,
  roomId: null,
  peerId: null,
  fullPeerId: null,
  partnerPeerId: null,
  connectionRole: null,
  connectionState: 'idle',
  role: null,
  conn: null,
  setConnectionState: (state) => set({ connectionState: state }),
  setRole: (role) => set({ role }),
  setConn: (conn) => set({ conn }),
  createRoom: async () => {
    cleanupConnection(get());

    try {
      const peer = new P2PManager();
      peer.onConnected = () => {
        set({ connectionState: 'connected' });
      };
      peer.onRoomState = (state) => {
        if (state.joinerId) {
          set({ partnerPeerId: state.joinerId });
        }
      };

      const { roomId, myId } = await peer.createRoom();

      set({
        peer,
        roomId,
        peerId: roomId,
        fullPeerId: myId,
        partnerPeerId: null,
        connectionRole: 'host',
        conn: peer.getConnection(),
        connectionState: 'waiting',
      });

    } catch (err) {
      console.error('Create room error:', err);
      if (typeof window !== 'undefined') {
        window.alert('Failed to create room. Check your Firebase config.');
      }
      throw err instanceof Error ? err : new Error('Failed to create room.');
    }
  },
  joinRoom: async (roomCode) => {
    const normalizedRoomCode = roomCode.trim().toLowerCase();

    if (!normalizedRoomCode) {
      throw new Error('Please enter a room ID');
    }

    cleanupConnection(get());

    try {
      const peer = new P2PManager();
      peer.onConnected = () => {
        set({ connectionState: 'connected' });
      };
      peer.onRoomState = (state) => {
        set({ partnerPeerId: state.hostId });
      };

      const { myId } = await peer.joinRoom(normalizedRoomCode);

      set({
        peer,
        roomId: normalizedRoomCode,
        peerId: normalizedRoomCode,
        fullPeerId: myId,
        partnerPeerId: null,
        connectionRole: 'joiner',
        conn: peer.getConnection(),
        connectionState: 'waiting',
      });
    } catch (err) {
      console.error('Join room error:', err);
      throw err instanceof Error ? err : new Error('Failed to connect. Check the room ID and try again.');
    }
  },
}));
