from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents import ava_agent, atlas_agent
from routes.websocket import manager
from services.supabase_client import update_session_decision, get_session

router = APIRouter()

# In-memory store for evaluations (in production, use Supabase)
_eval_store: dict = {}


def store_evaluations(session_id: str, hr: dict, cto: dict, cfo: dict):
    _eval_store[session_id] = {"hr": hr, "cto": cto, "cfo": cfo}


class DecisionRequest(BaseModel):
    session_id: str
    hr_eval: dict = None
    cto_eval: dict = None
    cfo_eval: dict = None
    developer_eval: dict = None
    marketing_eval: dict = None
    accountant_eval: dict = None


@router.post("/final")
async def final_decision(req: DecisionRequest):
    session_id = req.session_id

    # Get evaluations from request or memory store
    evals = _eval_store.get(session_id, {})
    hr_eval = req.hr_eval or evals.get("hr", {})
    cto_eval = req.cto_eval or evals.get("cto", {})
    cfo_eval = req.cfo_eval or evals.get("cfo", {})
    dev_eval = req.developer_eval or evals.get("developer", {})
    mkt_eval = req.marketing_eval or evals.get("marketing", {})
    acc_eval = req.accountant_eval or evals.get("accountant", {})

    if not hr_eval or not cto_eval or not cfo_eval:
        raise HTTPException(status_code=400, detail="Missing evaluation data. Run /evaluate/run-all first.")

    session = ava_agent.sessions.get(session_id, {})
    candidate_name = session.get("candidate_name", "Candidate")

    try:
        await manager.send_event(session_id, {
            "type": "agent_thinking",
            "agent": "atlas",
            "data": {"status": "Reviewing all reports and making final decision..."}
        })
        await manager.send_event(session_id, {
            "type": "inter_agent_message",
            "from": "atlas",
            "to": "all",
            "message": "Initiating final decision protocol. All reports received. Processing..."
        })

        # Generate live agent discussion script
        discussion_prompt = f"""
        You are simulating a live, private deliberation between the 7 executive agents of Synapse Corp regarding candidate {candidate_name}.
        Based on these evaluations:
        HR: Score {hr_eval.get('score')}
        Dev: Score {dev_eval.get('score')}
        Mkt: Score {mkt_eval.get('score')}
        Acc: Score {acc_eval.get('score')}
        CTO: Risk {cto_eval.get('risk_level')}
        CFO: Budget Risk {cfo_eval.get('budget_risk')}

        Write a 5-line back-and-forth dialogue script where they debate the candidate. 
        Format strictly like this, using their initials (AVA, DEV, MKT, ACC, ORI, NOV, ATL):
        ORI: The code quality is solid, but architecture scaling is a concern.
        NOV: We can absorb the training cost if they ramp up quickly.
        ...
        Return ONLY the 5 lines of dialogue, nothing else.
        """
        
        from services.llm_fallback import generate_content_safe
        import asyncio

        try:
            discussion_text = generate_content_safe("You are a scriptwriter for corporate AI agents.", discussion_prompt)
            lines = [line.strip() for line in discussion_text.split('\n') if line.strip() and ':' in line]
            
            # Broadcast the discussion lines
            for line in lines[:5]:
                try:
                    speaker, msg = line.split(':', 1)
                    await manager.send_event(session_id, {
                        "type": "inter_agent_message",
                        "from": speaker.strip().lower(),
                        "to": "all",
                        "message": msg.strip()
                    })
                    await asyncio.sleep(1.5)  # Simulate typing delay
                except Exception:
                    pass
        except Exception as e:
            print(f"Error generating discussion: {e}")

        decision = await atlas_agent.decide(candidate_name, hr_eval, cto_eval, cfo_eval, dev_eval, mkt_eval, acc_eval)

        await manager.send_event(session_id, {
            "type": "agent_complete",
            "agent": "atlas",
            "data": decision
        })
        await manager.send_event(session_id, {
            "type": "decision_ready",
            "data": decision
        })

        # Save to Supabase
        try:
            await update_session_decision(session_id, decision)
        except Exception:
            pass

        return decision

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{session_id}")
async def get_report(session_id: str):
    """Returns full report data for PDF generation."""
    session = ava_agent.sessions.get(session_id, {})
    evals = _eval_store.get(session_id, {})

    # Try Supabase first
    try:
        db_session = await get_session(session_id)
        if db_session:
            return db_session
    except Exception:
        pass

    return {
        "session_id": session_id,
        "candidate_name": session.get("candidate_name", "Unknown"),
        "role": "Software Engineer",
        "transcript": session.get("transcript", []),
        "hr": evals.get("hr", {}),
        "cto": evals.get("cto", {}),
        "cfo": evals.get("cfo", {})
    }
