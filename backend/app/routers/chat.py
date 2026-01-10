from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
import asyncio
import uuid
import logging
import re
from datetime import datetime, timezone

from ..services.local_runner import LocalClaudeRunner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def get_local_timestamp() -> str:
    """Get current local time as ISO string."""
    return datetime.now().astimezone().isoformat()


def clean_terminal_output(text: str) -> str:
    """Remove terminal escape codes from output."""
    if not text:
        return text
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    text = ansi_escape.sub('', text)
    # Remove terminal mode codes
    text = re.sub(r'\[\?[0-9]+[lh]', '', text)
    text = re.sub(r'\[<u', '', text)
    text = re.sub(r'\[\d*[ABCDEFGJKST]', '', text)
    # Remove carriage returns and other control chars
    text = text.replace('\r', '')
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text.strip()

# Store conversation history per session
CONVERSATIONS: dict[str, list[dict]] = {}

# Active WebSocket connections
CONNECTIONS: dict[str, WebSocket] = {}


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, session_id: Optional[str] = None):
    """WebSocket for real-time chat with Claude Code."""
    await websocket.accept()

    # Create or use session
    if not session_id or session_id not in CONVERSATIONS:
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        CONVERSATIONS[session_id] = []

    CONNECTIONS[session_id] = websocket

    # Send session ID to client
    await websocket.send_json(
        {
            "type": "connected",
            "session_id": session_id,
            "history": CONVERSATIONS[session_id],
        }
    )

    try:
        while True:
            # Receive message from user
            data = await websocket.receive_json()

            if data.get("type") == "message":
                user_message = data.get("content", "")

                # Add to history
                CONVERSATIONS[session_id].append(
                    {
                        "role": "user",
                        "content": user_message,
                        "timestamp": get_local_timestamp(),
                    }
                )

                # Send acknowledgment
                await websocket.send_json(
                    {
                        "type": "user_message",
                        "content": user_message,
                        "timestamp": get_local_timestamp(),
                    }
                )

                # Process with Claude Code
                await process_message(session_id, user_message, websocket)

    except WebSocketDisconnect:
        logger.info(f"Session {session_id} disconnected")
        if session_id in CONNECTIONS:
            del CONNECTIONS[session_id]


async def process_message(session_id: str, message: str, websocket: WebSocket):
    """Send message to Claude Code and stream response."""

    # Build context from conversation history
    history = CONVERSATIONS[session_id]
    context = build_context(history)

    # Build the prompt
    prompt = f"""{context}

USER MESSAGE:
{message}

---

You are Warden, an AI assistant with access to a homelab via SSH.

AVAILABLE NODES (SSH from this machine):
- k3s-cp-1 (10.0.1.10) - Fort Zero, K3s control plane
- k3s-cp-2 (10.0.1.11) - Watchtower, K3s control plane
- k3s-cp-3 (10.0.1.13) - Sigil, K3s control plane
- k3s-worker-1 (10.0.1.12) - Watchtower worker node
- fz-dns / wt-dns - AdGuard DNS servers
- Proxmox nodes: proxmox-0 (10.0.0.10), proxmox-1 (10.0.0.11), proxmox-2 (10.0.0.12), proxmox-3 (10.0.0.13)

CAPABILITIES:
- SSH to any node and run commands
- Check system status, logs, configs
- Create documentation
- Analyze and troubleshoot issues
- Run kubectl commands for K3s (kubeconfig at ~/.kube/config)

INSTRUCTIONS:
- Be concise and helpful
- If you need to SSH somewhere, just do it
- If you need clarification, ask
- Show relevant output, summarize if too long
- If you create files, mention where they are
- Format output as PLAIN TEXT only - no markdown
- Use UPPERCASE for emphasis instead of **bold** or *italic*
- Use simple ASCII for tables and structure

Respond to the user's message:
"""

    # Send "thinking" indicator
    await websocket.send_json(
        {"type": "assistant_start", "timestamp": get_local_timestamp()}
    )

    full_response = []

    try:
        claude = LocalClaudeRunner(workspace="/home/admin")

        async def on_output(line: str):
            # Clean terminal escape codes
            cleaned = clean_terminal_output(line)
            if cleaned:  # Only send non-empty lines
                full_response.append(cleaned)
                await websocket.send_json(
                    {
                        "type": "assistant_chunk",
                        "content": cleaned,
                        "timestamp": get_local_timestamp(),
                    }
                )

        await claude.run_agent(
            prompt=prompt,
            on_output=on_output,
            timeout=300,  # 5 min timeout for chat
        )

    except Exception as e:
        logger.exception("Error processing message")
        await websocket.send_json(
            {
                "type": "error",
                "content": f"Error: {str(e)}",
                "timestamp": get_local_timestamp(),
            }
        )
        return

    # Combine response and save to history
    assistant_message = "\n".join(full_response)
    CONVERSATIONS[session_id].append(
        {
            "role": "assistant",
            "content": assistant_message,
            "timestamp": get_local_timestamp(),
        }
    )

    # Send completion
    await websocket.send_json(
        {"type": "assistant_done", "timestamp": get_local_timestamp()}
    )


def build_context(history: list[dict]) -> str:
    """Build conversation context from history."""
    if not history:
        return "No previous conversation."

    # Take last 10 messages for context
    recent = history[-10:]

    lines = ["CONVERSATION HISTORY:"]
    for msg in recent:
        role = "User" if msg["role"] == "user" else "Warden"
        content = msg["content"]
        # Truncate long messages in context
        if len(content) > 500:
            content = content[:500] + "..."
        lines.append(f"{role}: {content}")

    return "\n".join(lines)


@router.get("/sessions")
async def list_sessions():
    """List active chat sessions."""
    return {
        "sessions": [
            {
                "id": sid,
                "messages": len(msgs),
                "last_active": msgs[-1]["timestamp"] if msgs else None,
            }
            for sid, msgs in CONVERSATIONS.items()
        ]
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    if session_id in CONVERSATIONS:
        del CONVERSATIONS[session_id]
    return {"status": "deleted"}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific chat session's history."""
    if session_id not in CONVERSATIONS:
        return {"error": "Session not found", "history": []}
    return {"session_id": session_id, "history": CONVERSATIONS[session_id]}
