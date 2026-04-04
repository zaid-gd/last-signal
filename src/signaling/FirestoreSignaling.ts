import { initializeApp } from 'firebase/app';
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCouJVHdG39SJ2kG2W6Nc8s5PinHBCv21Y",
  authDomain: "last-signal-vibe-jam.firebaseapp.com",
  projectId: "last-signal-vibe-jam",
  storageBucket: "last-signal-vibe-jam.firebasestorage.app",
  messagingSenderId: "493425829086",
  appId: "1:493425829086:web:1f5b46404c40da33b18e4f",
  measurementId: "G-CMD4KVXCMT"
};

function ensureFirebaseConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Missing Firebase config. Add your VITE_FIREBASE_* values.');
  }
}

let dbInstance: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  ensureFirebaseConfig();

  if (!dbInstance) {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }

  return dbInstance;
}

export interface RoomState {
  hostId: string;
  joinerId?: string;
  connected: boolean;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  hostCandidates?: RTCIceCandidateInit[];
  joinerCandidates?: RTCIceCandidateInit[];
}

export class Signaling {
  static async createRoom(): Promise<{ roomId: string; myId: string }> {
    const roomId = `room-${Math.random().toString(36).slice(2, 8)}`;
    const myId = `peer-${Math.random().toString(36).slice(2, 10)}`;

    await setDoc(doc(getDb(), 'rooms', roomId), {
      hostId: myId,
      connected: false,
      hostCandidates: [],
      joinerCandidates: [],
    });

    return { roomId, myId };
  }

  static async joinRoom(roomId: string): Promise<string> {
    const myId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    const roomRef = doc(getDb(), 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      throw new Error('Failed to connect. Check the room ID and try again.');
    }

    await setDoc(roomRef, { joinerId: myId }, { merge: true });

    return myId;
  }

  static async setOffer(roomId: string, offer: RTCSessionDescriptionInit) {
    await setDoc(doc(getDb(), 'rooms', roomId), { offer }, { merge: true });
  }

  static async setAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
    await setDoc(doc(getDb(), 'rooms', roomId), { answer }, { merge: true });
  }

  static async addIceCandidate(
    roomId: string,
    role: 'host' | 'joiner',
    candidate: RTCIceCandidateInit
  ) {
    const field = role === 'host' ? 'hostCandidates' : 'joinerCandidates';
    await updateDoc(doc(getDb(), 'rooms', roomId), {
      [field]: arrayUnion(candidate),
    });
  }

  static async markConnected(roomId: string) {
    await setDoc(doc(getDb(), 'rooms', roomId), { connected: true }, { merge: true });
  }

  static onRoomUpdate(roomId: string, callback: (state: RoomState | null) => void) {
    return onSnapshot(doc(getDb(), 'rooms', roomId), (snap) => {
      callback(snap.exists() ? (snap.data() as RoomState) : null);
    });
  }
}
