import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  User,
  ShieldCheck,
  FileText,
  AlertCircle,
  Pill,
} from 'lucide-react';
import api from '../../services/api';

interface MedAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const MedAIAssistantModal: React.FC<MedAIAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am **MedAI**, your clinical assistant. How can I help you analyze a patient case, review drug interactions, or interpret clinical notes today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patients, setPatients] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/patients').then((res) => {
        setPatients(res.data);
        if (res.data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(res.data[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.post('/ai/medai-chat', {
        query,
        patientId: selectedPatientId || undefined,
        conversationHistory: messages,
      }, {
        timeout: 30000,
      });

      const responseText = res.data?.response?.trim() || 'I processed your clinical query, but no response was returned. Please try rephrasing.';

      const assistantMsg: Message = {
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      let errorText = 'Unable to connect to MedAI service. Please verify your connection.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorText = 'Request timed out while waiting for Gemini AI response. Please try again.';
      } else if (err.response?.data?.error) {
        errorText = `⚠️ MedAI Notice: ${err.response.data.error}`;
      } else if (err.message) {
        errorText = `⚠️ Error: ${err.message}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: errorText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Summarize patient chronic conditions and active meds',
    'Are there any contraindications for prescribing NSAIDs?',
    'Explain the mild HDL deficit in plain language for the patient',
    'Draft a 3-day post-visit follow-up questionnaire',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl h-[650px] bg-white rounded-2xl border border-secondary flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-secondary bg-[#FFFDEB] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">MedAI Healthcare Assistant</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Context-Aware Clinical Assistant Powered by Gemini</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Patient Context Select */}
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="text-xs bg-white border border-secondary text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-primary font-medium"
            >
              <option value="">No Patient Context</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  Context: {p.firstName} {p.lastName} ({p.mrn})
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-secondary/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Clinical Safety Policy:</strong> MedAI provides assistive medical reference. Not a substitute for licensed clinical judgment.
          </span>
        </div>

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start space-x-2.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 mt-0.5 font-bold">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium ${
                  msg.sender === 'user'
                    ? 'bg-primary text-slate-950 font-semibold rounded-br-none shadow-sm border border-primary/30'
                    : 'bg-white border border-secondary text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <span
                  className={`text-[9px] block mt-1.5 ${
                    msg.sender === 'user' ? 'text-slate-800/80 font-mono' : 'text-slate-400 font-mono'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-secondary flex items-center justify-center text-slate-700 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-primary font-bold bg-white border border-secondary rounded-xl px-3 py-2 w-fit shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>MedAI is analyzing medical context and generating response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-2 bg-[#FFFDEB] border-t border-secondary flex items-center space-x-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-600 font-bold flex-shrink-0">Suggestions:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white hover:bg-secondary/30 border border-secondary text-slate-700 font-medium transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-secondary bg-white flex items-center space-x-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask MedAI about clinical guidelines, patient history, drug interactions..."
            className="flex-1 text-xs bg-white border border-secondary text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || loading}
            className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
