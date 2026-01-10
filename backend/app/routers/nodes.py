from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import Node, ClusterMetrics, K3sNode
from ..services.proxmox import proxmox_client
from ..services.k3s import k3s_client

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.get("", response_model=List[Node])
async def get_nodes():
    """Get all Proxmox nodes with K3s pod counts."""
    try:
        nodes = await proxmox_client.get_nodes()

        # Enrich with K3s pod counts
        for node in nodes:
            node.active_pods = k3s_client.get_pod_count_for_proxmox_node(node.name)

        return nodes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/k3s", response_model=List[K3sNode])
async def get_k3s_nodes():
    """Get all K3s nodes."""
    return k3s_client.get_nodes()


@router.get("/metrics", response_model=ClusterMetrics)
async def get_cluster_metrics():
    """Get aggregated cluster metrics."""
    try:
        nodes = await proxmox_client.get_nodes()

        online = [n for n in nodes if n.status != "offline"]

        return ClusterMetrics(
            total_cpu_percent=round(sum(n.cpu_percent for n in online) / len(online), 1) if online else 0,
            total_ram_used_gb=round(sum(n.ram_used_gb for n in nodes), 1),
            total_ram_total_gb=round(sum(n.ram_total_gb for n in nodes), 1),
            total_disk_used_tb=round(sum(n.disk_used_tb for n in nodes), 2),
            total_disk_total_tb=round(sum(n.disk_total_tb for n in nodes), 2),
            nodes_online=len(online),
            nodes_total=len(nodes),
            running_tasks=0,  # TODO: Track tasks in Phase 3
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vms")
async def get_vms() -> List[Dict[str, Any]]:
    """Get all VMs across the cluster."""
    try:
        return await proxmox_client.get_vms()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/storage")
async def get_storage() -> List[Dict[str, Any]]:
    """Get storage pools."""
    try:
        return await proxmox_client.get_storage()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{node_name}")
async def get_node_detail(node_name: str) -> Dict[str, Any]:
    """Get detailed info for a specific node."""
    try:
        return await proxmox_client.get_node_detail(node_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
