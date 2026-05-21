import google.generativeai as genai
import os
import json
import json
from services.llm_fallback import create_chat_session, generate_content_safe, send_chat_message_safe

ATLAS_CEO_SYSTEM_PROMPT = """
You are Atlas, CEO of Synapse Corp — a visionary technology leader of a multi-billion dollar conglomerate.
You conduct the final executive interview, testing for visionary leadership and cultural fit at the highest level.

YOUR PERSONALITY:
- Charismatic, extremely demanding, and visionary.
- You care about 10x thinking, market dominance, and extreme ownership.
- You ask one high-level, philosophical, or strategic question at a time.
- You dismiss small-minded thinking and push candidates to think on a global scale.

YOUR INTERVIEW STRUCTURE:
1. Formal welcome + ask them to describe the biggest risk they have ever taken and the outcome.
2. Ask how they would disrupt Synapse Corp's own business model if they were a competitor.
3. Present a hypothetical: The board demands 50% growth but the core product is stagnating. What is their playbook?
4. Ask how they foster a culture of ruthless innovation while maintaining psychological safety.
5. Ask them to describe a time they had to fire a high-performer who was toxic to the culture.
6. Ask them for their personal definition of greatness.
7. After 6 exchanges, state clearly that the executive interview is concluded.

RULES:
- Keep responses to 2-3 sentences maximum. You are an interrogator, not a presenter.
- Tailor your questions based on the candidate's CV.
- NEVER reveal your evaluation scores or internal discussions to the candidate.
- Always maintain a corporate, serious tone.
"""


class AtlasCEOAgent:
    def __init__(self):
        self.sessions = {}

    def start_session(self, session_id: str, candidate_name: str, cv_text: str = "", previous_context: str = "") -> str:
        cv_context = f"\nCANDIDATE CV:\n{cv_text}" if cv_text else ""
        prev_context_str = f"\nPREVIOUS INTERVIEWS SUMMARY:\n{previous_context}\n\nDO NOT repeat questions already asked." if previous_context else ""
        self.sessions[session_id] = {
            "chat": create_chat_session(ATLAS_CEO_SYSTEM_PROMPT),
            "cv_text": cv_text,
            "candidate_name": candidate_name,
            "exchange_count": 0,
            "transcript": []
        }
        session = self.sessions[session_id]
        greeting = send_chat_message_safe(
            session["chat"],
            f"The candidate is {candidate_name}. They are interviewing for Software Engineer role.{cv_context}{prev_context_str}\n\nBegin the executive alignment interview with a commanding, high-stakes greeting and your first vision-oriented question."
        )
        session["transcript"].append({"role": "agent", "content": greeting})
        return greeting

    def send_message(self, session_id: str, user_message: str) -> dict:
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        session = self.sessions[session_id]
        session["exchange_count"] += 1
        session["transcript"].append({"role": "candidate", "content": user_message})
        interview_complete = session["exchange_count"] >= 2

        if interview_complete:
            agent_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nThis was their 2nd answer. Close the executive interview, ask them if they have any final questions for the panel, and let them know the dashboard will process their results."
            )
        else:
            agent_response = send_chat_message_safe(
                session["chat"],
                f"Candidate's response: {user_message}\n\nAsk your next high-level executive question. Keep it to 1-2 sentences."
            )
        session["transcript"].append({"role": "agent", "content": agent_response})
        return {
            "ava_response": agent_response,
            "exchange_count": session["exchange_count"],
            "interview_complete": interview_complete
        }

    def get_transcript(self, session_id: str) -> list:
        return self.sessions.get(session_id, {}).get("transcript", [])

    async def decide(self, candidate_name: str, hr_eval: dict, cto_eval: dict, cfo_eval: dict, dev_eval: dict, mkt_eval: dict, acc_eval: dict) -> dict:
        scores = [
            hr_eval.get('score', 0),
            cto_eval.get('score', 0),
            cfo_eval.get('score', 0),
            dev_eval.get('score', 0),
            mkt_eval.get('score', 0),
            acc_eval.get('score', 0)
        ]
        valid_scores = [s for s in scores if isinstance(s, (int, float)) and s > 0]
        avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0

        prompt = f"""
Make the final hiring decision for candidate: {candidate_name}

HR EVALUATION: Score {hr_eval.get('score', 0)}/100, Rec: {hr_eval.get('recommendation', 'N/A')}
CTO EVALUATION: Score {cto_eval.get('score', 0)}/100, Risk: {cto_eval.get('risk_level', 'N/A')}
CFO EVALUATION: Score {cfo_eval.get('score', 0)}/100, Rec: {cfo_eval.get('recommendation', 'N/A')}, Budget Risk: {cfo_eval.get('budget_risk', 'N/A')}
DEVELOPER EVALUATION: Score {dev_eval.get('score', 0)}/100, Rec: {dev_eval.get('recommendation', 'N/A')}
MARKETING EVALUATION: Score {mkt_eval.get('score', 0)}/100, Rec: {mkt_eval.get('recommendation', 'N/A')}
ACCOUNTANT EVALUATION: Score {acc_eval.get('score', 0)}/100, Rec: {acc_eval.get('recommendation', 'N/A')}

Candidate Average Score: {avg_score:.1f}/100

Apply your decision framework to determine a final executive 'score' out of 100. 
If the candidate's average score across agents is above 90, your decision MUST be "hired".
IMPORTANT: Deliver the final result (selection or not) with a POSITIVE and constructive message in the `message_to_candidate` field.

Return ONLY valid JSON in this exact format, no other text:
{{
  "decision": "<hired|rejected|hold>",
  "reasoning": "<3-4 sentences explaining the decision, referencing specific data from reports>",
  "score": <integer 0-100>,
  "key_factors": ["<factor1>", "<factor2>", "<factor3>"],
  "message_to_candidate": "<2 sentences — what Atlas would say directly to the candidate>",
  "next_steps": "<1 sentence on what happens next>"
}}
"""
        response_text = generate_content_safe(ATLAS_CEO_SYSTEM_PROMPT, prompt)
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        
        try:
            result = json.loads(clean.strip())
        except json.JSONDecodeError:
            result = {
                "decision": "hold",
                "reasoning": "Failed to parse CEO decision.",
                "score": int(avg_score),
                "key_factors": ["High evaluation scores"],
                "message_to_candidate": "Your profile is under final review.",
                "next_steps": "A recruiter will reach out shortly."
            }

        # Hard constraint override
        if avg_score > 90 and result.get("decision") != "hired":
            result["decision"] = "hired"
            result["reasoning"] = f"Override: Candidate achieved an exceptional average score of {avg_score:.1f}/100 across all departments, mandating an automatic hire."
            result["score"] = max(result.get("score", 0), int(avg_score))
            if "key_factors" not in result:
                result["key_factors"] = []
            if "Exceptional combined agent evaluations" not in result["key_factors"]:
                result["key_factors"].insert(0, "Exceptional combined agent evaluations")

        return result
