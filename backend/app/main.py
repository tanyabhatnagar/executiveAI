from contextlib import asynccontextmanager
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import engine
from app.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="ExecuteAI API", version="0.1.0", lifespan=lifespan)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "*")],  # Restrict to Vercel frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes.auth import router as auth_router
app.include_router(auth_router)

from app.routes.projects import router as projects_router
app.include_router(projects_router)

from app.routes.blueprints import router as blueprints_router
app.include_router(blueprints_router)

from app.routes.executions import router as executions_router
app.include_router(executions_router)

from app.routes.reliability import router as reliability_router
app.include_router(reliability_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
