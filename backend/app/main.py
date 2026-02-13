import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .middleware import AuthMiddleware, RequestLoggingMiddleware
from .routers import health, chat, jobs

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Warden API",
    description="Chat interface for homelab infrastructure via Claude Code",
    version="3.1.0",
)

# CORS - use configured origins (defaults to localhost dev ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication middleware
app.add_middleware(AuthMiddleware)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# Primary router - the chat
app.include_router(chat.router)

# Keep health for monitoring (under /api prefix for nginx routing)
app.include_router(health.router, prefix="/api")

# Keep jobs router for file browser functionality
app.include_router(jobs.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Warden API starting up")
    if settings.auth_enabled:
        logger.info("API key authentication enabled")
    else:
        logger.warning("API key authentication DISABLED - set API_KEY env var for production")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown."""
    logger.info("Warden API shutting down")
    # Cancel any running jobs
    from .routers.jobs import JOBS
    from .models import JobStatus
    for job_id, job in JOBS.items():
        if job.status == JobStatus.running:
            job.status = JobStatus.cancelled
            logger.info(f"Cancelled running job {job_id} on shutdown")


@app.get("/")
async def root():
    return {
        "name": "Warden",
        "description": "Chat interface for homelab infrastructure",
        "version": "3.1.0",
        "docs": "/docs",
    }
