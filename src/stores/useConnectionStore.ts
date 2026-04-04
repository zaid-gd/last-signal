import { create } from 'zustand';
import Peer from 'peerjs';

interface ConnectionStore {
  peer: Peer | null;
  peerId: string | null;
  fullPeerId: string | null;
  partnerPeerId: string | null;
  connectionState: 'idle' | 'waiting' | 'connected';
  role: 'astronaut' | 'missionControl' | null;
  conn: any | null;
  setConnectionState: (state: 'idle' | 'waiting' | 'connected') => void;
  setRole: (role: 'astronaut' | 'missionControl') => void;
  setConn: (conn: any) => void;
  createRoom: () => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
}

const PEER_OPTIONS = {
  host: '0.peerjs.com',
  port: 443,
  path: '/peerjs',
};

function createPeerInstance() {
  return new Peer(PEER_OPTIONS);
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  peer: null,
  peerId: null,
  fullPeerId: null,
  partnerPeerId: null,
  connectionState: 'idle',
  role: null,
  conn: null,
  setConnectionState: (state) => set({ connectionState: state }),
  setRole: (role) => set({ role }),
  setConn: (conn) => set({ conn }),
  createRoom: async () => await new Promise<void>((resolve, reject) => {
    const peer = createPeerInstance();

    peer.on('open', (id) => {
      console.log('Peer created:', id);
      set({
        peer,
        peerId: id,
        fullPeerId: id,
        partnerPeerId: null,
        conn: null,
        connectionState: 'waiting',
      });
      resolve();
    });

    peer.on('connection', (conn) => {
      set({
        conn,
        partnerPeerId: conn.peer,
        connectionState: 'connected',
      });

      conn.on('data', (data) => {
        console.log('Received:', data);
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (typeof window !== 'undefined') {
        window.alert('Failed to connect to PeerJS. Try refreshing.');
      }
      reject(err);
    });

    set({ peer });
  }),
  joinRoom: async (roomCode) => {
    const normalizedRoomCode = roomCode.trim().toLowerCase();

    if (!normalizedRoomCode) {
      throw new Error('Please enter a room ID');
    }

    const connectWithPeer = (peer: Peer) => new Promise<void>((resolve, reject) => {
      const conn = peer.connect(normalizedRoomCode);

      conn.on('open', () => {
        console.log('Connected to', normalizedRoomCode);
        set({
          conn,
          partnerPeerId: normalizedRoomCode,
          connectionState: 'connected',
        });
        resolve();
      });

      conn.on('data', (data) => {
        console.log('Received:', data);
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        reject(new Error('Failed to connect. Check the room ID and try again.'));
      });
    });

    const existingPeer = get().peer;

    if (existingPeer?.open) {
      await connectWithPeer(existingPeer);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const peer = createPeerInstance();

      peer.on('open', async (id) => {
        set({
          peer,
          peerId: id,
          fullPeerId: id,
        });

        try {
          await connectWithPeer(peer);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (typeof window !== 'undefined') {
          window.alert('Failed to connect to PeerJS. Try refreshing.');
        }
        reject(err);
      });

      set({ peer });
    });
  },
}));
