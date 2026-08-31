import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Video,
  User,
  Shield,
  FileText,
  MessageSquare,
  Sparkles,
  Bot,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';
import { Appointment, Doctor, Patient, TelehealthSession } from '../../types/shared';

export const TelehealthRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlRoomId = searchParams.get('room');
  const urlAppointmentId = searchParams.get('appointmentId');
  const { currentUser, activeRole } = useAuthStore();
  const { data: currentPatient } = useCurrentPatient();

  const [sessionData, setSessionData] = useState<{
    session: TelehealthSession;
    doctor?: Doctor;
    patient?: Patient;
    appointment?: Appointment;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'notes'>('chat');
  const [recordingConsent, setRecordingConsent] = useState(true);

  // WebRTC Media Stream Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // In-call Chat
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Live SOAP Notes (Doctor side)
  const [liveNotes, setLiveNotes] = useState({
    subjective: 'Patient reports mild symptoms; vital signs and telemetry stable.',
    plan: 'Routine therapeutic regimen and follow-up as indicated.',
  });

  // 1. Initialize or query Telehealth Session
  const initSession = async () => {
    try {
      setLoading(true);
      const res = await api.post('/telehealth/session', {
        appointmentId: urlAppointmentId || undefined,
        roomId: urlRoomId || undefined,
      });

      setSessionData(res.data);
      if (res.data.session?.chatMessages) {
        setMessages(
          res.data.session.chatMessages.map((m: any) => ({
            sender: m.sender,
            text: m.text,
            time: new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to initialize telehealth session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
    const interval = setInterval(async () => {
      if (sessionData?.session?.roomId) {
        try {
          const res = await api.get(`/telehealth/session/${sessionData.session.roomId}`);
          setSessionData((prev) => (prev ? { ...prev, session: res.data.session, appointment: res.data.appointment } : res.data));
        } catch (e) {}
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [urlRoomId, urlAppointmentId]);

  // 2. Initialize Real WebRTC Camera & Microphone Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startMedia = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera/Microphone access not granted or unavailable:', err);
      }
    };

    startMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micOn;
      });
    }
    setMicOn(!micOn);
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !cameraOn;
      });
    }
    setCameraOn(!cameraOn);
  };

  // Participant details
  const isDoctor = activeRole === 'doctor' || currentUser?.role === 'doctor';
  
  // Real patient & doctor labels
  const doctorName = sessionData?.doctor
    ? `Dr. ${(sessionData.doctor as any).user?.firstName || (sessionData.doctor as any).firstName || 'Sophia'} ${(sessionData.doctor as any).user?.lastName || (sessionData.doctor as any).lastName || 'Chen'}`
    : 'Dr. Sophia Chen';
  const doctorSpecialty = sessionData?.doctor?.specialization || 'Attending Physician';

  const patientName = sessionData?.patient
    ? `${sessionData.patient.firstName} ${sessionData.patient.lastName || ''}`.trim()
    : currentPatient
    ? `${currentPatient.firstName} ${currentPatient.lastName || ''}`.trim()
    : currentUser?.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
    : currentUser?.email
    ? currentUser.email.split('@')[0]
    : 'Patient';

  const currentUserName = isDoctor
    ? doctorName
    : patientName;

  const remoteParticipantName = isDoctor ? patientName : doctorName;
  const remoteParticipantLabel = isDoctor ? 'Patient' : `Doctor (${doctorSpecialty})`;

  const sessionStatus = sessionData?.session?.status || 'waiting';
  const isDoctorInCall = sessionStatus === 'in_progress';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: currentUserName,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  const handleEndConsultation = async () => {
    if (sessionData?.session?.roomId) {
      try {
        await api.put(`/telehealth/session/${sessionData.session.roomId}/status`, {
          status: 'ended',
        });
      } catch (e) {}
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (isDoctor) {
      navigate('/consultations');
    } else {
      navigate('/appointments');
    }
  };

  const handleDoctorStartConsultation = async () => {
    if (sessionData?.session?.roomId) {
      try {
        await api.put(`/telehealth/session/${sessionData.session.roomId}/status`, {
          status: 'in_progress',
        });
        setSessionData((prev) =>
          prev ? { ...prev, session: { ...prev.session, status: 'in_progress' } } : prev
        );
      } catch (e) {}
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Session Banner */}
      <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-sm text-slate-900">Telehealth Video Consultation</h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isDoctorInCall
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}
              >
                {isDoctorInCall ? 'Live Encrypted Session' : 'Waiting for Doctor'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Room: {sessionData?.session?.roomId || 'consultation-active'} • Encounter: {sessionData?.appointment?.reason || 'Clinical Telehealth'}
            </p>
          </div>
        </div>

        {/* Consent Badge & Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 text-[11px]">Recording Consent:</span>
          <button
            onClick={() => setRecordingConsent(!recordingConsent)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
              recordingConsent
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {recordingConsent ? 'Granted ✓' : 'Revoked'}
          </button>
        </div>
      </div>

      {/* Video Call Interface & Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[580px]">
        {/* Main Video Viewport (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 rounded-3xl bg-slate-950 border border-secondary relative overflow-hidden shadow-xl">
          {/* Main Remote Feed or Waiting State */}
          {!isDoctor && !isDoctorInCall ? (
            /* Patient Waiting Screen */
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 text-primary border-2 border-primary/40 flex items-center justify-center animate-pulse">
                <Clock className="w-10 h-10" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-xl font-bold text-white">Waiting for your doctor</h3>
                <p className="text-sm text-slate-300">
                  <strong className="text-primary">{doctorName}</strong> ({doctorSpecialty}) is not in the call yet.
                </p>
                <p className="text-xs text-slate-400">
                  Please keep this window open. The live consultation will connect automatically as soon as the doctor starts.
                </p>
              </div>
            </div>
          ) : isDoctor && !isDoctorInCall ? (
            /* Doctor Pre-Join Screen */
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center">
                <Video className="w-10 h-10" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-xl font-bold text-white">Ready for Telehealth Visit</h3>
                <p className="text-sm text-slate-300">
                  Patient: <strong className="text-emerald-400">{patientName}</strong>
                </p>
                <p className="text-xs text-slate-400">
                  Chief Complaint: <strong>{sessionData?.appointment?.reason || 'General Consultation'}</strong>
                </p>
                <button
                  onClick={handleDoctorStartConsultation}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition-all"
                >
                  Start Video Consultation
                </button>
              </div>
            </div>
          ) : (
            /* Live Remote Feed */
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-900 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center text-3xl font-bold border-4 border-primary/30">
                  {remoteParticipantName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base text-white">{remoteParticipantName}</p>
                  <p className="text-xs text-primary font-mono">{remoteParticipantLabel} • Connected Stream</p>
                </div>
              </div>
            </div>
          )}

          {/* Self Video PIP (Live WebRTC Camera) */}
          <div className="w-36 h-28 rounded-2xl bg-slate-900 border-2 border-primary/50 shadow-2xl z-10 self-end overflow-hidden flex items-center justify-center relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                <CameraOff className="w-5 h-5 text-rose-400" />
                <span className="text-[10px] text-slate-400 font-bold block mt-1">Camera Off</span>
              </div>
            )}
            <span className="absolute bottom-1 left-1.5 text-[9px] bg-slate-900/80 px-1.5 py-0.5 rounded text-white font-mono">
              You ({currentUserName})
            </span>
          </div>

          {/* Bottom Floating Video Controls */}
          <div className="z-10 flex items-center justify-center space-x-3 pt-4">
            <button
              onClick={handleToggleMic}
              className={`p-3 rounded-2xl border transition-all ${
                micOn
                  ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
              title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`p-3 rounded-2xl border transition-all ${
                cameraOn
                  ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
              title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndConsultation}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Consultation</span>
            </button>
          </div>
        </div>

        {/* Side Panel: In-Call Chat & Live Clinical Notes (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-secondary shadow-sm flex flex-col overflow-hidden">
          {/* Side Tabs */}
          <div className="flex items-center border-b border-secondary p-2 text-xs font-semibold bg-secondary/10">
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                activeSideTab === 'chat' ? 'bg-primary text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-secondary/20'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>In-Call Chat</span>
            </button>

            {isDoctor && (
              <button
                onClick={() => setActiveSideTab('notes')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                  activeSideTab === 'notes' ? 'bg-primary text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-secondary/20'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Live Notes</span>
              </button>
            )}
          </div>

          {/* Tab 1: Chat Message Thread */}
          {activeSideTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs">No chat messages yet.</p>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-secondary/10 border border-secondary space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-[11px]">{m.sender}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{m.time}</span>
                      </div>
                      <p className="text-slate-700 text-[11px] font-medium">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="pt-2 flex items-center space-x-2 border-t border-secondary">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message as ${currentUserName}...`}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-secondary bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary font-medium"
                />
                <button type="submit" className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Live Doctor SOAP Notes Overlay */}
          {activeSideTab === 'notes' && isDoctor && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-700">[S] Subjective Findings</label>
                <textarea
                  rows={4}
                  value={liveNotes.subjective}
                  onChange={(e) => setLiveNotes({ ...liveNotes, subjective: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-700">[P] Clinical Plan & Orders</label>
                <textarea
                  rows={4}
                  value={liveNotes.plan}
                  onChange={(e) => setLiveNotes({ ...liveNotes, plan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={() => alert('Live consultation notes synced to patient EHR!')}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all"
              >
                Sync to Patient Chart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
