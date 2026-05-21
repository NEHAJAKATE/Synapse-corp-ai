from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import uuid
from agents import ava_agent, AGENTS
from fastapi.concurrency import run_in_threadpool
from routes.decision import _eval_store
from services.pdf_parser import extract_text_from_pdf
from services.supabase_client import create_session, update_session_cv, update_session_status

router = APIRouter()


class StartInterviewRequest(BaseModel):
    candidate_name: str
    role: str = "Software Engineer"
    agent_id: str = "ava"
    session_id: Optional[str] = None


class MessageRequest(BaseModel):
    session_id: str
    user_message: str
    agent_id: str = "ava"


@router.post("/start")
async def start_interview(req: StartInterviewRequest):
    session_id = req.session_id if req.session_id else str(uuid.uuid4())
    try:
        agent = AGENTS.get(req.agent_id, ava_agent)
        
        # Gather previous interview context
        previous_context = []
        for other_id, other_agent in AGENTS.items():
            if other_id != req.agent_id and hasattr(other_agent, "sessions") and session_id in getattr(other_agent, "sessions", {}):
                ts = other_agent.get_transcript(session_id)
                if ts:
                    ts_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in ts])
                    previous_context.append(f"--- {other_id.upper()} INTERVIEW ---\n{ts_text}")
        
        prev_ctx_str = "\n\n".join(previous_context) if previous_context else ""

        welcome_message = await run_in_threadpool(
            agent.start_session,
            session_id=session_id,
            candidate_name=req.candidate_name,
            previous_context=prev_ctx_str
        )
        # Save to Supabase (non-blocking, ignore errors)
        try:
            await create_session(session_id, req.candidate_name, req.role)
        except Exception:
            pass  # Continue without DB if Supabase not configured

        return {
            "session_id": session_id,
            "welcome_message": welcome_message
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message")
async def send_message(req: MessageRequest):
    try:
        agent = AGENTS.get(req.agent_id, ava_agent)
        result = await run_in_threadpool(
            agent.send_message,
            req.session_id,
            req.user_message
        )
        
        if result.get("interview_complete") and req.agent_id != "atlas":
            session_id = req.session_id
            evals = _eval_store.get(session_id, {})
            cv_text = ava_agent.sessions.get(session_id, {}).get("cv_text", "")
            transcript = agent.get_transcript(session_id)
            
            try:
                if req.agent_id == "ava":
                    eval_res = await agent.evaluate(session_id)
                    evals["hr"] = eval_res
                elif req.agent_id == "orion":
                    combined_ts = ava_agent.get_transcript(session_id) + AGENTS["developer"].get_transcript(session_id)
                    eval_res = await agent.evaluate(cv_text, combined_ts, evals.get("hr", {}))
                    evals["cto"] = eval_res
                elif req.agent_id == "nova":
                    combined_ts = ava_agent.get_transcript(session_id) + AGENTS["accountant"].get_transcript(session_id)
                    eval_res = await agent.evaluate(cv_text, combined_ts, evals.get("hr", {}), evals.get("cto", {}))
                    evals["cfo"] = eval_res
                else:
                    eval_res = await agent.evaluate(cv_text, transcript)
                    evals[req.agent_id] = eval_res

                _eval_store[session_id] = evals
                
                # Check gating logic
                score = eval_res.get("score", 0)
                passed = score >= 60
                result["eval_result"] = eval_res
                result["passed"] = passed

            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error evaluating {req.agent_id}: {e}")
                result["passed"] = True # fail-safe

        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-cv")
async def upload_cv(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        cv_text = extract_text_from_pdf(contents)

        # Update active agent's session with CV context
        for agent in AGENTS.values():
            if hasattr(agent, "sessions") and session_id in getattr(agent, "sessions", {}):
                agent.sessions[session_id]["cv_text"] = cv_text
        
        # Try save to Supabase
        try:
            await update_session_cv(session_id, cv_text)
        except Exception:
            pass

        # Generate a brief acknowledgment summary (first 200 chars of CV)
        cv_summary = cv_text[:200].strip() + "..." if len(cv_text) > 200 else cv_text

        return {
            "session_id": session_id,
            "cv_extracted": cv_text,
            "cv_summary": cv_summary,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CV upload failed: {str(e)}")


@router.get("/transcript/{session_id}")
async def get_transcript(session_id: str):
    for agent in AGENTS.values():
        if hasattr(agent, "sessions") and session_id in getattr(agent, "sessions", {}):
            if hasattr(agent, "get_transcript"):
                return {"transcript": agent.get_transcript(session_id)}
    return {"transcript": []}
