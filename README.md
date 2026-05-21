# ⟡ Synapse Corp AI
### The First Autonomous AI Workforce Simulation Platform
**Milan AI Week — AI Agent Olympics Hackathon 2026**

---

## What It Does

Synapse Corp AI simulates a complete AI-powered company that autonomously interviews, evaluates, and hires candidates using 4 specialised AI agents with real-time voice interaction.

The system conducts a **full end-to-end hiring pipeline**:
1. **Voice Interview** — Ava HR conducts a 6-question interview via Speechmatics STT
2. **Technical Review** — Orion CTO evaluates technical depth from CV + answers
3. **Financial Analysis** — Nova CFO calculates salary cost and budget impact  
4. **Executive Decision** — Atlas CEO synthesises all reports and makes the final call

---

## AI Agents

| Agent | Role | Model | Capability |
|-------|------|-------|-----------|
| **Ava HR** | Head of Human Resources | Gemini 2.0 Flash | Voice interviews, CV analysis, behavioral evaluation |
| **Orion CTO** | Chief Technology Officer | Gemini 2.0 Flash | Technical depth, skills gap, architecture assessment |
| **Nova CFO** | Chief Financial Officer | Featherless AI (Llama 3.1) | Salary benchmarking, budget risk, ROI analysis |
| **Atlas CEO** | Chief Executive Officer | Gemini 2.0 Flash | Multi-agent orchestration, final hiring decision |

---

## Sponsor Technologies

| Sponsor | Usage |
|---------|-------|
| **Speechmatics** | Real-time speech-to-text for live voice interviews |
| **Google Gemini 2.0 Flash** | Ava HR, Orion CTO, Atlas CEO reasoning |
| **Featherless AI** | Nova CFO agent (Llama 3.1 8B Instruct via OpenAI-compat API) |
| **Vultr** | Backend FastAPI deployment |
| **Supabase** | Session storage, evaluation data, transcript logs |

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Framer Motion
- **Backend**: FastAPI (Python 3.11), WebSockets
- **Voice**: Speechmatics Real-Time API + Web Speech API fallback
- **AI**: Google Gemini 2.0 Flash, Featherless AI
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vultr (backend), Vercel (frontend)
- **PDF**: jsPDF for evaluation report generation

---

## Project Structure

```
synapse-corp-ai/
├── frontend/          # Next.js 14 app
│   ├── app/           # Pages: landing, interview, dashboard, results
│   ├── components/    # Reusable UI components
│   └── lib/           # Speechmatics, Gemini, WebSocket, PDF clients
├── backend/           # FastAPI Python app
│   ├── agents/        # 4 AI agents (Ava, Orion, Nova, Atlas)
│   ├── routes/        # API endpoints + WebSocket
│   ├── models/        # Pydantic data models
│   └── services/      # PDF parser, Supabase, Featherless clients
├── Dockerfile.backend
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- API Keys: Gemini, Featherless AI, Speechmatics, Supabase

### 1. Clone and Configure

```bash
git clone <your-repo-url>
cd synapse-corp-ai
```

**Backend** — edit `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
FEATHERLESS_API_KEY=your_key_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
SPEECHMATICS_API_KEY=your_key_here
CORS_ORIGINS=http://localhost:3000
```

**Frontend** — edit `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_SPEECHMATICS_API_KEY=your_key_here
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# Server starts at http://localhost:8000
# Health check: GET http://localhost:8000/health
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:3000
```

---

## Supabase Schema

Run in Supabase SQL Editor:

```sql
CREATE TABLE interview_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  candidate_name TEXT,
  role_applied TEXT DEFAULT 'Software Engineer',
  cv_text TEXT,
  status TEXT DEFAULT 'pending',
  hr_score INTEGER,
  hr_strengths TEXT[],
  hr_weaknesses TEXT[],
  hr_summary TEXT,
  hr_recommendation TEXT,
  cto_score INTEGER,
  cto_technical_assessment TEXT,
  cto_risk_level TEXT,
  cto_summary TEXT,
  cfo_salary_estimate INTEGER,
  cfo_total_cost INTEGER,
  cfo_budget_risk TEXT,
  cfo_summary TEXT,
  ceo_decision TEXT,
  ceo_reasoning TEXT,
  ceo_confidence INTEGER,
  transcript JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE agent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES interview_sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  from_agent TEXT,
  to_agent TEXT,
  message_type TEXT,
  content TEXT
);
```

---

## Deployment on Vultr

```bash
# On Vultr Ubuntu 22.04 instance
apt update && apt install -y docker.io docker-compose git

git clone <your-repo-url>
cd synapse-corp-ai

# Configure API keys
cp backend/.env backend/.env.production
nano backend/.env.production

# Deploy with Docker
docker-compose up -d --build

# Verify
curl http://localhost:8000/health
```

---

## Demo Flow

```
1. Landing page → "Begin Your Interview"
2. Enter name → Ava greets you by voice (browser TTS)
3. Upload CV PDF → Ava acknowledges and adapts questions
4. 6 voice exchanges → transcript fills in real-time
5. Interview ends → redirected to Dashboard
6. Click "Run Agent Evaluation" → watch 4 agents activate
7. Inter-agent messages stream in real-time
8. CEO delivers verdict with confidence score
9. View Full Report → download PDF evaluation
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/interview/start` | Start new interview session |
| POST | `/interview/message` | Send candidate message to Ava |
| POST | `/interview/upload-cv` | Upload CV PDF for parsing |
| GET | `/interview/transcript/{id}` | Get session transcript |
| POST | `/evaluate/run-all` | Run all 3 agent evaluations |
| POST | `/decision/final` | Get CEO final decision |
| GET | `/decision/report/{id}` | Get full report data |
| WS | `/ws/session/{id}` | Real-time agent status events |

---

*Built for the Milan AI Week — AI Agent Olympics Hackathon 2026*
