"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, MicOff, Upload, CheckCircle, ArrowRight, Volume2 } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Message {
  role: "agent" | "candidate";
  content: string;
  timestamp: Date;
}

const AGENT_CONFIG = {
  ava: { name: "Ava Chen", title: "Head of Human Resources", initials: "AVA", color: "violet", glow: "#7C3AED", modelStr: "ava" },
  developer: { name: "Leo", title: "Lead Developer", initials: "DEV", color: "blue", glow: "#3B82F6", modelStr: "developer" },
  marketing: { name: "Chloe", title: "Chief Marketing Officer", initials: "MKT", color: "pink", glow: "#EC4899", modelStr: "marketing" },
  accountant: { name: "Miles", title: "Lead Accountant", initials: "ACC", color: "yellow", glow: "#EAB308", modelStr: "accountant" },
  orion: { name: "Orion", title: "Chief Technology Officer", initials: "ORI", color: "cyan", glow: "#06B6D4", modelStr: "orion" },
  nova: { name: "Nova", title: "Chief Financial Officer", initials: "NOV", color: "emerald", glow: "#10B981", modelStr: "nova" },
  atlas: { name: "Atlas", title: "Chief Executive Officer", initials: "ATL", color: "amber", glow: "#F59E0B", modelStr: "atlas" }
};

type AvaStatus = "idle" | "speaking" | "listening" | "analyzing" | "complete";

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent") || "ava";
  const config = AGENT_CONFIG[agentId as keyof typeof AGENT_CONFIG] || AGENT_CONFIG.ava;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [avaStatus, setAvaStatus] = useState<AvaStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [exchangeCount, setExchangeCount] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [cvFileName, setCvFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const addMessage = useCallback((role: "agent" | "candidate", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    // Prefer a female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("karen") ||
      v.name.toLowerCase().includes("victoria") ||
      (v.name.toLowerCase().includes("google") && v.name.toLowerCase().includes("us"))
    );
    if (preferred) utterance.voice = preferred;
    setAvaStatus("speaking");
    utterance.onend = () => setAvaStatus("listening");
    utterance.onerror = () => setAvaStatus("idle");
    (window as any).currentUtterance = utterance; // Prevent garbage collection bug in Chrome
    window.speechSynthesis.speak(utterance);
  }, []);

  // Load voices when available
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices();
      window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
    }
  }, []);

  // Auto-start if transferred from another agent
  useEffect(() => {
    const sId = searchParams.get("session_id");
    const cName = searchParams.get("name");
    if (sId && cName && !nameSubmitted) {
      const decodedName = decodeURIComponent(cName);
      setSessionId(sId);
      setCandidateName(decodedName);
      setNameSubmitted(true);
      startInterview(decodedName, sId);
    }
  }, [searchParams]);

  const startInterview = async (nameArg?: string | any, sidArg?: string | null | any) => {
    const nameToUse = typeof nameArg === 'string' ? nameArg : candidateName;
    const sidToUse = typeof sidArg === 'string' ? sidArg : sessionId;
    
    if (!nameToUse.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_name: nameToUse, role: "Software Engineer", agent_id: agentId, session_id: sidToUse }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start interview");
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setNameSubmitted(true);
      addMessage("agent", data.welcome_message);
      speakText(data.welcome_message);
    } catch (e: any) {
      setError(e.message || "Failed to connect to backend. Make sure the server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCVUpload = async (file: File) => {
    if (!sessionId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);
    try {
      const res = await fetch(`${BACKEND}/interview/upload-cv`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("CV upload failed");
      setCvFileName(file.name);
      setCvUploaded(true);
      const ackMsg = `Thank you for sharing your CV — I've reviewed your background and will tailor my questions accordingly.`;
      addMessage("agent", ackMsg);
      speakText(ackMsg);
    } catch (e) {
      setCvUploaded(false);
      setError("CV upload failed. You can continue without it.");
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !sessionId || interviewComplete) return;
    addMessage("candidate", text);
    setTextInput("");
    setAvaStatus("analyzing");
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND}/interview/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_message: text, agent_id: agentId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Message failed");
      }
      const data = await res.json();
      setExchangeCount(data.exchange_count);
      addMessage("agent", data.ava_response);
      speakText(data.ava_response);

      if (data.interview_complete) {
        setInterviewComplete(true);
        setAvaStatus("complete");
        // Store session data
        localStorage.setItem("synapse_session_id", sessionId);
        localStorage.setItem("synapse_candidate_name", candidateName);
        
        // Define sequence
        const sequence = ["ava", "developer", "marketing", "accountant", "orion", "nova", "atlas"];
        const currentIndex = sequence.indexOf(agentId);
        const nextAgent = currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;

        setTimeout(() => {
          if (data.passed === false) {
            router.push(`/dashboard?session_id=${sessionId}&name=${encodeURIComponent(candidateName)}&rejected_by=${agentId}`);
          } else if (nextAgent) {
            // Hard reload the page with new agent to reset state cleanly
            window.location.href = `/interview?agent=${nextAgent}&session_id=${sessionId}&name=${encodeURIComponent(candidateName)}`;
          } else {
            router.push(`/dashboard?session_id=${sessionId}&name=${encodeURIComponent(candidateName)}`);
          }
        }, 3000);
      }
    } catch (e: any) {
      setError(e.message);
      setAvaStatus("listening");
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceCapture = async () => {
    setError(null);
    try {
      // Explicitly request microphone permission first to avoid recognition errors
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Volume visualizer setup
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      source.connect(analyser);
      analyser.fftSize = 256;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        setVolumeLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsRecording(true);
          setAvaStatus("listening");
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join(" ");
          setTextInput(transcript);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.onerror = (e: any) => {
          if (e.error === "no-speech") return;
          setIsRecording(false);
          setError(`Microphone error: ${e.error}. Use the text input below.`);
        };

        recognition.start();
      } else {
        setError("Voice not supported in this browser. Please use the text input.");
      }
    } catch (e) {
      setError("Microphone access denied or unavailable. Use the text input below.");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceCaptureAndSend();
    } else {
      setTextInput(""); // Clear previous text before starting
      startVoiceCapture();
    }
  };

  const stopVoiceCaptureAndSend = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    audioContextRef.current?.close();
    setVolumeLevel(0);
    
    // Send the message using the latest textInput state!
    if (textInput.trim()) {
      sendMessage(textInput);
    }
  };

  const getStatusText = () => {
    if (interviewComplete) return "● Interview Complete";
    switch (avaStatus) {
      case "speaking": return "● Speaking...";
      case "listening": return "● Listening...";
      case "analyzing": return "● Analyzing...";
      default: return "○ Ready";
    }
  };

  const getStatusColor = () => {
    switch (avaStatus) {
      case "speaking": return `text-${config.color}-400`;
      case "listening": return "text-emerald-400";
      case "analyzing": return "text-amber-400";
      case "complete": return "text-cyan-400";
      default: return "text-[#94A3B8]";
    }
  };

  // Name entry screen
  if (!nameSubmitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] grid-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#12121A] border border-[#1E1E2E] rounded-3xl p-10 max-w-md w-full text-center"
        >
          <div className={`w-20 h-20 rounded-2xl bg-${config.color}-500/10 border border-${config.color}-500/30 flex items-center justify-center font-heading font-bold text-2xl text-${config.color}-400 mx-auto mb-6`}>
            {config.initials}
          </div>
          <h1 className="font-heading font-bold text-2xl text-[#F8FAFC] mb-2">
            Ready to Meet {config.name}?
          </h1>
          <p className="text-[#94A3B8] text-sm mb-8">
            {config.name}, {config.title} at Synapse Corp, will conduct your interview. Tell {config.initials === "AVA" ? "her" : "them"} your name to begin.
          </p>
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}
          <input
            id="candidate-name-input"
            type="text"
            placeholder="Your full name..."
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && startInterview()}
            className="w-full bg-[#1E1E2E] text-[#F8FAFC] rounded-xl px-4 py-3 border border-[#2E2E3E] focus:border-violet-500 outline-none mb-4 text-sm"
          />
          <motion.button
            id="start-interview-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startInterview}
            disabled={isLoading || !candidateName.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting to {config.name}...
              </>
            ) : (
              <>
                Begin Interview <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-[#1E1E2E] flex items-center px-6 gap-4">
        <span className="text-violet-400 font-heading font-bold text-sm">⟡ SYNAPSE CORP AI</span>
        <div className="h-4 w-px bg-[#1E1E2E]" />
        <span className="text-[#94A3B8] text-xs">Interview Room</span>
        <div className="h-4 w-px bg-[#1E1E2E]" />
        <span className="text-[#94A3B8] text-xs">Candidate: <span className="text-[#F8FAFC]">{candidateName}</span></span>
        <div className="ml-auto flex items-center gap-4 text-xs text-[#94A3B8]">
          <span className="font-semibold text-[#F8FAFC]">Round {["ava", "developer", "marketing", "accountant", "orion", "nova", "atlas"].indexOf(agentId) + 1} of 7</span>
          <div className="h-4 w-px bg-[#1E1E2E]" />
          Question {Math.min(exchangeCount + 1, 2)} of 2
          <div className="w-24 h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
              className={`h-full bg-${config.color}-500 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min((exchangeCount / 2) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Ava Panel */}
        <div className="w-2/5 border-r border-[#1E1E2E] flex flex-col items-center justify-center p-8 gap-6 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
          </div>

          {/* Avatar */}
          <div className="relative z-10">
            <motion.div
              animate={avaStatus === "speaking" ? {
                boxShadow: [`0 0 0 0 ${config.glow}99`, `0 0 0 20px ${config.glow}00`, `0 0 0 0 ${config.glow}00`],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`w-28 h-28 rounded-full bg-${config.color}-500/20 border-2 border-${config.color}-500/60 flex items-center justify-center font-heading font-bold text-3xl text-${config.color}-400`}
            >
              {config.initials}
            </motion.div>
            {/* Outer ring when speaking */}
            {avaStatus === "speaking" && (
              <motion.div
                className={`absolute inset-0 rounded-full border-2 border-${config.color}-400/30`}
                animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Identity */}
          <div className="text-center z-10">
            <h2 className="font-heading font-bold text-xl text-[#F8FAFC]">{config.name}</h2>
            <p className="text-[#94A3B8] text-sm">{config.title}</p>
            <p className={`text-xs mt-2 font-medium transition-colors ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>

          {/* Waveform */}
          <div className={`flex items-center gap-1 h-8 z-10 ${avaStatus === "speaking" ? "opacity-100" : "opacity-20"}`}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`waveform-bar bg-${config.color}-500`}
                style={{ animationDelay: `${i * 0.1}s`, animationPlayState: avaStatus === "speaking" ? "running" : "paused" }}
              />
            ))}
          </div>

          {/* CV Upload */}
          <div className="w-full z-10">
            {!cvUploaded ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#2E2E3E] hover:border-violet-500/50 rounded-xl p-4 text-center cursor-pointer transition-all group"
              >
                <Upload className="w-5 h-5 text-[#94A3B8] group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
                <p className="text-xs text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors">
                  Drop your CV here or click to upload
                </p>
                <p className="text-[10px] text-[#94A3B8]/50 mt-1">PDF supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleCVUpload(e.target.files[0])}
                />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-400 font-medium">CV Parsed</p>
                  <p className="text-[10px] text-[#94A3B8]">{cvFileName}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT: Interview Interface */}
        <div className="flex-1 flex flex-col">
          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "agent"
                        ? `bg-${config.color}-600/20 border border-${config.color}-500/30 text-[#F8FAFC] rounded-tl-none`
                        : "bg-[#1E1E2E] border border-[#2E2E3E] text-[#F8FAFC] rounded-tr-none"
                    }`}
                  >
                    <div className={`text-[10px] mb-1 ${msg.role === "agent" ? `text-${config.color}-400` : "text-[#94A3B8]"}`}>
                      {msg.role === "agent" ? config.initials : candidateName}
                    </div>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && avaStatus === "analyzing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className={`bg-${config.color}-600/20 border border-${config.color}-500/30 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2`}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </motion.div>
            )}

            {interviewComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-semibold text-sm">Interview Complete</p>
                  <p className="text-[#94A3B8] text-xs mt-1">Redirecting to evaluation dashboard...</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Voice Controls */}
          {!interviewComplete && (
            <div className="p-6 border-t border-[#1E1E2E] space-y-4">
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Mic + Volume */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  id="mic-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseDown={undefined}
                  onMouseUp={undefined}
                  onTouchStart={undefined}
                  onTouchEnd={undefined}
                  onClick={toggleRecording}
                  disabled={isLoading}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-violet-600 border-violet-400 mic-active"
                      : "bg-[#1E1E2E] border-[#2E2E3E] hover:border-violet-500/50"
                  }`}
                >
                  {isRecording ? (
                    <Mic className="w-6 h-6 text-white" />
                  ) : (
                    <MicOff className="w-6 h-6 text-[#94A3B8]" />
                  )}
                </motion.button>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#94A3B8]">
                    {isRecording ? "Listening... Click to send" : "Click to speak"}
                  </span>
                  {isRecording && (
                    <div className="flex items-center gap-1 h-3">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-violet-500 rounded-full transition-all duration-100"
                          style={{ height: `${Math.max(4, volumeLevel * 12 * Math.random())}px` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Text fallback */}
              <div className="flex gap-2">
                <input
                  id="text-answer-input"
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage(textInput)}
                  placeholder="Type your answer here (voice backup mode)..."
                  disabled={isLoading || interviewComplete}
                  className="flex-1 bg-[#1E1E2E] text-[#F8FAFC] rounded-xl px-4 py-3 border border-[#2E2E3E] focus:border-violet-500 outline-none text-sm disabled:opacity-50"
                />
                <motion.button
                  id="send-answer-btn"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(textInput)}
                  disabled={isLoading || !textInput.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl transition-all"
                >
                  <ArrowRight size={16} />
                </motion.button>
              </div>
              <p className="text-[10px] text-[#94A3B8] text-center">
                Press Enter or click → to send · Click mic button to use voice
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
