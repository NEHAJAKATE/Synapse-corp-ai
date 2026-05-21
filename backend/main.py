from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, json, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Synapse Corp AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include all routers
from routes.interview import router as interview_router
from routes.evaluate import router as evaluate_router
from routes.decision import router as decision_router
from routes.websocket import router as ws_router

app.include_router(interview_router, prefix="/interview", tags=["interview"])
app.include_router(evaluate_router, prefix="/evaluate", tags=["evaluate"])
app.include_router(decision_router, prefix="/decision", tags=["decision"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Synapse Corp AI"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
