import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export const TelehealthRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room') || 'room-telehealth-diabetes-002';
  const { currentUser, activeRole } = useAuthStore();

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'notes'>('chat');
  const [recordingConsent, setRecordingConsent] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Dr. Sophia Chen', text: 'Hello! Can you hear and see me clearly?', time: '14:02' },
    { sender: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Patient', text: 'Yes Doctor, the connection is great.', time: '14:03' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Live SOAP Notes (Doctor side)
  const [liveNotes, setLiveNotes] = useState({
    subjective: 'Patient reports mild lightheadedness during warm weather; blood glucose logs stable.',
    plan: 'Maintain current Lisinopril 10mg. Check morning fasting glucose.',
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-sm text-white">Telehealth Consultation Room</h2>
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Encrypted WebRTC Session
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Room ID: {roomId}</p>
          </div>
        </div>

        {/* Consent Badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 text-[11px]">Recording Consent:</span>
          <button
            onClick={() => setRecordingConsent(!recordingConsent)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              recordingConsent
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {recordingConsent ? 'Granted ✓' : 'Revoked'}
          </button>
        </div>
      </div>

      {/* Video Call Interface & Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[580px]">
        {/* Main Video Viewport (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 rounded-3xl bg-slate-950 border border-slate-800 relative overflow-hidden shadow-2xl">
          {/* Main Remote Video (Simulated HD Clinical Feed) */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-900 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 to-teal-500 mx-auto flex items-center justify-center text-3xl font-black text-slate-950 border-4 border-slate-800 shadow-glow-cyan">
                {activeRole === 'patient' ? 'SC' : (currentUser?.firstName ? currentUser.firstName?.[0] + (currentUser.lastName ? currentUser.lastName?.[0] : '') : 'PT')}
              </div>
              <div>
                <p className="font-bold text-base text-white">
                  {activeRole === 'patient'
                    ? 'Dr. Sophia Chen (Cardiologist)'
                    : `${currentUser?.firstName || 'Patient'} ${currentUser?.lastName || ''} (Patient)`}
                </p>
                <p className="text-xs text-brand-400 font-mono">HD 1080p • 60 FPS • Encrypted Stream</p>
              </div>
            </div>
          </div>

          {/* Self Video PIP (Picture in Picture) */}
          <div className="w-36 h-28 rounded-2xl bg-slate-900 border-2 border-brand-500/50 shadow-2xl z-10 self-end overflow-hidden flex items-center justify-center relative">
            <div className="text-center">
              <User className="w-6 h-6 text-brand-400 mx-auto" />
              <span className="text-[10px] text-slate-300 font-bold block mt-1">You</span>
            </div>
            {!cameraOn && (
              <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center">
                <CameraOff className="w-4 h-4 text-rose-400" />
              </div>
            )}
          </div>

          {/* Bottom Floating Video Controls */}
          <div className="z-10 flex items-center justify-center space-x-3 pt-4">
            <button
              onClick={() => setMicOn(!micOn)}
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
              onClick={() => setCameraOn(!cameraOn)}
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
              onClick={() => (window.location.href = '/appointments')}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Consultation</span>
            </button>
          </div>
        </div>

        {/* Side Panel: In-Call Chat & Live Encounter Notes (4 cols) */}
        <div className="lg:col-span-4 glass-card rounded-3xl border border-slate-800 flex flex-col overflow-hidden">
          {/* Side Tabs */}
          <div className="flex items-center border-b border-slate-800 p-2 text-xs font-semibold">
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                activeSideTab === 'chat' ? 'bg-brand-500/20 text-brand-300 font-bold' : 'text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>In-Call Chat</span>
            </button>

            <button
              onClick={() => setActiveSideTab('notes')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                activeSideTab === 'notes' ? 'bg-brand-500/20 text-brand-300 font-bold' : 'text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Live Notes</span>
            </button>
          </div>

          {/* Tab 1: Chat Message Thread */}
          {activeSideTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {messages.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">{m.sender}</span>
                      <span className="text-[9px] text-slate-500">{m.time}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="pt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message to participant..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl glass-input text-white focus:outline-none"
                />
                <button type="submit" className="p-2 rounded-xl bg-brand-500 text-slate-950 font-bold">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Live Doctor SOAP Notes Overlay */}
          {activeSideTab === 'notes' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-brand-400">[S] Subjective Findings</label>
                <textarea
                  rows={4}
                  value={liveNotes.subjective}
                  onChange={(e) => setLiveNotes({ ...liveNotes, subjective: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-brand-400">[P] Clinical Plan & Orders</label>
                <textarea
                  rows={4}
                  value={liveNotes.plan}
                  onChange={(e) => setLiveNotes({ ...liveNotes, plan: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={() => alert('Live notes saved to EHR chart!')}
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                Sync to Patient Encounter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
