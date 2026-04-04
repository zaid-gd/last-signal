import { create } from 'zustand';
import { P2PConnection, WebRTCDataConnection } from '../signaling/P2PConnection';
import { Signaling } from '../signaling/FirestoreSignaling';

interface ConnectionStore {
  peer: P2PConnection | null;
  roomId: string | null;
  peerId: string | null;
  fullPeerId: string | null;
  partnerPeerId: string | null;
  connectionState: 'idle' | 'waiting' | 'connected';
  role: 'astronaut' | 'missionControl' | null;
  conn: WebRTCDataConnection | null;
  setConnectionState: (state: 'idle' | 'waiting' | 'connected') => void;
  setRole: (role: 'astronaut' | 'missionControl') => void;
  setConn: (conn: WebRTCDataConnection | null) => void;
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
  connectionState: 'idle',
  role: null,
  conn: null,
  setConnectionState: (state) => set({ connectionState: state }),
  setRole: (role) => set({ role }),
  setConn: (conn) => set({ conn }),
  createRoom: async () => {
    cleanupConnection(get());

    try {
      const { roomId, myId } = await Signaling.createRoom();
      const peer = new P2PConnection();

      peer.onDataConnection = (conn) => {
        set({ conn });
      };

      peer.onConnectionOpen = () => {
        set({ connectionState: 'connected' });
        void Signaling.markConnected(roomId);
      };

      peer.pc.onicecandidate = (event) => {
        if (event.candidate) {
          void Signaling.addIceCandidate(roomId, 'host', event.candidate.toJSON());
        }
      };

      set({
        peer,
        roomId,
        peerId: roomId,
        fullPeerId: myId,
        partnerPeerId: null,
        conn: null,
        connectionState: 'waiting',
      });

      const offer = await peer.createOffer();
      await Signaling.setOffer(roomId, offer);

      Signaling.onRoomUpdate(roomId, (state) => {
        if (!state) {
          return;
        }

        if (state.joinerId) {
          set({ partnerPeerId: state.joinerId });
        }

        if (state.answer && !peer.pc.currentRemoteDescription) {
          void peer.handleAnswer(state.answer);
        }

        for (const candidate of state.joinerCandidates ?? []) {
          void peer.addIceCandidate(candidate);
        }
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
      const myId = await Signaling.joinRoom(normalizedRoomCode);
      const peer = new P2PConnection();

      peer.onDataConnection = (conn) => {
        set({ conn });
      };

      peer.onConnectionOpen = () => {
        set({ connectionState: 'connected' });
        void Signaling.markConnected(normalizedRoomCode);
      };

      peer.pc.onicecandidate = (event) => {
        if (event.candidate) {
          void Signaling.addIceCandidate(normalizedRoomCode, 'joiner', event.candidate.toJSON());
        }
      };

      set({
        peer,
        roomId: normalizedRoomCode,
        peerId: normalizedRoomCode,
        fullPeerId: myId,
        partnerPeerId: null,
        conn: null,
        connectionState: 'waiting',
      });

      Signaling.onRoomUpdate(normalizedRoomCode, (state) => {
        if (!state) {
          return;
        }

        set({ partnerPeerId: state.hostId });

        if (state.offer && !peer.pc.currentRemoteDescription) {
          void peer.handleOffer(state.offer).then((answer) => {
            void Signaling.setAnswer(normalizedRoomCode, answer);
          });
        }

        for (const candidate of state.hostCandidates ?? []) {
          void peer.addIceCandidate(candidate);
        }
      });
    } catch (err) {
      console.error('Join room error:', err);
      throw err instanceof Error ? err : new Error('Failed to connect. Check the room ID and try again.');
    }
  },
}));
