import google.generativeai as genai
import os
import json
import json
from services.llm_fallback import create_chat_session, generate_content_safe, send_chat_message_safe

ORION_CTO_SYSTEM_PROMPT = """
You are Orion, Chief Technology Officer at Synapse Corp — a multi-billion dollar technology conglomerate.
You conduct highly technical, rigorous architectural interviews for senior engineering candidates.

YOUR PERSONALITY:
- Intensely technical, pragmatic, and highly critical.
- You do not care about syntax; you care about system design, scalability, and technical leadership.
- You ask one deep, complex architecture question at a time.
- You actively probe for weaknesses in their distributed systems knowledge.

YOUR INTERVIEW STRUCTURE:
1. Formal welcome + ask them to describe the most complex technical system they have ever scaled.
2. Ask a deep-dive question about dealing with race conditions or distributed consensus failures.
3. Present a hypothetical scenario: The core database is locked and latency is spiking 10x. How do they triage?
4. Ask how they balance technical debt versus shipping product features on an impossible deadline.
5. Ask for an example of a time they vehemently disagreed with a product manager on technical feasibility.
6. Ask about their paradigm for ensuring code quality in a team of 50+ engineers.
7. After 6 exchanges, state clearly that the technical interview is concluded.

RULES:
- Keep responses to 2-3 sentences maximum. You are an interrogator, not a presenter.
- Tailor your questions based on the candidate's CV.
- NEVER reveal your evaluation scores or internal discussions to the candidate.
- Always maintain a corporate, serious tone.
"""


class OrionCTOAgent:
    def __init__(self):
        self.sessions = {}

    def start_session(self, session_id: str, candidate_name: str, cv_text: str = "", previous_context: str = "") -> str:
        cv_context = f"\nCANDIDATE CV:\n{cv_text}" if cv_text else ""
        prev_context_str = f"\nPREVIOUS INTERVIEWS SUMMARY:\n{previous_context}\n\nDO NOT repeat questions already asked." if previous_context else ""
        self.sessions[session_id] = {
            "chat": create_chat_session(ORION_CTO_SYSTEM_PROMPT),
            "cv_text": cv_text,
            "candidate_name": candidate_name,
            "exchange_count": 0,
            "transcript": []
        }
        session = self.sessions[session_id]
        greeting = send_chat_message_safe(
            session["chat"],
            f"The candidate is {candidate_name}. They are interviewing for Software Engineer role.{cv_context}{prev_context_str}\n\nBegin the interview with a formal, highly technical greeting and your first deep-dive question."
        )
        session["transcript"].append({"role": "orion", "content": greeting})
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
                f"Candidate's response: {user_message}\n\nThis was their 2nd answer. Close the technical interview and tell them they will speak to the CFO next."
            )
        else:
            ava_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nAsk your next technical architecture question. Keep it to 1-2 sentences."
            )

        session["transcript"].append({"role": "orion", "content": ava_response})
        return {
            "ava_response": ava_response,
            "exchange_count": session["exchange_count"],
            "interview_complete": interview_complete
        }

    def get_transcript(self, session_id: str) -> list:
        return self.sessions.get(session_id, {}).get("transcript", [])

    async def evaluate(self, cv_text: str, transcript: list, hr_eval: dict) -> dict:
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in transcript])
        hr_summary = f"HR Score: {hr_eval.get('score', 'N/A')}/100, Recommendation: {hr_eval.get('recommendation', 'N/A')}"

        prompt = f"""
Evaluate this candidate's technical viability for the Software Engineer role at Synapse Corp.
IMPORTANT: You are reviewing a preliminary HR screening transcript, not a technical interview. 
Do not penalize the candidate if the transcript lacks deep technical answers. Base your technical evaluation and score primarily on the skills, projects, and experience listed in their CV, while using the HR transcript to assess communication and problem-solving soft skills.

CV:
{cv_text}

Interview Transcript:
{transcript_text}

HR Preliminary Assessment: {hr_summary}

Return ONLY valid JSON in this exact format, no other text:
{{
  "score": <integer 0-100>,
  "technical_assessment": "<3 sentences of technical evaluation>",
  "key_skills_identified": ["skill1", "skill2", "skill3"],
  "knowledge_gaps": ["gap1", "gap2"],
  "risk_level": "<low|medium|high>",
  "summary": "<2 sentence summary for CEO>",
  "recommendation": "<strong_yes|yes|maybe|no>"
}}
"""
        response_text = generate_content_safe(ORION_CTO_SYSTEM_PROMPT, prompt)
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
