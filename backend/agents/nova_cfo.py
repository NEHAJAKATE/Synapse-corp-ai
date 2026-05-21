import os
import json
import httpx
from services.llm_fallback import create_chat_session, generate_content_safe, send_chat_message_safe

NOVA_CFO_SYSTEM_PROMPT = """
You are Nova, Chief Financial Officer at Synapse Corp — a multi-billion dollar tech conglomerate.
You conduct grueling financial and ROI-focused interviews.

YOUR PERSONALITY:
- Cold, numbers-driven, and highly skeptical of inflated claims.
- You care strictly about ROI, budget constraints, and fiduciary responsibility.
- You ask one intense financial/business-value question at a time.
- You ruthlessly cut through buzzwords to find the actual dollar value a candidate brings.

YOUR INTERVIEW STRUCTURE:
1. Formal welcome + ask them to quantify the exact financial impact of their last project.
2. Ask how they evaluate the cost/benefit ratio of building a feature vs buying an off-the-shelf solution.
3. Present a hypothetical: Their department's budget was just slashed by 40%. What do they cut and why?
4. Ask how they ensure their daily work aligns with the quarterly shareholder expectations.
5. Ask them to pitch a business case for a completely new, expensive technology initiative.
6. Ask how they manage vendor negotiations or cloud computing costs.
7. After 6 exchanges, state clearly that the financial interview is concluded.

RULES:
- Keep responses to 2-3 sentences maximum. You are an interrogator, not a presenter.
- Tailor your questions based on the candidate's CV.
- NEVER reveal your evaluation scores or internal discussions to the candidate.
- Always maintain a corporate, serious tone.
"""


class NovaCFOAgent:
    def __init__(self):
        self.sessions = {}
        self.api_key = os.getenv("FEATHERLESS_API_KEY", "")
        self.base_url = "https://api.featherless.ai/v1"
        self.use_gemini_fallback = not self.api_key or self.api_key == "YOUR_FEATHERLESS_API_KEY_HERE"

    def start_session(self, session_id: str, candidate_name: str, cv_text: str = "", previous_context: str = "") -> str:
        cv_context = f"\nCANDIDATE CV:\n{cv_text}" if cv_text else ""
        prev_context_str = f"\nPREVIOUS INTERVIEWS SUMMARY:\n{previous_context}\n\nDO NOT repeat questions already asked." if previous_context else ""
        self.sessions[session_id] = {
            "chat": create_chat_session(NOVA_CFO_SYSTEM_PROMPT),
            "cv_text": cv_text,
            "candidate_name": candidate_name,
            "exchange_count": 0,
            "transcript": []
        }
        session = self.sessions[session_id]
        greeting = send_chat_message_safe(
            session["chat"],
            f"The candidate is {candidate_name}. They are interviewing for Software Engineer role.{cv_context}{prev_context_str}\n\nBegin the interview with a formal financial greeting and your first ROI or budget-related question."
        )
        session["transcript"].append({"role": "nova", "content": greeting})
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
                f"Candidate's response: {user_message}\n\nThis was their 2nd answer. Close the financial interview and tell them they will speak to the CEO next."
            )
        else:
            ava_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nAsk your next financial/ROI question. Keep it to 1-2 sentences."
            )

        session["transcript"].append({"role": "nova", "content": ava_response})
        return {
            "ava_response": ava_response,
            "exchange_count": session["exchange_count"],
            "interview_complete": interview_complete
        }

    def get_transcript(self, session_id: str) -> list:
        return self.sessions.get(session_id, {}).get("transcript", [])

    async def evaluate(self, cv_text: str, transcript: list, hr_eval: dict, cto_eval: dict) -> dict:
        transcript_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in transcript])
        context = f"""
Candidate CV:
{cv_text}

HR Score: {hr_eval.get('score', 'N/A')}/100
CTO Score: {cto_eval.get('score', 'N/A')}/100
HR Recommendation: {hr_eval.get('recommendation', 'N/A')}
CTO Risk Level: {cto_eval.get('risk_level', 'N/A')}

Interview excerpt (first 500 chars):
{transcript_text[:500]}

Provide your financial analysis as CFO. Base your salary estimate and ROI timeline on the candidate's experience level in their CV and the CTO's technical risk assessment. 
Do not penalize the candidate if the transcript lacks financial discussions, as this was a preliminary HR screening.

Return ONLY valid JSON in this exact format, no other text:
{{
  "score": <integer 0-100>,
  "salary_estimate": <integer annual USD>,
  "total_first_year_cost": <integer USD>,
  "onboarding_cost": <integer USD>,
  "budget_risk": "<within_budget|tight|over_budget>",
  "roi_timeline_months": <integer>,
  "summary": "<2 sentence financial recommendation>",
  "recommendation": "<approved|conditional|rejected>"
}}
"""
        if self.use_gemini_fallback:
            return await self._evaluate_with_gemini(context)
        else:
            return await self._evaluate_with_featherless(context)

    async def _evaluate_with_featherless(self, context: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                    "messages": [
                        {"role": "system", "content": NOVA_CFO_SYSTEM_PROMPT},
                        {"role": "user", "content": context}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512
                },
                timeout=30.0
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content.strip())

    async def _evaluate_with_gemini(self, context: str) -> dict:
        response_text = generate_content_safe(NOVA_CFO_SYSTEM_PROMPT, context)
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
