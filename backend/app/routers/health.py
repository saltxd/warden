from fastapi import APIRouter
from ..services.proxmox import proxmox_client
from ..services.k3s import k3s_client

router = APIRouter(tags=["health"])


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
