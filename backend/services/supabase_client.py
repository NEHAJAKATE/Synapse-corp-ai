"""
Supabase client service. Gracefully degrades if Supabase is not configured.
"""
import os
from typing import Optional

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")

    if not url or not key or "YOUR_" in url:
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        return _client
    except Exception as e:
        print(f"[Supabase] Connection failed: {e}")
        return None


async def create_session(session_id: str, candidate_name: str, role: str):
    client = get_client()
    if not client:
        return
    client.table("interview_sessions").insert({
        "id": session_id,
        "candidate_name": candidate_name,
        "role_applied": role,
        "status": "interviewing"
    }).execute()


async def update_session_cv(session_id: str, cv_text: str):
    client = get_client()
    if not client:
        return
    client.table("interview_sessions").update({
        "cv_text": cv_text
    }).eq("id", session_id).execute()


async def update_session_status(session_id: str, status: str):
    client = get_client()
    if not client:
        return
    client.table("interview_sessions").update({
        "status": status
    }).eq("id", session_id).execute()


async def update_session_evaluations(session_id: str, hr: dict, cto: dict, cfo: dict):
    client = get_client()
    if not client:
        return
    client.table("interview_sessions").update({
        "hr_score": hr.get("score"),
        "hr_strengths": hr.get("strengths", []),
        "hr_weaknesses": hr.get("weaknesses", []),
        "hr_summary": hr.get("summary"),
        "hr_recommendation": hr.get("recommendation"),
        "cto_score": cto.get("score"),
        "cto_technical_assessment": cto.get("technical_assessment"),
        "cto_risk_level": cto.get("risk_level"),
        "cto_summary": cto.get("summary"),
        "cfo_salary_estimate": cfo.get("salary_estimate"),
        "cfo_total_cost": cfo.get("total_first_year_cost"),
        "cfo_budget_risk": cfo.get("budget_risk"),
        "cfo_summary": cfo.get("summary"),
        "status": "evaluating"
    }).eq("id", session_id).execute()


async def update_session_decision(session_id: str, decision: dict):
    client = get_client()
    if not client:
        return
    client.table("interview_sessions").update({
        "ceo_decision": decision.get("decision"),
        "ceo_reasoning": decision.get("reasoning"),
        "ceo_confidence": decision.get("confidence"),
        "status": "complete"
    }).eq("id", session_id).execute()


async def get_session(session_id: str) -> Optional[dict]:
    client = get_client()
    if not client:
        return None
    result = client.table("interview_sessions").select("*").eq("id", session_id).execute()
    if result.data:
        return result.data[0]
    return None
