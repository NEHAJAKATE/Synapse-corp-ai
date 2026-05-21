"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, ChevronDown, ChevronUp } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

const agentConfig = {
  ava:   { initials: "AVA", name: "Ava Chen", title: "Head of HR", glow: "#7C3AED", scoreKey: "hr" },
  developer: { initials: "DEV", name: "Leo", title: "Lead Developer", glow: "#3B82F6", scoreKey: "developer" },
  marketing: { initials: "MKT", name: "Chloe", title: "CMO", glow: "#EC4899", scoreKey: "marketing" },
  accountant: { initials: "ACC", name: "Miles", title: "Lead Accountant", glow: "#EAB308", scoreKey: "accountant" },
  orion: { initials: "ORI", name: "Orion", title: "CTO", glow: "#06B6D4", scoreKey: "cto" },
  nova:  { initials: "NOV", name: "Nova", title: "CFO", glow: "#10B981", scoreKey: "cfo" },
  atlas: { initials: "ATL", name: "Atlas", title: "CEO", glow: "#F59E0B", scoreKey: "ceo" },
};

type AgentId = keyof typeof agentConfig;
type AgentStatus = "idle" | "waiting" | "thinking" | "complete";

interface AgentState {
  status: AgentStatus;
  score?: number;
  recommendation?: string;
  summary?: string;
  data?: any;
}

interface InterAgentMessage {
  from: string;
  to: string;
  message: string;
  timestamp: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || localStorage.getItem("synapse_session_id") || "";
  const candidateName = searchParams.get("name") || localStorage.getItem("synapse_candidate_name") || "Candidate";

  const [agents, setAgents] = useState<Record<AgentId, AgentState>>({
    ava: { status: "idle" },
    developer: { status: "waiting" },
    marketing: { status: "waiting" },
    accountant: { status: "waiting" },
    orion: { status: "waiting" },
    nova: { status: "waiting" },
    atlas: { status: "waiting" },
  });

  const [agentMessages, setAgentMessages] = useState<InterAgentMessage[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const [ceoDecision, setCeoDecision] = useState<any>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalResults, setEvalResults] = useState<any>({});

  const wsRef = useRef<WebSocket | null>(null);
  const msgFeedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages feed
  useEffect(() => {
    if (msgFeedRef.current) {
      msgFeedRef.current.scrollTop = msgFeedRef.current.scrollHeight;
    }
  }, [agentMessages]);

  // Connect WebSocket
  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(`${WS_URL}/ws/session/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 25000);
      ws.onclose = () => { clearInterval(ping); setWsConnected(false); };
    };

    ws.onmessage = (evt) => {
      if (evt.data === "pong") return;
      try {
        const event = JSON.parse(evt.data);
        handleWsEvent(event);
      } catch (e) {
        console.warn("Ignored non-JSON ws message:", evt.data);
      }
    };

    ws.onerror = () => setWsConnected(false);

    return () => ws.close();
  }, [sessionId]);

  const handleWsEvent = (event: any) => {
    if (event.type === "agent_thinking") {
      const agentId = event.agent as AgentId;
      setAgents(prev => ({ ...prev, [agentId]: { ...prev[agentId], status: "thinking" } }));
    }

    if (event.type === "agent_complete") {
      const agentId = event.agent as AgentId;
      const data = event.data;
      setAgents(prev => ({
        ...prev,
        [agentId]: {
          status: "complete",
          score: data.score || data.confidence,
          recommendation: data.recommendation || data.decision,
          summary: data.summary || data.reasoning,
          data,
        },
      }));
      setEvalResults((prev: any) => ({ ...prev, [agentId === "ava" ? "hr" : agentId === "orion" ? "cto" : agentId === "nova" ? "cfo" : agentId === "atlas" ? "ceo" : agentId]: data }));
    }

    if (event.type === "inter_agent_message") {
      setAgentMessages(prev => [...prev, {
        from: event.from,
        to: event.to,
        message: event.message,
        timestamp: Date.now(),
      }]);
    }

    if (event.type === "decision_ready") {
      setCeoDecision(event.data);
      setEvaluationComplete(true);
    }
  };

  const runEvaluation = async () => {
    if (!sessionId || isEvaluating) return;
    setIsEvaluating(true);
    setError(null);

    const searchParams = new URLSearchParams(window.location.search);
    const rejectedBy = searchParams.get("rejected_by");

    try {
      // Fetch cached evaluations
      setAgents(prev => ({ ...prev, ava: { ...prev.ava, status: "thinking" } }));
      const evalRes = await fetch(`${BACKEND}/evaluate/run-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!evalRes.ok) throw new Error("Evaluation failed");
      const results = await evalRes.json();
      setEvalResults(results);

      // Mark remaining agents complete if WS didn't fire
      if (results.hr) {
        setAgents(prev => ({
          ...prev,
          ava: { status: "complete", score: results.hr.score, recommendation: results.hr.recommendation, summary: results.hr.summary, data: results.hr },
        }));
      }
      if (results.cto) {
        setAgents(prev => ({
          ...prev,
          orion: { status: "complete", score: results.cto.score, recommendation: results.cto.recommendation, summary: results.cto.summary, data: results.cto },
        }));
      }
      if (results.cfo) {
        setAgents(prev => ({
          ...prev,
          nova: { status: "complete", score: results.cfo.score, recommendation: results.cfo.recommendation, summary: results.cfo.summary, data: results.cfo },
        }));
      }
      if (results.developer) {
        setAgents(prev => ({
          ...prev,
          developer: { status: "complete", score: results.developer.score, recommendation: results.developer.recommendation, summary: results.developer.summary, data: results.developer },
        }));
      }
      if (results.marketing) {
        setAgents(prev => ({
          ...prev,
          marketing: { status: "complete", score: results.marketing.score, recommendation: results.marketing.recommendation, summary: results.marketing.summary, data: results.marketing },
        }));
      }
      if (results.accountant) {
        setAgents(prev => ({
          ...prev,
          accountant: { status: "complete", score: results.accountant.score, recommendation: results.accountant.recommendation, summary: results.accountant.summary, data: results.accountant },
        }));
      }

      // CEO decision - Only run if candidate made it to the end
      if (!rejectedBy) {
        setAgents(prev => ({ ...prev, atlas: { ...prev.atlas, status: "thinking" } }));
        const decisionRes = await fetch(`${BACKEND}/decision/final`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            hr_eval: results.hr,
            cto_eval: results.cto,
            cfo_eval: results.cfo,
            developer_eval: results.developer,
            marketing_eval: results.marketing,
            accountant_eval: results.accountant,
          }),
        });

        if (!decisionRes.ok) throw new Error("CEO decision failed");
        const decision = await decisionRes.json();
        setCeoDecision(decision);
        setAgents(prev => ({
          ...prev,
          atlas: { status: "complete", score: decision.confidence, recommendation: decision.decision, summary: decision.reasoning, data: decision },
        }));
        
        // Store results for the results page
        localStorage.setItem("synapse_eval_results", JSON.stringify({ ...results, ceo: decision }));
      } else {
        // Mark incomplete agents as cancelled
        setAgents(prev => {
          const nextState = { ...prev };
          Object.keys(nextState).forEach(key => {
            if (nextState[key as AgentId].status === "waiting" || nextState[key as AgentId].status === "thinking") {
              nextState[key as AgentId].status = "idle";
            }
          });
          return nextState;
        });
        setError(`Candidate was rejected early during the ${agentConfig[rejectedBy as AgentId]?.title || rejectedBy} interview.`);
      }
      setEvaluationComplete(true);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getDecisionColor = (decision: string) => {
    if (decision === "hired") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (decision === "rejected") return "text-red-400 bg-red-500/10 border-red-500/30";
    return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="border-b border-[#1E1E2E] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-violet-400 font-heading font-bold">⟡ SYNAPSE CORP AI</span>
          <div className="h-4 w-px bg-[#1E1E2E]" />
          <span className="text-[#94A3B8] text-sm">
            Candidate: <span className="text-[#F8FAFC] font-medium">{candidateName}</span>
          </span>
          <div className="h-4 w-px bg-[#1E1E2E]" />
          <span className="text-[#94A3B8] text-xs">
            Session: <span className="text-violet-400 font-mono">{sessionId?.slice(0, 8)}...</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-xs px-2 py-1 rounded-full border ${wsConnected ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-[#94A3B8] border-[#2E2E3E] bg-[#1E1E2E]"}`}>
            {wsConnected ? "● Live" : "○ Connecting..."}
          </div>
        </div>
      </div>
      
      {/* Confidential Banner */}
      <div className="bg-red-500/10 border-b border-red-500/20 px-8 py-2 flex items-center justify-center gap-2">
        <span className="text-red-400 text-[10px] font-mono tracking-widest uppercase font-bold">⚠ Unauthorized Access Prohibited — Internal HR Portal (Confidential Deliberation)</span>
      </div>

      {/* Progress steps */}
      <div className="px-8 py-4 border-b border-[#1E1E2E]/50">
        <div className="flex items-center gap-2 max-w-lg">
          {["Interview", "Evaluation", "Decision"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
                i === 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                i === 1 ? (isEvaluating || evaluationComplete ? "bg-violet-500/10 text-violet-400 border border-violet-500/30" : "text-[#94A3B8] border border-[#2E2E3E]") :
                (evaluationComplete ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-[#94A3B8] border border-[#2E2E3E]")
              }`}>
                <span>{step}</span>
              </div>
              {i < 2 && <div className="w-6 h-px bg-[#2E2E3E]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(Object.keys(agentConfig) as AgentId[]).map((id, idx) => {
            const cfg = agentConfig[id];
            const state = agents[id];
            const isThinking = state.status === "thinking";
            const isComplete = state.status === "complete";
            const isExpanded = expandedCards.has(id);

            return (
              <motion.div
                key={id}
                id={`agent-card-${id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl border bg-[#12121A] p-5 relative overflow-hidden"
                style={{
                  borderColor: isComplete ? `${cfg.glow}44` : isThinking ? `${cfg.glow}66` : "#1E1E2E",
                  boxShadow: isComplete ? `0 0 20px ${cfg.glow}18` : "none",
                }}
              >
                {/* Thinking pulse */}
                {isThinking && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: `1px solid ${cfg.glow}` }}
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-sm"
                    style={{ background: `${cfg.glow}18`, border: `1.5px solid ${cfg.glow}66`, color: cfg.glow }}
                    animate={isThinking ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {cfg.initials}
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-[#F8FAFC] font-semibold text-sm">{cfg.name}</p>
                    <p className="text-[#94A3B8] text-xs">{cfg.title}</p>
                  </div>
                  <div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: isComplete ? `${cfg.glow}18` : isThinking ? `${cfg.glow}18` : "#1E1E2E",
                        color: isComplete ? cfg.glow : isThinking ? cfg.glow : "#94A3B8",
                        border: `1px solid ${isComplete || isThinking ? cfg.glow + "44" : "#2E2E3E"}`,
                      }}
                    >
                      {isComplete ? "● Complete" : isThinking ? "● Working..." : state.status === "waiting" ? "○ Waiting" : "○ Idle"}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                {isComplete && state.score !== undefined && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94A3B8]">
                        {id === "nova" ? "Financial Score" : id === "atlas" ? "CEO Score" : "Evaluation Score"}
                      </span>
                      <span className="text-[#F8FAFC] font-medium">{state.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: cfg.glow }}
                        initial={{ width: 0 }}
                        animate={{ width: `${state.score}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    {state.recommendation && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: cfg.glow }}>
                          {id === "atlas"
                            ? state.recommendation.toUpperCase()
                            : `Rec: ${state.recommendation.replace("_", " ").toUpperCase()}`}
                        </span>
                        <button
                          onClick={() => toggleExpand(id)}
                          className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    )}

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && state.data && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 border-t border-[#1E1E2E] space-y-2">
                            {state.data.strengths && (
                              <div>
                                <span className="text-[10px] text-emerald-400 font-medium">Strengths</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {state.data.strengths.map((s: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {state.data.weaknesses && (
                              <div>
                                <span className="text-[10px] text-red-400 font-medium">Weaknesses</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {state.data.weaknesses.map((w: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">{w}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {state.data.knowledge_gaps && (
                              <div>
                                <span className="text-[10px] text-amber-400 font-medium">Knowledge Gaps</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {state.data.knowledge_gaps.map((g: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{g}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {state.summary && (
                              <p className="text-[10px] text-[#94A3B8] leading-relaxed">{state.summary}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Thinking dots */}
                {isThinking && (
                  <div className="flex items-center gap-2 mt-3">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: cfg.glow }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                    <span className="text-xs text-[#94A3B8]">Analyzing...</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Inter-Agent Message Feed */}
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[#F8FAFC] text-sm">Agent Communication Feed</h3>
            <span className="text-[10px] text-[#94A3B8] bg-[#1E1E2E] px-2 py-1 rounded-full border border-[#2E2E3E]">
              Real-time
            </span>
          </div>
          <div
            ref={msgFeedRef}
            className="space-y-2 max-h-48 overflow-y-auto"
          >
            {agentMessages.length === 0 ? (
              <p className="text-[#94A3B8] text-xs text-center py-6">
                Agent communications will appear here during evaluation...
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {agentMessages.map((msg, i) => {
                  const fromCfg = agentConfig[msg.from as AgentId];
                  const toCfg = agentConfig[msg.to as AgentId];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="font-mono shrink-0" style={{ color: fromCfg?.glow || "#94A3B8" }}>
                        {(fromCfg?.initials || msg.from).toUpperCase()}
                      </span>
                      <span className="text-[#94A3B8]">→</span>
                      <span className="font-mono shrink-0" style={{ color: toCfg?.glow || "#94A3B8" }}>
                        {msg.to === "all" ? "ALL" : (toCfg?.initials || msg.to).toUpperCase()}
                      </span>
                      <span className="text-[#94A3B8] shrink-0">:</span>
                      <span className="text-[#F8FAFC]">{msg.message}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isEvaluating && !evaluationComplete && (
            <motion.button
              id="run-evaluation-btn"
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={runEvaluation}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-heading font-semibold px-8 py-3.5 rounded-xl transition-all"
            >
              <Play size={16} />
              Run Agent Evaluation
            </motion.button>
          )}

          {isEvaluating && (
            <div className="flex items-center gap-3 text-[#94A3B8] text-sm">
              <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              Agents evaluating...
            </div>
          )}

          {evaluationComplete && (
            <motion.button
              id="view-results-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                localStorage.setItem("synapse_eval_results", JSON.stringify(evalResults));
                router.push(`/results?session_id=${sessionId}&name=${encodeURIComponent(candidateName)}`);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold px-8 py-3.5 rounded-xl transition-all"
            >
              View Full Report →
            </motion.button>
          )}
        </div>

        {/* CEO Decision preview */}
        {ceoDecision && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-5 ${getDecisionColor(ceoDecision.decision)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">
                  {ceoDecision.decision === "hired" ? "✓ HIRED" : ceoDecision.decision === "rejected" ? "✗ NOT SELECTED" : "⏸ HOLD"}
                </h3>
                <p className="text-sm mt-1 opacity-80">{ceoDecision.reasoning}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-heading font-bold">{ceoDecision.confidence}%</p>
                <p className="text-xs opacity-60">Confidence</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
