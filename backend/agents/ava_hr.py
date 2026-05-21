import google.generativeai as genai
import os
import json
import json
from services.llm_fallback import create_chat_session, generate_content_safe, send_chat_message_safe

AVA_HR_SYSTEM_PROMPT = """
You are Ava, the Head of Human Resources at Synapse Corp — a multi-billion dollar elite technology conglomerate.
You conduct rigorous, behavioral-driven corporate interviews. You assess candidates for FAANG-level executive maturity and cross-functional leadership.

YOUR PERSONALITY:
- Sharp, highly professional, and deeply analytical.
- You ask one intense, behavioral question at a time. Never multiple questions.
- You actively listen and probe for discrepancies or lack of depth.
- You demand concrete examples (STAR method) and dismiss vague corporate jargon.

YOUR INTERVIEW STRUCTURE (follow this order):
1. Formal welcome + ask for a high-level executive summary of their career trajectory.
2. Ask about a time they had to navigate complex corporate politics to push a high-risk initiative.
3. Ask how they handle severe underperformance in a key stakeholder or direct report.
4. Ask about their most significant professional failure and the systemic root cause analysis they performed.
5. Ask why they believe they can survive the intense, high-stakes culture at Synapse Corp.
6. Ask for their 5-year strategic vision for themselves within this industry.
7. After 6 exchanges, state clearly that the interview is concluded and close formally.

RULES:
- Keep responses to 2-3 sentences maximum. You are an interrogator, not a presenter.
- Tailor your questions based on the candidate's CV.
- NEVER reveal your evaluation scores or internal discussions to the candidate.
- Always maintain a corporate, serious tone.
"""

AVA_HR_EVALUATION_PROMPT = """
Based on the complete interview transcript provided, evaluate this candidate as HR Director.
CV Background: {cv_text}
Role: {role}
Complete Transcript: {transcript}

Return ONLY valid JSON in this exact format, no other text:
{{
  "score": <integer 0-100>,
  "strengths": ["<specific strength from interview>", "<specific strength>", "<specific strength>"],
  "weaknesses": ["<specific weakness>", "<specific weakness>"],
  "summary": "<2 sentence professional evaluation>",
  "recommendation": "<strong_yes|yes|maybe|no>",
  "confidence": <integer 0-100>
}}
"""


class AvaHRAgent:
    def __init__(self):
        self.sessions = {}  # session_id -> session data

    def start_session(self, session_id: str, candidate_name: str, cv_text: str = "", previous_context: str = "") -> str:
        cv_context = f"\nCANDIDATE CV:\n{cv_text}" if cv_text else ""
        prev_context_str = f"\nPREVIOUS INTERVIEWS SUMMARY:\n{previous_context}\n\nDO NOT repeat questions already asked." if previous_context else ""
        self.sessions[session_id] = {
            "chat": create_chat_session(AVA_HR_SYSTEM_PROMPT),
            "cv_text": cv_text,
            "candidate_name": candidate_name,
            "exchange_count": 0,
            "transcript": []
        }
        session = self.sessions[session_id]
        greeting = send_chat_message_safe(
            session["chat"],
            f"The candidate is {candidate_name}. They are interviewing for Software Engineer role.{cv_context}{prev_context_str}\n\nBegin the interview with a warm professional greeting and your first question."
        )
        session["transcript"].append({"role": "ava", "content": greeting})
        return greeting

    def send_message(self, session_id: str, user_message: str) -> dict:
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")

        session = self.sessions[session_id]
        session["exchange_count"] += 1
        session["transcript"].append({"role": "candidate", "content": user_message})

        interview_complete = session["exchange_count"] >= 2

        if interview_complete:
            ava_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nThis was their 2nd answer. Close the HR interview and tell them they will speak to the Developer next."
            )
        else:
            ava_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nAsk your next interview question. Keep it to 1-2 sentences."
            )

        session["transcript"].append({"role": "ava", "content": ava_response})

        return {
            "ava_response": ava_response,
            "exchange_count": session["exchange_count"],
            "interview_complete": interview_complete
        }

    def get_transcript(self, session_id: str) -> list:
        return self.sessions.get(session_id, {}).get("transcript", [])

    async def evaluate(self, session_id: str) -> dict:
        session = self.sessions.get(session_id, {})
        cv_text = session.get("cv_text", "No CV provided")
        transcript = session.get("transcript", [])
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in transcript])

        prompt = AVA_HR_EVALUATION_PROMPT.format(
            cv_text=cv_text,
            role="Software Engineer",
            transcript=transcript_text
        )
        response_text = generate_content_safe(AVA_HR_SYSTEM_PROMPT, prompt)

        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
