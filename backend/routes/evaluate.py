from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents import ava_agent, orion_agent, nova_agent, marketing_agent, developer_agent, accountant_agent
from routes.websocket import manager
from services.supabase_client import update_session_evaluations

router = APIRouter()


class EvaluateRequest(BaseModel):
    session_id: str


@router.post("/run-all")
async def run_all_evaluations(req: EvaluateRequest):
    session_id = req.session_id

    if session_id not in ava_agent.sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = ava_agent.sessions[session_id]
    cv_text = session.get("cv_text", "No CV provided")
    
    # Collect transcripts from all agents
    def get_ts(agent):
        if hasattr(agent, "sessions") and session_id in agent.sessions:
            return agent.get_transcript(session_id)
        return []
    
    transcript_ava = get_ts(ava_agent)
    transcript_dev = get_ts(developer_agent)
    transcript_mkt = get_ts(marketing_agent)
    transcript_acc = get_ts(accountant_agent)
    
    results = {}

    from routes.decision import _eval_store

    results = _eval_store.get(session_id, {})
    
    # Check if we reached CEO. If we didn't, the candidate was rejected early, so we don't need to generate a CEO decision phase here.
    # We just return the results.
    
    # Broadcast completed status for all agents that have results
    for agent_id, data in results.items():
        try:
            await manager.send_event(session_id, {
                "type": "agent_complete",
                "agent": agent_id,
                "data": data
            })
        except Exception:
            pass

    # If CFO completed successfully, we can trigger the handoff message
    if "cfo" in results and "error" not in results["cfo"]:
        await manager.send_event(session_id, {
            "type": "inter_agent_message",
            "from": "nova",
            "to": "atlas",
            "message": f"All panel reports received. Handing off to CEO for final decision."
        })

    await manager.send_event(session_id, {
        "type": "inter_agent_message",
        "from": "nova",
        "to": "atlas",
        "message": f"All panel reports received. Handing off to CEO for final decision."
    })

    # Save to Supabase (only saving hr, cto, cfo for backwards schema compat)
    try:
        await update_session_evaluations(session_id, results["hr"], results["cto"], results["cfo"])
    except Exception:
        pass

    return results
