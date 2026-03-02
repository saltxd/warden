from fastapi import APIRouter
import asyncio
from ..services.proxmox import proxmox_client
from ..services.k3s import k3s_client
from ..config import NODE_SSH_CONFIG, settings

router = APIRouter(tags=["health"])


def _build_nodes_list() -> list[dict]:
    """Build node list from config for health checks."""
    nodes = [{"name": "bastion", "ip": settings.BUILD_SERVER_HOST, "role": "local"}]
    for name, cfg in NODE_SSH_CONFIG.items():
        if name.startswith("proxmox"):
            continue
        role = "control-plane" if "cp" in name else "worker"
        nodes.append({"name": name, "ip": cfg["ip"], "role": role})
    return nodes


NODES = _build_nodes_list()


async def check_node_status(ip: str) -> str:
    """Ping a node to check if it's reachable."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", "1", "-W", "2", ip,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=5)
        return "ready" if proc.returncode == 0 else "down"
    except asyncio.TimeoutError:
        return "down"
    except Exception:
        return "unknown"


@router.get("/nodes/status")
async def get_nodes_status():
    """Get status of all infrastructure nodes."""
    tasks = [check_node_status(node["ip"]) for node in NODES]
    statuses = await asyncio.gather(*tasks)

    results = []
    for node, status in zip(NODES, statuses):
        results.append({
            "name": node["name"],
            "ip": node["ip"],
            "role": node["role"],
            "status": status,
        })

    return {"nodes": results}


@router.get("/health")
async def health_check():
    """Check connectivity to Proxmox and K3s."""
    proxmox_ok = False
    k3s_ok = False
    proxmox_error = None
    k3s_error = None

    try:
        await proxmox_client.get_nodes()
        proxmox_ok = True
    except Exception as e:
        proxmox_error = str(e)

    try:
        k3s_ok = k3s_client.connected and len(k3s_client.get_nodes()) > 0
    except Exception as e:
        k3s_error = str(e)

    status = "ok" if (proxmox_ok and k3s_ok) else "degraded"
    if not proxmox_ok and not k3s_ok:
        status = "error"

    return {
        "status": status,
        "proxmox": {
            "status": "connected" if proxmox_ok else "disconnected",
            "error": proxmox_error,
        },
        "k3s": {
            "status": "connected" if k3s_ok else "disconnected",
            "error": k3s_error,
        },
    }
