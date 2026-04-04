type DataHandler = (data: string) => void;

export class WebRTCDataConnection {
  private readonly handlers = new Set<DataHandler>();

  constructor(private readonly channel: RTCDataChannel) {
    this.channel.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : String(event.data);
      this.handlers.forEach((handler) => handler(payload));
    };
  }

  send(data: string) {
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

export class P2PConnection {
  readonly pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null = null;
  conn: WebRTCDataConnection | null = null;
  onDataConnection?: (conn: WebRTCDataConnection) => void;
  onConnectionOpen?: () => void;
  private readonly addedCandidates = new Set<string>();

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.ondatachannel = (event) => {
      this.attachDataChannel(event.channel);
    };
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.conn = new WebRTCDataConnection(channel);
    this.onDataConnection?.(this.conn);

    channel.onopen = () => {
      this.onConnectionOpen?.();
    };
  }

  private ensureDataChannel() {
    if (!this.dataChannel) {
      this.attachDataChannel(this.pc.createDataChannel('game'));
    }
  }

  async createOffer() {
    this.ensureDataChannel();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return {
      type: offer.type,
      sdp: offer.sdp,
    } satisfies RTCSessionDescriptionInit;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc.currentRemoteDescription) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    }

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return {
      type: answer.type,
      sdp: answer.sdp,
    } satisfies RTCSessionDescriptionInit;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc.currentRemoteDescription) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    const candidateKey = JSON.stringify(candidate);

    if (this.addedCandidates.has(candidateKey)) {
      return;
    }

    this.addedCandidates.add(candidateKey);
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  close() {
    this.dataChannel?.close();
    this.pc.close();
  }
}
