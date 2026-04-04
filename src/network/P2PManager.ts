import { Signaling, type RoomState } from '../signaling/FirestoreSignaling';

type DataHandler = (data: string) => void;

class DataConnectionAdapter {
  private channel: RTCDataChannel | null = null;
  private readonly handlers = new Set<DataHandler>();

  attachChannel(channel: RTCDataChannel) {
    this.channel = channel;
    this.channel.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : String(event.data);
      console.log('Message received, scheduling 10s delay');
      window.setTimeout(() => {
        this.handlers.forEach((handler) => handler(payload));
      }, 10000);
    };
  }

  send(data: string) {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('Connection is not open.');
    }

    this.channel.send(data);
  }

  on(event: 'data', handler: DataHandler) {
    if (event === 'data') {
      this.handlers.add(handler);
    }
  }

  off(event: 'data', handler: DataHandler) {
    if (event === 'data') {
      this.handlers.delete(handler);
    }
  }
}

export class P2PManager {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private readonly conn = new DataConnectionAdapter();
  private unsubscribeRoom: (() => void) | null = null;
  private readonly addedCandidates = new Set<string>();
  private roomId: string | null = null;
  private role: 'host' | 'joiner' | null = null;
  onConnected?: () => void;
  onRoomState?: (state: RoomState) => void;

  getConnection() {
    return this.conn;
  }

  async createRoom(): Promise<{ roomId: string; myId: string }> {
    this.cleanup();

    const { roomId, myId } = await Signaling.createRoom();
    console.log('Peer created:', myId, 'room:', roomId);

    this.roomId = roomId;
    this.role = 'host';
    this.pc = this.createPeerConnection();
    this.attachDataChannel(this.pc.createDataChannel('game'));
    this.subscribeToRoom(roomId);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    console.log('Offer sent for room:', roomId);
    await Signaling.setOffer(roomId, {
      type: offer.type,
      sdp: offer.sdp,
    });

    return { roomId, myId };
  }

  async joinRoom(roomId: string): Promise<{ myId: string }> {
    this.cleanup();

    const normalizedRoomId = roomId.trim().toLowerCase();
    const myId = await Signaling.joinRoom(normalizedRoomId);
    console.log('Joiner created:', myId, 'joining room:', normalizedRoomId);

    this.roomId = normalizedRoomId;
    this.role = 'joiner';
    this.pc = this.createPeerConnection();
    this.subscribeToRoom(normalizedRoomId);

    return { myId };
  }

  sendMessage(text: string) {
    this.conn.send(text);
  }

  onMessage(callback: (msg: string) => void) {
    this.conn.on('data', callback);
    return () => this.conn.off('data', callback);
  }

  cleanup() {
    this.unsubscribeRoom?.();
    this.unsubscribeRoom = null;
    this.addedCandidates.clear();
    this.dataChannel?.close();
    this.pc?.close();
    this.dataChannel = null;
    this.pc = null;
    this.roomId = null;
    this.role = null;
  }

  close() {
    this.cleanup();
  }

  private createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.roomId && this.role) {
        console.log('ICE candidate sent:', this.role);
        void Signaling.addIceCandidate(this.roomId, this.role, event.candidate.toJSON());
      }
    };

    pc.ondatachannel = (event) => {
      console.log('Remote data channel received');
      this.attachDataChannel(event.channel);
    };

    return pc;
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.conn.attachChannel(channel);
    channel.onopen = () => {
      console.log('Data channel open');
      this.onConnected?.();
      if (this.roomId) {
        void Signaling.markConnected(this.roomId);
      }
    };
  }

  private subscribeToRoom(roomId: string) {
    this.unsubscribeRoom = Signaling.onRoomUpdate(roomId, (state) => {
      if (!state || !this.pc || !this.role) {
        return;
      }

      this.onRoomState?.(state);
      void this.handleRoomState(state);
    });
  }

  private async handleRoomState(state: RoomState) {
    if (!this.pc || !this.role || !this.roomId) {
      return;
    }

    if (this.role === 'host') {
      if (state.answer && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(state.answer));
        console.log('Answer received');
      }

      for (const candidate of state.joinerCandidates ?? []) {
        await this.addIceCandidate(candidate);
      }
      return;
    }

    if (state.offer && !this.pc.currentRemoteDescription) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(state.offer));
      console.log('Offer received');
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      console.log('Answer sent');
      await Signaling.setAnswer(this.roomId, {
        type: answer.type,
        sdp: answer.sdp,
      });
    }

    for (const candidate of state.hostCandidates ?? []) {
      await this.addIceCandidate(candidate);
    }
  }

  private async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) {
      return;
    }

    const candidateKey = JSON.stringify(candidate);
    if (this.addedCandidates.has(candidateKey)) {
      return;
    }

    this.addedCandidates.add(candidateKey);
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('ICE candidate received');
  }
}
