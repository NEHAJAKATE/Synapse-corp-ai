/**
 * PDF Report Generator using jsPDF
 * Generates a professional Synapse Corp AI evaluation report.
 */

export interface ReportData {
  candidateName: string;
  role: string;
  sessionId: string;
  date: string;
  hrEval: any;
  ctoEval: any;
  cfoEval: any;
  ceoDecision: any;
}

export async function generateReport(reportData: ReportData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const { candidateName, role, sessionId, date, hrEval, ctoEval, cfoEval, ceoDecision } = reportData;

  // ─── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, 210, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SYNAPSE CORP AI", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Autonomous Hiring Intelligence Platform", 15, 27);
  doc.setFontSize(8);
  doc.text(`Report Generated: ${date}`, 15, 35);

  // ─── Candidate Info ────────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate Evaluation Report", 15, 58);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${candidateName}`, 15, 68);
  doc.text(`Position: ${role}`, 15, 75);
  doc.text(`Session: ${sessionId}`, 15, 82);

  // ─── Decision Banner ────────────────────────────────────────────────────────
  const decision = ceoDecision?.decision || "hold";
  const isHired = decision === "hired";
  const isRejected = decision === "rejected";
  const bannerColor = isHired ? [16, 185, 129] : isRejected ? [239, 68, 68] : [245, 158, 11];
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.rect(15, 90, 180, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`FINAL DECISION: ${decision.toUpperCase()}  |  Confidence: ${ceoDecision?.confidence || "N/A"}%`, 20, 100);

  doc.setTextColor(0, 0, 0);
  let y = 118;

  // ─── HR Section ─────────────────────────────────────────────────────────────
  if (hrEval) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("1. HR Evaluation — Ava Chen", 15, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Score: ${hrEval.score || "N/A"}/100`, 18, y); y += 5;
    doc.text(`Recommendation: ${hrEval.recommendation || "N/A"}`, 18, y); y += 5;
    if (hrEval.strengths?.length) {
      doc.text(`Strengths: ${hrEval.strengths.slice(0, 3).join("; ")}`, 18, y, { maxWidth: 175 }); y += 6;
    }
    if (hrEval.weaknesses?.length) {
      doc.text(`Weaknesses: ${hrEval.weaknesses.join("; ")}`, 18, y, { maxWidth: 175 }); y += 6;
    }
    if (hrEval.summary) {
      doc.text(`Summary: ${hrEval.summary}`, 18, y, { maxWidth: 175 }); y += 10;
    }
  }

  // ─── CTO Section ─────────────────────────────────────────────────────────────
  if (ctoEval) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("2. Technical Evaluation — Orion (CTO)", 15, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Score: ${ctoEval.score || "N/A"}/100  |  Risk: ${ctoEval.risk_level || "N/A"}`, 18, y); y += 5;
    if (ctoEval.key_skills_identified?.length) {
      doc.text(`Key Skills: ${ctoEval.key_skills_identified.join(", ")}`, 18, y, { maxWidth: 175 }); y += 5;
    }
    if (ctoEval.technical_assessment) {
      doc.text(`Assessment: ${ctoEval.technical_assessment}`, 18, y, { maxWidth: 175 }); y += 10;
    }
  }

  // ─── CFO Section ─────────────────────────────────────────────────────────────
  if (cfoEval) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("3. Financial Analysis — Nova (CFO)", 15, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Estimated Salary: $${(cfoEval.salary_estimate || 0).toLocaleString()} / year`, 18, y); y += 5;
    doc.text(`Total First-Year Cost: $${(cfoEval.total_first_year_cost || 0).toLocaleString()}`, 18, y); y += 5;
    doc.text(`Budget Risk: ${cfoEval.budget_risk || "N/A"}  |  ROI Timeline: ${cfoEval.roi_timeline_months || "N/A"} months`, 18, y); y += 5;
    if (cfoEval.summary) {
      doc.text(`Summary: ${cfoEval.summary}`, 18, y, { maxWidth: 175 }); y += 10;
    }
  }

  // ─── CEO Decision ─────────────────────────────────────────────────────────────
  if (ceoDecision) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("4. Executive Decision — Atlas (CEO)", 15, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    if (ceoDecision.key_factors?.length) {
      doc.text(`Key Factors: ${ceoDecision.key_factors.join("; ")}`, 18, y, { maxWidth: 175 }); y += 6;
    }
    if (ceoDecision.reasoning) {
      doc.text(`Reasoning: ${ceoDecision.reasoning}`, 18, y, { maxWidth: 175 }); y += 10;
    }
    if (ceoDecision.message_to_candidate) {
      doc.text(`Message to Candidate: "${ceoDecision.message_to_candidate}"`, 18, y, { maxWidth: 175 }); y += 10;
    }
    if (ceoDecision.next_steps) {
      doc.text(`Next Steps: ${ceoDecision.next_steps}`, 18, y, { maxWidth: 175 });
    }
  }

  // ─── Footer ───────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Confidential — Synapse Corp AI | Milan AI Week AI Agent Olympics Hackathon 2026", 15, 285);

  const filename = `synapse-report-${candidateName.replace(/\s/g, "-").toLowerCase()}-${Date.now()}.pdf`;
  doc.save(filename);
}
