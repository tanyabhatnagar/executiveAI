# ExecuteAI - Autonomous AI Work Operating System

ExecuteAI is a student-portfolio-focused autonomous work operating system that transforms high-level goals into completed, self-validated deliverables by dynamically orchestrating specialized AI agents.

---

## 1. System Architecture

ExecuteAI utilizes a centralized planner to map goals to execution blueprints, which are then run through sequential agent nodes orchestrated by LangGraph.

```
                           +------------------------+
                           |   User Goal Input      |
                           +------------------------+
                                       |
                                       v
                           +------------------------+
                           |  Goal Analysis Engine  |
                           |   (Gemini Blueprint)   |
                           +------------------------+
                                       |
                                       v
                           +------------------------+
                           |  Dynamic Agent & Path  |
                           |       Generation       |
                           +------------------------+
                                       |
                                       v
                           +------------------------+
                           |   LangGraph Engine     |
                           |  Sequential Exec Nodes |
                           +------------------------+
                                       |
                                       v
         +-----------------------------+-----------------------------+
         |                                                           |
         v                                                           v
+------------------+                                        +------------------+
| validator_service|                                        |  memory_service  |
|  (QA Audits)     |                                        |  (Context Store) |
+------------------+                                        +------------------+
         |                                                           |
         +-----------------------------+-----------------------------+
                                       v
                           +------------------------+
                           |  Human-in-the-Loop     |
                           |  Approve/Edit/Regen    |
                           +------------------------+
                                       |
                                       v
                           +------------------------+
                           | Exports & Deliverables |
                           +------------------------+
```

---

## 2. Tech Stack

- **Frontend**: Next.js 16 (React 19), TypeScript, Tailwind CSS, TanStack React Query v5, Lucide Icons
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 (asyncio sqlite driver), LangGraph 0.1, Pydantic v2
- **AI Core**: Gemini API (model `gemini-1.5-flash` or `gemini-1.5-pro`)

---

## 3. Implemented Features

* **Authentication**: Email/Password user registration and login with JWT bearer verification.
* **Goal Analysis & Planning**: Maps high-level goals into blueprints containing domains, complexity analysis, structured deliverables, and dynamic agent configurations.
* **LangGraph Orchestrator**: Executes agents sequentially, feeding preceding outputs as context. Supports dynamic error boundaries and single-run retries.
* **Project Memory System**: Persists concise, high-density deliverable summaries. Feeds past runs context back to future agent execution runs.
* **Self-Validation Engine**: Audits agent outputs using structured JSON schemas to compute a confidence score. If under 80%, triggers an auto-repair loop (up to 2 attempts).
* **Usage Credits**: Enforces a simple 50 credits limit per user, decremented after every successful run, preventing executions at 0.
* **Human-in-the-Loop (HITL) Controls**: Allows editing, approving (which saves to memory timeline), and targeted single-agent regeneration from the results workspace.
* **Search & Filters**: Enables quick filtering by status (All, Draft, Running, Completed) and search query matches.
* **Exports**: Supports printing high-fidelity PDFs and exporting Markdown packages with complete metadata.

---

## 4. Repository Directory Structure

```text
├── backend/
│   ├── app/
│   │   ├── auth/            # Security, bearer token verify, and DB services
│   │   ├── database/        # Async engine, SessionLocal and DB models initializer
│   │   ├── models/          # SQLAlchemy schemas (user, project, blueprint, reliability)
│   │   ├── routes/          # API endpoints (auth, projects, blueprints, executions, reliability)
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        
│   │       ├── ai/          # Gemini client executions
│   │       ├── execution/   # LangGraph engine pipelines
│   │       ├── memory/      # Workspace memory summaries and loaders
│   │       ├── reliability/ # Stats calculations and feedback loaders
│   │       └── validation/  # Output validations
│   └── main.py              # Application startup, health checks, and lifespan
│
└── frontend/
    ├── app/
    │   ├── dashboard/       # Project list, stats panels, template modal
    │   ├── login/           # Authentication login page
    │   ├── projects/[id]/   # Dynamic workspace pages (blueprint, results, memory timeline)
    │   └── register/        # User sign up page
    ├── components/          # Reusable UI parts (Navbar, cards, table, toasts)
    ├── config/              # Centralized templates config library
    └── services/            # API fetch services
```

---

## 5. How To Run Locally

### Backend Setup
1. Navigate to `backend/` directory.
2. Initialize virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Create a `.env` file containing:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash
   ```
4. Start FastAPI server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### Frontend Setup
1. Navigate to `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Future Roadmap (Portfolio Pitch)

- **Vector Database Integration**: Leverage pgvector or Chroma to fetch memories via semantic search rather than raw categorization lists.
- **Parallel Graph Branching**: Modify the sequential LangGraph sequence to run independent agent nodes concurrently.
- **Custom Agent Templates**: Allow users to declare their own custom AI roles, prompts, and responsibilities.
