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
  private hasConnected = false;
  private remoteDescriptionReady = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasRestartedIce = false;
  private lastProcessedOfferSdp: string | null = null;
  private lastProcessedAnswerSdp: string | null = null;
  private sentCandidateCount = 0;
  private receivedCandidateCount = 0;

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
    this.hasConnected = false;
    this.remoteDescriptionReady = false;
    this.pendingCandidates = [];
    this.hasRestartedIce = false;
    this.lastProcessedOfferSdp = null;
    this.lastProcessedAnswerSdp = null;
    this.sentCandidateCount = 0;
    this.receivedCandidateCount = 0;
  }

  close() {
    this.cleanup();
  }

  private createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      iceCandidatePoolSize: 10,
    });

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.notifyConnected();
      } else if (
        this.role === 'host' &&
        this.roomId &&
        !this.hasConnected &&
        !this.hasRestartedIce &&
        (pc.connectionState === 'disconnected' || pc.connectionState === 'failed')
      ) {
        this.hasRestartedIce = true;
        console.log('Restarting ICE negotiation from host');
        void this.restartIceNegotiation();
      } else if (pc.connectionState === 'failed') {
        void this.dumpDiagnostics('peer-connection-failed');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.notifyConnected();
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        void this.dumpDiagnostics(`ice-${pc.iceConnectionState}`);
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };

    pc.onicecandidateerror = (event) => {
      console.error('ICE candidate error:', event);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.roomId && this.role) {
        this.sentCandidateCount += 1;
        console.log('ICE candidate sent:', this.role, this.describeCandidate(event.candidate.toJSON()));
        void Signaling.addIceCandidate(this.roomId, this.role, event.candidate.toJSON()).catch(
          (error) => {
            console.error('Failed to send ICE candidate to Firestore:', error);
          }
        );
      } else if (!event.candidate) {
        console.log('ICE candidate gathering complete');
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
      this.notifyConnected();
    };
  }

  private notifyConnected() {
    if (this.hasConnected) {
      return;
    }

    this.hasConnected = true;
    this.onConnected?.();

    if (this.roomId) {
      void Signaling.markConnected(this.roomId);
    }
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
      if (
        state.answer &&
        state.answer.sdp &&
        state.answer.sdp !== this.lastProcessedAnswerSdp
      ) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(state.answer));
        this.remoteDescriptionReady = true;
        this.lastProcessedAnswerSdp = state.answer.sdp;
        console.log('Answer received');
        await this.flushPendingCandidates();
      }

      for (const candidate of state.joinerCandidates ?? []) {
        await this.addIceCandidate(candidate);
      }
      return;
    }

    if (
      state.offer &&
      state.offer.sdp &&
      state.offer.sdp !== this.lastProcessedOfferSdp
    ) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(state.offer));
      console.log('Offer received');
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.remoteDescriptionReady = true;
      this.lastProcessedOfferSdp = state.offer.sdp;
      console.log('Answer sent');
      await Signaling.setAnswer(this.roomId, {
        type: answer.type,
        sdp: answer.sdp,
      });
      await this.flushPendingCandidates();
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

    if (!this.areDescriptionsReadyForIce()) {
      console.log('ICE candidate queued until remote description is ready');
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      this.addedCandidates.add(candidateKey);
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      this.receivedCandidateCount += 1;
      console.log('ICE candidate received:', this.describeCandidate(candidate));
    } catch (error) {
      this.addedCandidates.delete(candidateKey);
      console.error('Failed to add ICE candidate:', error, candidate);
    }
  }

  private async flushPendingCandidates() {
    if (!this.areDescriptionsReadyForIce() || !this.pendingCandidates.length) {
      return;
    }

    const queuedCandidates = [...this.pendingCandidates];
    this.pendingCandidates = [];

    for (const candidate of queuedCandidates) {
      await this.addIceCandidate(candidate);
    }
  }

  private async restartIceNegotiation() {
    if (!this.pc || !this.roomId || this.role !== 'host') {
      return;
    }

    this.remoteDescriptionReady = false;
    this.pendingCandidates = [];
    const offer = await this.pc.createOffer({ iceRestart: true });
    await this.pc.setLocalDescription(offer);
    console.log('ICE restart offer sent');
    await Signaling.setOffer(this.roomId, {
      type: offer.type,
      sdp: offer.sdp,
    });
  }

  private areDescriptionsReadyForIce() {
    if (!this.pc || !this.remoteDescriptionReady) {
      return false;
    }

    return Boolean(this.pc.localDescription && this.pc.remoteDescription);
  }

  private describeCandidate(candidate: RTCIceCandidateInit) {
    const candidateLine = candidate.candidate ?? '';
    const typeMatch = candidateLine.match(/\btyp\s+(\w+)/);
    return typeMatch?.[1] ?? 'unknown';
  }

  private async dumpDiagnostics(reason: string) {
    if (!this.pc) {
      return;
    }

    try {
      const stats = await this.pc.getStats();
      const report = {
        reason,
        role: this.role,
        roomId: this.roomId,
        signalingState: this.pc.signalingState,
        connectionState: this.pc.connectionState,
        iceConnectionState: this.pc.iceConnectionState,
        iceGatheringState: this.pc.iceGatheringState,
        sentCandidates: this.sentCandidateCount,
        receivedCandidates: this.receivedCandidateCount,
        localDescriptionType: this.pc.localDescription?.type ?? null,
        remoteDescriptionType: this.pc.remoteDescription?.type ?? null,
        selectedCandidatePair: null as null | Record<string, unknown>,
      };

      for (const stat of stats.values()) {
        if (
          stat.type === 'candidate-pair' &&
          'state' in stat &&
          'localCandidateId' in stat &&
          (stat.selected || stat.nominated || stat.state === 'succeeded')
        ) {
          report.selectedCandidatePair = {
            state: stat.state,
            nominated: 'nominated' in stat ? stat.nominated : undefined,
            selected: 'selected' in stat ? stat.selected : undefined,
            localCandidateId: stat.localCandidateId,
            remoteCandidateId: 'remoteCandidateId' in stat ? stat.remoteCandidateId : undefined,
            currentRoundTripTime:
              'currentRoundTripTime' in stat ? stat.currentRoundTripTime : undefined,
          };
          break;
        }
      }

      console.log('WebRTC diagnostics:', report);
    } catch (error) {
      console.error('Failed to collect WebRTC diagnostics:', error);
    }
  }
}
