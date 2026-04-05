import { initializeApp } from 'firebase/app';
import {
  arrayUnion,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function sanitizeSessionDescription(
  description: RTCSessionDescriptionInit
): RTCSessionDescriptionInit {
  return {
    type: description.type,
    sdp: description.sdp ?? '',
  };
}

function sanitizeIceCandidate(candidate: RTCIceCandidateInit): RTCIceCandidateInit {
  const sanitized: RTCIceCandidateInit = {
    candidate: candidate.candidate ?? '',
  };

  if (candidate.sdpMid !== undefined) {
    sanitized.sdpMid = candidate.sdpMid;
  }

  if (candidate.sdpMLineIndex !== undefined) {
    sanitized.sdpMLineIndex = candidate.sdpMLineIndex;
  }

  if (candidate.usernameFragment !== undefined) {
    sanitized.usernameFragment = candidate.usernameFragment;
  }

  return sanitized;
}

function ensureFirebaseConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Missing Firebase config. Add your VITE_FIREBASE_* values.');
  }
}

ensureFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    const roomId = 'room-' + Math.random().toString(36).slice(2, 8);
    const myId = 'peer-' + Math.random().toString(36).slice(2, 10);

    await setDoc(doc(db, 'rooms', roomId), {
      hostId: myId,
      connected: false,
      hostCandidates: [],
      joinerCandidates: [],
    });

    return { roomId, myId };
  }

  static async joinRoom(roomId: string): Promise<string> {
    const myId = 'peer-' + Math.random().toString(36).slice(2, 10);
    const roomRef = doc(db, 'rooms', roomId);

    await setDoc(roomRef, { joinerId: myId }, { merge: true });

    return myId;
  }

  static async setOffer(roomId: string, offer: RTCSessionDescriptionInit) {
    await setDoc(
      doc(db, 'rooms', roomId),
      { offer: sanitizeSessionDescription(offer) },
      { merge: true }
    );
  }

  static async setAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
    await setDoc(
      doc(db, 'rooms', roomId),
      { answer: sanitizeSessionDescription(answer) },
      { merge: true }
    );
  }

  static async addIceCandidate(
    roomId: string,
    role: 'host' | 'joiner',
    candidate: RTCIceCandidateInit
  ) {
    const field = role === 'host' ? 'hostCandidates' : 'joinerCandidates';
    await updateDoc(doc(db, 'rooms', roomId), {
      [field]: arrayUnion(sanitizeIceCandidate(candidate)),
    });
  }

  static async markConnected(roomId: string) {
    await setDoc(doc(db, 'rooms', roomId), { connected: true }, { merge: true });
  }

  static onRoomUpdate(roomId: string, callback: (state: RoomState | null) => void) {
    return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      callback(snap.exists() ? (snap.data() as RoomState) : null);
    });
  }
}
