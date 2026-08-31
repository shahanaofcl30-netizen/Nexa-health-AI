import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  private unsubscribers: Unsubscribe[] = [];
  private roomId: string | null = null;
  private role: 'patient' | 'doctor' = 'patient';

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

    console.log(`[WEBRTC] Starting session for room: ${roomId} as role: ${role}`);
    if (this.onConnectionStateChange) this.onConnectionStateChange('Connecting...');

    // 1. Initialize PeerConnection
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // 2. Attach local tracks
    const stream = await this.getMediaStream();
    stream.getTracks().forEach((track) => {
      console.log(`[WEBRTC] Adding local ${track.kind} track`);
      this.pc!.addTrack(track, stream);
    });

    // 3. Listen for remote tracks
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

    // 4. Listen for connection state changes
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

    // 5. Firestore Document References
    const consultationRef = doc(db, 'consultations', roomId);
    const patientCandidatesRef = collection(db, 'consultations', roomId, 'patientCandidates');
    const doctorCandidatesRef = collection(db, 'consultations', roomId, 'doctorCandidates');

    // 6. Handle ICE Candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WEBRTC] Generated ICE candidate for ${role}`);
        const candidateData = event.candidate.toJSON();
        if (role === 'patient') {
          addDoc(patientCandidatesRef, candidateData);
        } else {
          addDoc(doctorCandidatesRef, candidateData);
        }
      }
    };

    // 7. Role Specific Signaling: Patient creates Offer, Doctor creates Answer
    if (role === 'patient') {
      console.log('[WEBRTC] Patient creating initial WebRTC Offer...');
      const offerDescription = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await this.pc.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await setDoc(
        consultationRef,
        {
          ...metadata,
          roomId,
          status: 'waiting_for_doctor',
          offer,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Listen for Doctor's Answer
      const unsubDoc = onSnapshot(consultationRef, (snapshot) => {
        const data = snapshot.data();
        if (this.pc && !this.pc.currentRemoteDescription && data?.answer) {
          console.log('[WEBRTC] Patient received doctor WebRTC answer');
          const answerDescription = new RTCSessionDescription(data.answer);
          this.pc.setRemoteDescription(answerDescription);
        }
      });
      this.unsubscribers.push(unsubDoc);

      // Listen for Doctor's ICE candidates
      const unsubCandidates = onSnapshot(doctorCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            console.log('[WEBRTC] Patient adding doctor ICE candidate');
            this.pc?.addIceCandidate(candidate);
          }
        });
      });
      this.unsubscribers.push(unsubCandidates);
    } else {
      console.log('[WEBRTC] Doctor joining room and waiting for or answering Patient Offer...');

      const handleOffer = async (data: any) => {
        if (data?.offer && !this.pc?.currentRemoteDescription) {
          console.log('[WEBRTC] Doctor received patient offer, creating answer...');
          try {
            await this.pc!.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answerDescription = await this.pc!.createAnswer();
            await this.pc!.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            await updateDoc(consultationRef, {
              answer,
              status: 'in_progress',
              doctorJoinedAt: serverTimestamp(),
            });
            console.log('[WEBRTC] Doctor answer saved to Firestore');
          } catch (e) {
            console.error('[WEBRTC] Error processing offer / answer:', e);
          }
        }
      };

      try {
        const docSnap = await getDoc(consultationRef);
        if (docSnap.exists() && docSnap.data()?.offer) {
          await handleOffer(docSnap.data());
        }
      } catch (e) {
        console.warn('Doc fetch error, continuing with onSnapshot:', e);
      }

      const unsubDoc = onSnapshot(consultationRef, async (snapshot) => {
        const data = snapshot.data();
        if (data?.offer && !this.pc?.currentRemoteDescription) {
          await handleOffer(data);
        }
      });
      this.unsubscribers.push(unsubDoc);

      // Listen for Patient's ICE candidates
      const unsubCandidates = onSnapshot(patientCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            console.log('[WEBRTC] Doctor adding patient ICE candidate');
            this.pc?.addIceCandidate(candidate);
          }
        });
      });
      this.unsubscribers.push(unsubCandidates);
    }

    // 8. In-Call Chat Listener
    const messagesRef = collection(db, 'consultations', roomId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubChat = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as ChatMessage;
          if (this.onChatMessage) {
            this.onChatMessage({ ...data, id: change.doc.id });
          }
        }
      });
    });
    this.unsubscribers.push(unsubChat);
  }

  public async sendMessage(sender: string, text: string): Promise<void> {
    if (!this.roomId || !text.trim()) return;
    const messagesRef = collection(db, 'consultations', this.roomId, 'messages');
    await addDoc(messagesRef, {
      sender,
      senderRole: this.role,
      text: text.trim(),
      timestamp: new Date().toISOString(),
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
    if (this.roomId) {
      try {
        const consultationRef = doc(db, 'consultations', this.roomId);
        await updateDoc(consultationRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Error updating end status in Firestore:', e);
      }
    }

    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

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
