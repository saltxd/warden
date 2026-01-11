import aiohttp
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Discord webhook URL for Warden channel
DISCORD_WEBHOOK_URL = "DISCORD_WEBHOOK_URL"


async def send_discord_notification(
    title: str,
    description: str,
    color: int = 0x33FF33,  # Green by default
    fields: Optional[list[dict]] = None,
    footer: Optional[str] = None,
) -> bool:
    """
    Send a Discord embed notification to the Warden channel.

    Args:
        title: Embed title
        description: Embed description
        color: Embed color (hex)
        fields: Optional list of {"name": str, "value": str, "inline": bool}
        footer: Optional footer text

    Returns:
        True if sent successfully
    """
    embed = {
        "title": title,
        "description": description,
        "color": color,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if fields:
        embed["fields"] = fields

    if footer:
        embed["footer"] = {"text": footer}
    else:
        embed["footer"] = {"text": "Warden"}

    payload = {"embeds": [embed]}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                DISCORD_WEBHOOK_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status in (200, 204):
                    logger.info(f"Discord notification sent: {title}")
                    return True
                else:
                    text = await resp.text()
                    logger.error(f"Discord notification failed: {resp.status} - {text}")
                    return False
    except Exception as e:
        logger.exception(f"Failed to send Discord notification: {e}")
        return False


async def notify_job_started(job_id: str, task: str) -> bool:
    """Notify that a background job has started."""
    return await send_discord_notification(
        title="Job Started",
        description=f"Background job `{job_id}` has started.",
        color=0x3498DB,  # Blue
        fields=[{"name": "Task", "value": task[:200], "inline": False}],
    )


async def notify_job_completed(
    job_id: str,
    task: str,
    duration_seconds: int,
    success: bool = True,
    summary: Optional[str] = None,
) -> bool:
    """Notify that a background job has completed."""
    if success:
        title = "Job Completed"
        color = 0x33FF33  # Green
        emoji = ""
    else:
        title = "Job Failed"
        color = 0xFF3333  # Red
        emoji = ""

    fields = [
        {"name": "Task", "value": task[:200], "inline": False},
        {"name": "Duration", "value": f"{duration_seconds}s", "inline": True},
        {"name": "Status", "value": f"{emoji} {'Success' if success else 'Failed'}", "inline": True},
    ]

    if summary:
        fields.append({"name": "Summary", "value": summary[:500], "inline": False})

    return await send_discord_notification(
        title=title,
        description=f"Background job `{job_id}` has finished.",
        color=color,
        fields=fields,
    )
