# Synapse Corp AI — Autonomous Hiring Intelligence Platform

![Synapse Corp AI](https://via.placeholder.com/800x200.png?text=SYNAPSE+CORP+AI)

## 1. Project Overview
Synapse Corp AI is a state-of-the-art, multi-agent artificial intelligence interview platform designed to simulate a realistic, rigorous corporate hiring pipeline. Instead of speaking to a single chatbot, candidates are subjected to a multi-stage gauntlet where they are interviewed sequentially by a panel of **7 specialized AI executives**. 

Each AI agent assumes a highly specific persona—ranging from HR to the CEO—evaluating the candidate on distinct metrics such as technical proficiency, culture fit, financial ROI, and market strategy. The system stress-tests candidates, generates real-time inter-agent deliberations, and produces a highly detailed, executive-ready PDF evaluation report.

---

## 2. Core Features

- **Sequential Corporate Gating (Fail-Fast Logic)**
  Candidates must "earn" their progression. After interacting with an agent, their responses are evaluated in the background. If a candidate scores below the minimum threshold (60/100), they are immediately rejected, and the interview sequence is terminated, saving compute resources.
  
- **Deterministic Consensus Scoring**
  To prevent LLM hallucination in final decision-making, the platform employs a hard programmatic constraint: if a candidate achieves an exceptional average score of **> 90/100** across all preliminary agents, the CEO is mathematically forced to issue a "HIRED" verdict, eliminating contradictory edge cases.

- **Cross-Agent Context Sharing**
  The AI panel communicates behind the scenes. When a candidate meets a new agent, that agent receives a compiled summary of all previous interviews. This ensures executives never repeat questions and can press the candidate on previous answers or gaps in their logic.

- **Zero-Downtime Provider Failover**
  To ensure enterprise-grade reliability and avoid API rate-limit errors during high traffic (e.g., Hackathons), the system defaults to **Google Gemini** but seamlessly fails over to **Featherless AI (Meta-Llama 3.1)** mid-conversation if quota limits are reached. This happens transparently without dropping the candidate's session.

- **Live Executive Deliberation**
  The platform features a highly secure Internal Dashboard. While the CEO determines the final verdict, the dashboard streams a live, WebSocket-powered "deliberation feed" showing the AI executives debating the candidate's merits in real-time.

- **Automated High-Fidelity PDF Reporting**
  Upon completion, the system generates a meticulously formatted, professional PDF dossier containing the scores, strengths, weaknesses, and executive summaries from all 7 agents, culminating in the CEO's final signature.

---

## 3. Technology Stack

### Backend Architecture
- **Core Framework**: Python 3, FastAPI, Uvicorn (Asynchronous API handling)
- **AI Integration**: `google-generativeai` (Gemini SDK), `openai` / `httpx` (Featherless fallback API)
- **Database**: Supabase / PostgreSQL (State management, CV storage, session tracking)
- **Real-Time Streaming**: FastAPI WebSockets
- **Document Processing**: `PyMuPDF` (for deep context CV parsing)

### Frontend Architecture
- **Framework**: Next.js 14 (React 18) using the App Router
- **Styling**: TailwindCSS, `clsx`, `class-variance-authority`
- **Animations**: Framer Motion (for fluid, high-end corporate transitions)
- **Icons**: Lucide React
- **Client-Side Generation**: `jspdf` (for generating dynamic, boundary-aware PDF reports)

---

## 4. The AI Executive Panel

The system relies on 7 distinct, highly-tuned personas located in `backend/agents/`. Each agent contributes to the candidate's final numerical average:

1. **Ava Chen (Head of HR)**: Conducts the initial behavioral screening. Focuses on culture fit, stakeholder management, and soft skills.
2. **Leo (Lead Developer)**: A rigorous technical interrogator. Focuses on system architecture, code optimization, live debugging concepts, and technical debt.
3. **Chloe (CMO)**: Evaluates go-to-market strategies, user acquisition loops, market sizing, and brand positioning.
4. **Miles (Lead Accountant)**: Focuses strictly on the numbers—P&L, cost-reduction, financial statements, and resource allocation.
5. **Orion (CTO)**: Synthesizes the HR and Developer reports. Asks high-level questions regarding technology vision, distributed systems, and scaling strategy.
6. **Nova (CFO)**: Synthesizes HR, CTO, and Accountant reports. Calculates total first-year cost, salary estimates, budget risk, and ROI timelines.
7. **Atlas (CEO)**: The final decision-maker. Reviews all 6 prior evaluation metrics and renders the ultimate hiring decision.

---

## 5. File Structure

```text
synapse-corp-ai/
│
├── backend/
│   ├── agents/                 # The 7 AI executive definitions & prompts
│   │   ├── ava_hr.py
│   │   ├── developer_agent.py
│   │   ├── marketing_agent.py
│   │   ├── accountant_agent.py
│   │   ├── orion_cto.py
│   │   ├── nova_cfo.py
│   │   └── atlas_ceo.py
│   │
│   ├── routes/                 # FastAPI REST Endpoints
│   │   ├── interview.py        # Core chat messaging & sequential gating logic
│   │   ├── evaluate.py         # Batch processing for agent evaluations
│   │   ├── decision.py         # Handles CEO final logic
│   │   └── websocket.py        # Real-time dashboard streaming manager
│   │
│   ├── services/               # Utility functions
│   │   ├── llm_fallback.py     # Unified API rate-limit handling & failover
│   │   ├── supabase_client.py  # Database interactions
│   │   └── pdf_parser.py       # PyMuPDF CV extraction
│   │
│   ├── main.py                 # FastAPI Application Entrypoint
│   ├── requirements.txt
│   └── .env                    # Secret keys (Gemini, Featherless, Supabase)
│
├── frontend/
│   ├── app/                    # Next.js Pages
│   │   ├── page.tsx            # Landing Page
│   │   ├── interview/          # Candidate-facing chat interface
│   │   ├── dashboard/          # Internal executive review dashboard (WebSockets)
│   │   └── results/            # Final CEO decision & PDF download
│   │
│   ├── components/             # Reusable UI widgets
│   ├── lib/                    # Client-side utilities (e.g., PDF gen helpers)
│   ├── styles/                 # Global CSS
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml          # Containerization orchestration
└── start_project.bat           # One-click Windows startup script
```

---

## 6. The Execution Workflow

1. **Initialization (`start_project.bat`)**: Boots the FastAPI server (Port 8000) and the Next.js development server (Port 3000).
2. **Candidate Onboarding (`/`)**: The user provides their name and optionally uploads a PDF CV. `pdf_parser.py` extracts the text and injects it into the global session context.
3. **The Gauntlet (`/interview`)**:
   - The candidate speaks with each agent sequentially (Ava -> Leo -> Chloe -> Miles -> Orion -> Nova -> Atlas).
   - After interacting with an agent, `backend/routes/interview.py` evaluates the transcript.
   - **Gating Logic**: If the candidate scores `< 60`, they are immediately rejected, bypassing all subsequent agents.
4. **Internal Deliberation (`/dashboard`)**:
   - The executive dashboard fetches all cached evaluations.
   - A WebSocket connection streams a real-time, LLM-generated debate between the agents based on the candidate's actual performance metrics.
5. **Final Verdict (`/results`)**:
   - The CEO computes the combined average of all agents. If the score is > 90, the candidate is auto-hired. Otherwise, the CEO makes a judgement call.
   - The candidate views their confidential evaluation dashboard and can download their generated PDF report.

---

## 7. Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- API Keys for Google Gemini (and optionally Featherless AI & Supabase)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory:
```env
GEMINI_API_KEY=your_gemini_key
FEATHERLESS_API_KEY=your_featherless_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Running the Platform
Simply execute the provided Windows batch file from the root directory:
```bash
.\start_project.bat
```
- Frontend will be available at: `http://localhost:3000`
- Backend API docs will be available at: `http://localhost:8000/docs`
