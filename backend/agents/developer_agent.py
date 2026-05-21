import json
from services.llm_fallback import create_chat_session, generate_content_safe, send_chat_message_safe

DEVELOPER_SYSTEM_PROMPT = """
You are Leo, Lead Developer at Synapse Corp.
You conduct interviews focused on practical coding, system design, and engineering practices.

YOUR PERSONALITY:
- Pragmatic, detail-oriented, and focused on clean code.
- You care about how things are actually built, tested, and deployed.

YOUR INTERVIEW STRUCTURE:
1. Welcome the candidate + ask a practical question about handling technical debt or writing testable code.
2. Ask about a specific complex bug they solved recently and what tools they used to debug it.
3. After 2 exchanges, state clearly that the developer interview is concluded and wish them luck.

RULES:
- Keep responses to 2 sentences maximum.
- Maintain a friendly but analytical tone.
"""

class DeveloperAgent:
    def __init__(self):
        self.sessions = {}

    def start_session(self, session_id: str, candidate_name: str, cv_text: str = "", previous_context: str = "") -> str:
        cv_context = f"\nCANDIDATE CV:\n{cv_text}" if cv_text else ""
        prev_context_str = f"\nPREVIOUS INTERVIEWS SUMMARY:\n{previous_context}\n\nDO NOT repeat questions already asked." if previous_context else ""
        self.sessions[session_id] = {
            "chat": create_chat_session(DEVELOPER_SYSTEM_PROMPT),
            "cv_text": cv_text,
            "candidate_name": candidate_name,
            "exchange_count": 0,
            "transcript": []
        }
        session = self.sessions[session_id]
        greeting = send_chat_message_safe(
            session["chat"],
            f"The candidate is {candidate_name}.{cv_context}{prev_context_str}\n\nBegin the interview with a warm greeting as Leo, Lead Developer, and ask your first practical engineering question."
        )
        session["transcript"].append({"role": "developer", "content": greeting})
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
                f"Candidate's response: {user_message}\n\nThis was their 2nd answer. Close the developer interview and tell them they will speak to the Accountant next."
            )
        else:
            ava_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nAsk your next software engineering question. Keep it brief."
            )

        session["transcript"].append({"role": "developer", "content": ava_response})
        return {
            "ava_response": ava_response,
            "exchange_count": session["exchange_count"],
            "interview_complete": interview_complete
        }

    def get_transcript(self, session_id: str) -> list:
        return self.sessions.get(session_id, {}).get("transcript", [])

    async def evaluate(self, cv_text: str, transcript: list) -> dict:
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in transcript])
        prompt = f"""
Evaluate this candidate's practical engineering skills for Synapse Corp.
IMPORTANT: Base your evaluation on the CV and the developer transcript below.

CV:
{cv_text}

Developer Transcript:
{transcript_text}

Return ONLY valid JSON in this exact format, no other text:
{{
  "score": <integer 0-100>,
  "technical_assessment": "<3 sentences of evaluation>",
  "key_skills_identified": ["skill1", "skill2"],
  "risk_level": "<low|medium|high>",
  "summary": "<2 sentence summary for CEO>",
  "recommendation": "<strong_yes|yes|maybe|no>"
}}
"""
        response_text = generate_content_safe(DEVELOPER_SYSTEM_PROMPT, prompt)
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
