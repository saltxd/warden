from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Citadel Command Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/nodes")
async def get_nodes():
    # Stub for Phase 2
    return {"nodes": []}

@app.websocket("/ws/task/{task_id}")
async def task_websocket(websocket: WebSocket, task_id: str):
    await websocket.accept()
    # Stub for Phase 2
    await websocket.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
