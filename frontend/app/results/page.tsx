"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, Download, RefreshCw } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || localStorage.getItem("synapse_session_id") || "";
  const candidateName = searchParams.get("name") || localStorage.getItem("synapse_candidate_name") || "Candidate";

  const [results, setResults] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [internalView, setInternalView] = useState(false);

  useEffect(() => {
    // Load from localStorage first
    const stored = localStorage.getItem("synapse_eval_results");
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch {}
    }
    // Also try to fetch from backend
    if (sessionId) {
      fetch(`${BACKEND}/decision/report/${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data && !data.detail) setResults(prev => ({ ...prev, ...data }));
        })
        .catch(() => {});
    }
  }, [sessionId]);

  const ceo = results?.ceo || results?.atlas;
  const hr = results?.hr || results?.ava;
  const cto = results?.cto || results?.orion;
  const cfo = results?.cfo || results?.nova;
  const dev = results?.developer;
  const mkt = results?.marketing;
  const acc = results?.accountant;

  const decision = ceo?.decision || "hold";
  const isHired = decision === "hired";
  const isRejected = decision === "rejected";

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const date = new Date().toLocaleString();

      let currentY = 0;

      const addHeader = () => {
        doc.setFillColor(10, 10, 15);
        doc.rect(0, 0, 210, 40, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("SYNAPSE CORP AI", 15, 18);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184); // #94A3B8
        doc.text("Autonomous Hiring Intelligence Platform", 15, 27);
        doc.setFontSize(9);
        doc.text(`Report Generated: ${date}`, 15, 34);
      };

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 280) {
          doc.addPage();
          addHeader();
          currentY = 55;
          doc.setTextColor(0, 0, 0);
        }
      };

      const writeWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * (fontSize * 0.45); // Approximate line height
      };

      addHeader();
      currentY = 55;

      // Candidate Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Candidate Evaluation Report", 15, currentY); currentY += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Candidate Name: ${candidateName}`, 15, currentY); currentY += 7;
      doc.text(`Position: Software Engineer`, 15, currentY); currentY += 7;
      doc.text(`Session ID: ${sessionId}`, 15, currentY); currentY += 10;

      // Decision banner
      const decisionColor = isHired ? [16, 185, 129] : isRejected ? [239, 68, 68] : [245, 158, 11];
      doc.setFillColor(decisionColor[0], decisionColor[1], decisionColor[2]);
      doc.rect(15, currentY, 180, 16, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`FINAL DECISION: ${decision.toUpperCase()}    |    Confidence: ${ceo?.confidence || "N/A"}%`, 20, currentY + 10.5);
      currentY += 25;

      doc.setTextColor(0, 0, 0);

      // Helper for agent sections
      const addAgentSection = (title: string, evaluation: any, renderDetails: (evalData: any) => void) => {
        if (!evaluation) return;
        checkPageBreak(40);
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 46);
        doc.text(title, 15, currentY); 
        currentY += 3;
        
        // Underline
        doc.setDrawColor(200, 200, 200);
        doc.line(15, currentY, 195, currentY);
        currentY += 6;

        doc.setTextColor(0, 0, 0);
        renderDetails(evaluation);
        currentY += 10;
      };

      // HR Section
      addAgentSection("HR Evaluation — Ava Chen", hr, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Recommendation: ${e.recommendation || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        if (e.strengths?.length) { currentY += writeWrappedText(`Strengths: ${e.strengths.join(", ")}`, 15, currentY, 180, 10); currentY += 3; }
        if (e.weaknesses?.length) { currentY += writeWrappedText(`Weaknesses: ${e.weaknesses.join(", ")}`, 15, currentY, 180, 10); currentY += 3; }
        if (e.summary) { currentY += writeWrappedText(`Summary: ${e.summary}`, 15, currentY, 180, 10); }
      });

      // CTO Section
      addAgentSection("Technical Evaluation — Orion (CTO)", cto, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Risk Level: ${e.risk_level || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        if (e.technical_assessment) { currentY += writeWrappedText(`Assessment: ${e.technical_assessment}`, 15, currentY, 180, 10); }
      });

      // CFO Section
      addAgentSection("Financial Analysis — Nova (CFO)", cfo, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Budget Risk: ${e.budget_risk || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        currentY += writeWrappedText(`Estimated Salary: $${(e.salary_estimate || 0).toLocaleString()}    |    Total First-Year Cost: $${(e.total_first_year_cost || 0).toLocaleString()}`, 15, currentY, 180, 10); currentY += 3;
        if (e.summary) { currentY += writeWrappedText(`Summary: ${e.summary}`, 15, currentY, 180, 10); }
      });

      // DEV Section
      addAgentSection("Developer Evaluation — Leo", dev, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Recommendation: ${e.recommendation || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        if (e.technical_gaps?.length) { currentY += writeWrappedText(`Technical Gaps: ${e.technical_gaps.join(", ")}`, 15, currentY, 180, 10); currentY += 3; }
        if (e.summary) { currentY += writeWrappedText(`Summary: ${e.summary}`, 15, currentY, 180, 10); }
      });

      // MKT Section
      addAgentSection("Marketing Evaluation — Chloe", mkt, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Recommendation: ${e.recommendation || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        if (e.summary) { currentY += writeWrappedText(`Summary: ${e.summary}`, 15, currentY, 180, 10); }
      });

      // ACC Section
      addAgentSection("Accountant Evaluation — Miles", acc, (e) => {
        currentY += writeWrappedText(`Score: ${e.score || "N/A"}/100    |    Recommendation: ${e.recommendation || "N/A"}`, 15, currentY, 180, 11, true); currentY += 4;
        if (e.summary) { currentY += writeWrappedText(`Summary: ${e.summary}`, 15, currentY, 180, 10); }
      });

      // CEO Section
      addAgentSection("Executive Decision — Atlas (CEO)", ceo, (e) => {
        if (e.reasoning) { currentY += writeWrappedText(`Reasoning: ${e.reasoning}`, 15, currentY, 180, 10); currentY += 4; }
        if (e.message_to_candidate) { 
          doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
          currentY += writeWrappedText(`"${e.message_to_candidate}"`, 15, currentY, 180, 10); 
          doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
        }
      });

      // Footer for all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Confidential — Synapse Corp AI | Page ${i} of ${pageCount}`, 15, 285);
      }

      doc.save(`synapse-corp-report-${candidateName.replace(/\s/g, "-").toLowerCase()}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94A3B8] text-sm">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <span className="text-violet-400 font-heading font-bold text-sm">⟡ SYNAPSE CORP AI</span>
          <p className="text-[#94A3B8] text-xs mt-1">Final Evaluation Report</p>
          
          <button 
            onClick={() => setInternalView(!internalView)}
            className={`absolute right-0 top-0 text-[10px] px-3 py-1 rounded-full border ${internalView ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-[#1E1E2E] text-[#94A3B8] border-[#2E2E3E]'}`}
          >
            {internalView ? '⚠ INTERNAL VIEW (CONFIDENTIAL)' : 'CANDIDATE VIEW'}
          </button>
        </div>

        {/* CEO Decision Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-8 text-center border ${
            isHired
              ? "bg-emerald-500/5 border-emerald-500/30"
              : isRejected
              ? "bg-red-500/5 border-red-500/30"
              : "bg-amber-500/5 border-amber-500/30"
          }`}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            {isHired ? (
              <CheckCircle className="w-16 h-16 text-emerald-400" />
            ) : isRejected ? (
              <XCircle className="w-16 h-16 text-red-400" />
            ) : (
              <Clock className="w-16 h-16 text-amber-400" />
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`font-heading font-bold text-4xl mb-2 ${
              isHired ? "text-emerald-400" : isRejected ? "text-red-400" : "text-amber-400"
            }`}
          >
            {isHired ? "✓ HIRED" : isRejected ? "✗ NOT SELECTED" : "⏸ HOLD"}
          </motion.h1>

          <p className="text-[#F8FAFC] font-medium text-lg mb-1">{candidateName}</p>
          <p className="text-[#94A3B8] text-sm mb-6">Software Engineer · Synapse Corp</p>

          {ceo?.confidence && (
            <div className="inline-flex items-center gap-2 bg-[#1E1E2E] border border-[#2E2E3E] rounded-full px-4 py-2 text-sm mb-4">
              <span className="text-[#94A3B8]">Decision Confidence</span>
              <span className="font-heading font-bold text-[#F8FAFC]">{ceo.confidence}%</span>
            </div>
          )}

          {ceo?.message_to_candidate && (
            <blockquote className="text-[#94A3B8] text-sm italic border-l-2 border-amber-500/40 pl-4 text-left mt-4">
              "{ceo.message_to_candidate}"
              <footer className="mt-1 text-xs text-amber-400/70 not-italic">— Atlas, CEO, Synapse Corp</footer>
            </blockquote>
          )}
        </motion.div>

        {/* Score Breakdown (INTERNAL ONLY) */}
        {internalView ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { label: "HR Score", value: hr?.score ? `${hr.score}/100` : "N/A", color: "#7C3AED", sub: hr?.recommendation?.replace("_", " ").toUpperCase() },
              { label: "CTO Score", value: cto?.score ? `${cto.score}/100` : "N/A", color: "#06B6D4", sub: cto?.risk_level ? `Risk: ${cto.risk_level}` : "" },
              { label: "CFO Score", value: cfo?.score ? `${cfo.score}/100` : "N/A", color: "#10B981", sub: cfo?.budget_risk ? `Risk: ${cfo.budget_risk.replace("_", " ")}` : "" },
              { label: "DEV Score", value: dev?.score ? `${dev.score}/100` : "N/A", color: "#3B82F6", sub: dev?.recommendation?.replace("_", " ").toUpperCase() },
              { label: "MKT Score", value: mkt?.score ? `${mkt.score}/100` : "N/A", color: "#EC4899", sub: mkt?.recommendation?.replace("_", " ").toUpperCase() },
              { label: "ACC Score", value: acc?.score ? `${acc.score}/100` : "N/A", color: "#EAB308", sub: acc?.recommendation?.replace("_", " ").toUpperCase() },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="bg-[#12121A] border border-red-500/20 rounded-2xl p-4 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none" />
                <p className="text-red-400/80 text-[8px] font-mono tracking-widest mb-2 uppercase">Confidential Data</p>
                <p className="text-[#94A3B8] text-xs mb-1">{item.label}</p>
                <p className="font-heading font-bold text-xl" style={{ color: item.color }}>{item.value}</p>
                {item.sub && <p className="text-[10px] text-[#94A3B8] mt-1">{item.sub}</p>}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-4 bg-[#12121A] border border-[#1E1E2E] rounded-xl text-xs text-[#94A3B8] italic">
            Internal evaluation scores are strictly confidential and not visible to candidates.
          </div>
        )}

        {/* Key Factors */}
        {ceo?.key_factors?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5"
          >
            <h3 className="font-heading font-semibold text-[#F8FAFC] text-sm mb-3">Key Decision Factors</h3>
            <ul className="space-y-2">
              {ceo.key_factors.map((factor: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={isHired ? "text-emerald-400" : "text-amber-400"}>
                    {isHired ? "✓" : "⚠"}
                  </span>
                  <span className="text-[#94A3B8]">{factor}</span>
                </li>
              ))}
            </ul>
            {ceo?.reasoning && (
              <p className="text-xs text-[#94A3B8] mt-3 pt-3 border-t border-[#1E1E2E] leading-relaxed">{ceo.reasoning}</p>
            )}
          </motion.div>
        )}

        {/* CEO Next Steps */}
        {ceo?.next_steps && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4"
          >
            <p className="text-xs text-amber-400 font-medium mb-1">Next Steps</p>
            <p className="text-sm text-[#F8FAFC]">{ceo.next_steps}</p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4"
        >
          <motion.button
            id="download-report-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all"
          >
            {isGeneratingPDF ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download Evaluation Report (PDF)
          </motion.button>

          <motion.button
            id="new-interview-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              localStorage.removeItem("synapse_session_id");
              localStorage.removeItem("synapse_candidate_name");
              localStorage.removeItem("synapse_eval_results");
              router.push("/interview");
            }}
            className="flex items-center gap-2 bg-[#1E1E2E] hover:bg-[#2E2E3E] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#2E2E3E] py-3.5 px-6 rounded-xl transition-all text-sm"
          >
            <RefreshCw size={14} />
            New Interview
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
