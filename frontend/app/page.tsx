"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Brain, TrendingUp, Crown } from "lucide-react";

const agents = [
  {
    id: "ava",
    initials: "AVA",
    name: "Ava Chen",
    title: "Head of Human Resources",
    description: "Conducts voice interviews, parses CVs, and evaluates cultural fit with warmth and precision.",
    glow: "#7C3AED",
    glowClass: "glow-violet",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    icon: <Brain size={20} />,
    model: "Gemini 2.0 Flash",
  },
  {
    id: "orion",
    initials: "ORI",
    name: "Orion",
    title: "Chief Technology Officer",
    description: "Assesses technical depth, architecture knowledge, and problem-solving capabilities.",
    glow: "#06B6D4",
    glowClass: "glow-cyan",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    icon: <Zap size={20} />,
    model: "Gemini 2.0 Flash",
  },
  {
    id: "nova",
    initials: "NOV",
    name: "Nova",
    title: "Chief Financial Officer",
    description: "Analyses salary benchmarks, budget impact, and ROI timeline for hiring decisions.",
    glow: "#10B981",
    glowClass: "glow-emerald",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    icon: <TrendingUp size={20} />,
    model: "Featherless AI",
  },
  {
    id: "marketing",
    initials: "MKT",
    name: "Chloe",
    title: "Chief Marketing Officer",
    description: "Evaluates product marketing, brand growth, and user acquisition strategies.",
    glow: "#EC4899",
    glowClass: "glow-pink",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
    icon: <Brain size={20} />,
    model: "Gemini 2.0 Flash",
  },
  {
    id: "developer",
    initials: "DEV",
    name: "Leo",
    title: "Lead Developer",
    description: "Focuses on practical engineering, code quality, and system stability.",
    glow: "#3B82F6",
    glowClass: "glow-blue",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    icon: <Zap size={20} />,
    model: "Gemini 2.0 Flash",
  },
  {
    id: "accountant",
    initials: "ACC",
    name: "Miles",
    title: "Lead Accountant",
    description: "Assesses resource efficiency, cost management, and budget tracking.",
    glow: "#EAB308",
    glowClass: "glow-yellow",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    icon: <TrendingUp size={20} />,
    model: "Gemini 2.0 Flash",
  },
  {
    id: "atlas",
    initials: "ATL",
    name: "Atlas",
    title: "Chief Executive Officer",
    description: "Synthesises all reports and delivers the final hire/no-hire decision with confidence.",
    glow: "#F59E0B",
    glowClass: "glow-amber",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    icon: <Crown size={20} />,
    model: "Gemini 2.0 Flash",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0A0A0F] relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-8 py-6 border-b border-[#1E1E2E]/60">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-violet-400 text-2xl">⟡</span>
            <span className="font-heading font-bold text-xl text-[#F8FAFC]">
              SYNAPSE CORP <span className="text-violet-400">AI</span>
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-[#94A3B8] bg-[#1E1E2E] px-3 py-1.5 rounded-full border border-[#2E2E3E]">
              Milan AI Week 2026
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              4 Agents Online
            </span>
          </motion.div>
        </nav>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-xs text-violet-400 bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/20 mb-8">
              <Zap size={12} />
              <span>AI Agent Olympics Hackathon — $32,000+ Prize Pool</span>
            </div>

            <h1 className="font-heading font-bold text-5xl md:text-7xl text-[#F8FAFC] mb-6 leading-tight">
              The First AI Company
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                That Hires You
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#94A3B8] mb-12 max-w-2xl mx-auto leading-relaxed">
              4 autonomous AI agents. Real-time voice interviews.
              <br />
              Intelligent decisions. Zero human bias.
            </p>

            <motion.button
              id="begin-interview-btn"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(124, 58, 237, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/interview")}
              className="inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white font-heading font-semibold text-lg px-10 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-violet-900/30"
            >
              Begin Your Interview
              <ArrowRight size={20} />
            </motion.button>

            <p className="text-xs text-[#94A3B8] mt-4">
              No signup required · Your session is private · Results in ~5 minutes
            </p>
          </motion.div>
        </section>

        {/* Stats row */}
        <section className="px-8 py-6 border-y border-[#1E1E2E]/60">
          <div className="max-w-4xl mx-auto grid grid-cols-4 gap-6 text-center">
            {[
              { label: "AI Agents", value: "4" },
              { label: "Interview Questions", value: "6" },
              { label: "Evaluation Dimensions", value: "12+" },
              { label: "Decision Time", value: "<30s" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <div className="font-heading font-bold text-3xl text-violet-400">{stat.value}</div>
                <div className="text-xs text-[#94A3B8] mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Agent Cards */}
        <section className="px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-12"
            >
              <h2 className="font-heading font-bold text-3xl text-[#F8FAFC] mb-3">
                Meet Your Interview Panel
              </h2>
              <p className="text-[#94A3B8]">
                Four specialised AI agents, each with distinct expertise, working in concert.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  id={`agent-card-${agent.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.4, duration: 0.5 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  onClick={() => router.push(`/interview?agent=${agent.id}`)}
                  className={`relative rounded-2xl border ${agent.borderColor} bg-[#12121A] p-6 cursor-pointer group overflow-hidden`}
                  style={{
                    boxShadow: `0 0 0px ${agent.glow}`,
                    transition: "box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 25px ${agent.glow}33`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0px ${agent.glow}`;
                  }}
                >
                  {/* Background glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${agent.glow}08, transparent 70%)` }}
                  />

                  {/* Avatar */}
                  <div className="relative mb-4">
                    <div
                      className={`w-14 h-14 rounded-2xl ${agent.bgColor} border ${agent.borderColor} flex items-center justify-center font-heading font-bold text-base`}
                      style={{ color: agent.glow }}
                    >
                      {agent.initials}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#12121A] animate-pulse`} />
                  </div>

                  <h3 className={`font-heading font-semibold text-base ${agent.textColor} mb-0.5`}>
                    {agent.name}
                  </h3>
                  <p className="text-[#94A3B8] text-xs mb-3">{agent.title}</p>

                  <div className={`inline-flex items-center gap-1 text-[10px] ${agent.textColor} ${agent.bgColor} px-2 py-0.5 rounded-full border ${agent.borderColor} mb-3`}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                    ONLINE
                  </div>

                  <p className="text-[#94A3B8] text-xs leading-relaxed mb-4">{agent.description}</p>

                  <div className="text-[10px] text-[#94A3B8]/60 border-t border-[#1E1E2E] pt-3">
                    Powered by{" "}
                    <span style={{ color: agent.glow }} className="font-medium">
                      {agent.model}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-8 py-16 border-t border-[#1E1E2E]/60">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading font-bold text-2xl text-center text-[#F8FAFC] mb-10">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {[
                { step: "01", label: "Upload CV", desc: "Ava reads your resume" },
                { step: "→", label: "", desc: "" },
                { step: "02", label: "Voice Interview", desc: "6 tailored questions" },
                { step: "→", label: "", desc: "" },
                { step: "03", label: "AI Decision", desc: "HR + CTO + CFO + CEO" },
              ].map((item, i) =>
                item.step === "→" ? (
                  <div key={i} className="text-[#94A3B8] text-xl text-center hidden md:block">→</div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i + 0.6 }}
                    className="text-center p-4 rounded-xl bg-[#12121A] border border-[#1E1E2E]"
                  >
                    <div className="font-heading font-bold text-2xl text-violet-400 mb-1">{item.step}</div>
                    <div className="font-semibold text-sm text-[#F8FAFC]">{item.label}</div>
                    <div className="text-xs text-[#94A3B8] mt-1">{item.desc}</div>
                  </motion.div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-[#1E1E2E]/60 text-center">
          <p className="text-xs text-[#94A3B8]">
            ⟡ Synapse Corp AI · Milan AI Week Hackathon 2026 ·{" "}
            <span className="text-violet-400">Built with Gemini + Speechmatics + Featherless AI + Supabase + Vultr</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
