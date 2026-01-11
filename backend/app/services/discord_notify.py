import aiohttp
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Discord webhook URL for Warden channel
DISCORD_WEBHOOK_URL = "DISCORD_WEBHOOK_URL"


async def send_job_started(job_id: str, task: str) -> Optional[str]:
    """
    Send initial job notification and return message ID for later editing.

    Returns:
        Message ID if successful, None otherwise
    """
    embed = {
        "title": "Job Running",
        "description": f"Background job `{job_id}` is running...",
        "color": 0x3498DB,  # Blue
        "fields": [
            {"name": "Task", "value": task[:200], "inline": False},
            {"name": "Status", "value": "In Progress", "inline": True},
        ],
        "footer": {"text": "Warden"},
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    payload = {"embeds": [embed]}

    try:
        async with aiohttp.ClientSession() as session:
            # Use ?wait=true to get the message back with its ID
            async with session.post(
                f"{DISCORD_WEBHOOK_URL}?wait=true",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    message_id = data.get("id")
                    logger.info(f"Discord job notification sent: {job_id}, message_id: {message_id}")
                    return message_id
                else:
                    text = await resp.text()
                    logger.error(f"Discord notification failed: {resp.status} - {text}")
                    return None
    except Exception as e:
        logger.exception(f"Failed to send Discord notification: {e}")
        return None


async def update_job_completed(
    message_id: str,
    job_id: str,
    task: str,
    duration_seconds: int,
    success: bool = True,
    summary: Optional[str] = None,
) -> bool:
    """
    Edit the job notification to show completion status.

    Args:
        message_id: The Discord message ID to edit
        job_id: The job identifier
        task: The task description
        duration_seconds: How long the job took
        success: Whether job succeeded
        summary: Optional output summary

    Returns:
        True if edit successful
    """
    if success:
        title = "Job Completed"
        color = 0x33FF33  # Green
        status = "Success"
    else:
        title = "Job Failed"
        color = 0xFF3333  # Red
        status = "Failed"

    fields = [
        {"name": "Task", "value": task[:200], "inline": False},
        {"name": "Duration", "value": f"{duration_seconds}s", "inline": True},
        {"name": "Status", "value": status, "inline": True},
    ]

    if summary:
        # Truncate summary for Discord field limit
        fields.append({"name": "Output", "value": f"```\n{summary[:900]}\n```", "inline": False})

    embed = {
        "title": title,
        "description": f"Background job `{job_id}` has finished.",
        "color": color,
        "fields": fields,
        "footer": {"text": "Warden"},
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    payload = {"embeds": [embed]}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.patch(
                f"{DISCORD_WEBHOOK_URL}/messages/{message_id}",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    logger.info(f"Discord job notification updated: {job_id}")
                    return True
                else:
                    text = await resp.text()
                    logger.error(f"Discord notification edit failed: {resp.status} - {text}")
                    return False
    except Exception as e:
        logger.exception(f"Failed to edit Discord notification: {e}")
        return False
