from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import health, chat, jobs

app = FastAPI(
    title="Warden API",
    description="Chat interface for homelab infrastructure via Claude Code",
    version="3.0.0",
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Primary router - the chat
app.include_router(chat.router)

# Keep health for monitoring
app.include_router(health.router)

# Keep jobs router for file browser functionality
app.include_router(jobs.router)


@app.get("/")
async def root():
    return {
        "name": "Warden",
        "description": "Chat interface for homelab infrastructure",
        "version": "3.0.0",
        "docs": "/docs",
    }
