from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import nodes, health, tasks

app = FastAPI(
    title="Citadel Command Backend",
    description="Backend API for Citadel homelab command center",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(nodes.router)
app.include_router(tasks.router)


@app.get("/")
async def root():
    return {
        "message": "Citadel Command Backend",
        "version": "2.0.0",
        "docs": "/docs",
    }
