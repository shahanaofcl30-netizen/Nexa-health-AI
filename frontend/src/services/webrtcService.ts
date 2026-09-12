import { io, Socket } from 'socket.io-client';

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export interface ChatMessage {
  id?: string;
  sender: string;
  senderRole: 'patient' | 'doctor';
  text: string;
  timestamp: string;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string | null = null;
  private role: 'patient' | 'doctor' = 'patient';
  private socket: Socket | null = null;
  private userId: string = '';

  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: string) => void;
  public onChatMessage?: (msg: ChatMessage) => void;

  public async getMediaStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    console.log('[WEBRTC] Requesting camera and microphone...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.localStream = stream;
    console.log('[WEBRTC] Local media stream acquired');
    return stream;
  }

  public async startSession(
    roomId: string,
    role: 'patient' | 'doctor',
    metadata: {
      patientId?: string;
      patientName?: string;
      doctorId?: string;
      doctorName?: string;
      appointmentId?: string;
    }
  ): Promise<void> {
    this.roomId = roomId;
    this.role = role;
    this.userId = role === 'patient' ? (metadata.patientId || 'patient') : (metadata.doctorId || 'doctor');

    console.log(`[WEBRTC] Starting session for room: ${roomId} as role: ${role}`);
    if (this.onConnectionStateChange) this.onConnectionStateChange('Connecting to signaling server...');

    // 1. Initialize Socket.IO connection
    // Extract base URL from VITE_API_BASE_URL (removing /api if present)
    let backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://nexa-health-ai-1-ls8m.onrender.com/api';
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }
    
    this.socket = io(backendUrl);

    this.socket.on('connect', () => {
      console.log('[WEBRTC] Connected to signaling server');
      this.socket?.emit('join-room', roomId, this.userId);
    });

    // 2. Initialize PeerConnection
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // 3. Attach local tracks
    const stream = await this.getMediaStream();
    stream.getTracks().forEach((track) => {
      console.log(`[WEBRTC] Adding local ${track.kind} track`);
      this.pc!.addTrack(track, stream);
    });

    // 4. Listen for remote tracks
    this.pc.ontrack = (event) => {
      console.log('[WEBRTC] Remote track received:', event.streams);
      if (this.remoteStream) {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream!.addTrack(track);
        });
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('Connected');
      }
    };

    // 5. Listen for connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState || 'new';
      console.log(`[WEBRTC] RTCPeerConnection state: ${state}`);
      if (state === 'connected') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Connected');
      } else if (state === 'disconnected') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Disconnected');
      } else if (state === 'failed') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Connection failed. Reconnecting...');
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState || 'new';
      console.log(`[WEBRTC] ICE connection state: ${state}`);
      if (state === 'connected' || state === 'completed') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Connected');
      } else if (state === 'disconnected') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Disconnected');
      } else if (state === 'failed') {
        if (this.onConnectionStateChange) this.onConnectionStateChange('Connection failed');
      }
    };

    // 6. Handle ICE Candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WEBRTC] Generated ICE candidate for ${role}`);
        this.socket?.emit('signal-candidate', {
          roomId,
          candidate: event.candidate.toJSON(),
          senderId: this.userId,
        });
      }
    };

    // 7. Socket.IO Listeners for Signaling
    this.socket.on('signal-offer', async (data: { roomId: string; sdp: any; senderId: string }) => {
      console.log('[WEBRTC] Received offer from', data.senderId);
      if (data.senderId === this.userId) return; // Ignore own messages
      
      try {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answerDescription = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answerDescription);

        this.socket?.emit('signal-answer', {
          roomId,
          sdp: answerDescription,
          senderId: this.userId,
        });
      } catch (e) {
        console.error('[WEBRTC] Error processing offer:', e);
      }
    });

    this.socket.on('signal-answer', async (data: { roomId: string; sdp: any; senderId: string }) => {
      console.log('[WEBRTC] Received answer from', data.senderId);
      if (data.senderId === this.userId) return;
      
      try {
        if (!this.pc!.currentRemoteDescription) {
          await this.pc!.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } catch (e) {
        console.error('[WEBRTC] Error processing answer:', e);
      }
    });

    this.socket.on('signal-candidate', async (data: { roomId: string; candidate: any; senderId: string }) => {
      console.log('[WEBRTC] Received ICE candidate from', data.senderId);
      if (data.senderId === this.userId) return;

      try {
        if (data.candidate) {
          await this.pc!.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.error('[WEBRTC] Error processing ICE candidate:', e);
      }
    });

    // 8. In-Call Chat Listener
    this.socket.on('telehealth-chat', (message: ChatMessage) => {
      // Don't echo own messages again, we already showed them optimistically
      if (message.senderRole !== this.role || message.sender !== (role === 'patient' ? metadata.patientName : metadata.doctorName)) {
         if (this.onChatMessage) {
           this.onChatMessage(message);
         }
      }
    });

    // 9. When another user joins, the person already in the room creates the offer
    this.socket.on('user-joined', async (data: { userId: string, socketId: string }) => {
      console.log('[WEBRTC] User joined room:', data.userId);
      try {
        const offerDescription = await this.pc!.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await this.pc!.setLocalDescription(offerDescription);

        this.socket?.emit('signal-offer', {
          roomId,
          sdp: offerDescription,
          senderId: this.userId,
        });
      } catch (e) {
        console.error('[WEBRTC] Error creating offer:', e);
      }
    });
  }

  public async sendMessage(sender: string, text: string): Promise<void> {
    if (!this.roomId || !text.trim() || !this.socket) return;
    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      senderRole: this.role,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Optimistically show locally
    if (this.onChatMessage) {
      this.onChatMessage(message);
    }

    this.socket.emit('telehealth-chat', {
      roomId: this.roomId,
      message,
    });
  }

  public toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = enabled !== undefined ? enabled : !track.enabled;
      return track.enabled;
    }
    return false;
  }

  public toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = enabled !== undefined ? enabled : !track.enabled;
      return track.enabled;
    }
    return false;
  }

  public async endSession(): Promise<void> {
    console.log('[WEBRTC] Ending telehealth session and cleaning up listeners...');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
