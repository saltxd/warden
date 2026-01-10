import httpx
from typing import List, Dict, Any
from ..config import settings
from ..models import Node, NodeStatus, NodePosition

# Node position mapping (percentage-based for SVG)
NODE_POSITIONS = {
    "proxmox-0": NodePosition(x=50, y=50),   # center
    "proxmox-1": NodePosition(x=50, y=15),  # top
    "proxmox-2": NodePosition(x=85, y=50),       # right
    "proxmox-3": NodePosition(x=15, y=50),      # left
}

# K3s nodes running on each Proxmox host
K3S_NODE_MAP = {
    "proxmox-0": ["k3s-cp-1"],
    "proxmox-1": ["k3s-cp-2", "k3s-worker-1"],
    "proxmox-2": ["k3s-cp-3"],
    "proxmox-3": [],
}


class ProxmoxClient:
    def __init__(self):
        self.base_url = f"https://{settings.PROXMOX_HOST}:{settings.PROXMOX_PORT}/api2/json"
        self.headers = {
            "Authorization": f"PVEAPIToken={settings.PROXMOX_TOKEN_ID}={settings.PROXMOX_TOKEN_SECRET}"
        }
        self.verify_ssl = settings.PROXMOX_VERIFY_SSL

    async def _request(self, endpoint: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(verify=self.verify_ssl) as client:
            response = await client.get(
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()["data"]

    async def get_nodes(self) -> List[Node]:
        """Fetch all Proxmox nodes with real metrics."""
        data = await self._request("/cluster/resources?type=node")

        nodes = []
        for item in data:
            node_name = item["node"]

            # Calculate percentages
            cpu_percent = round(item.get("cpu", 0) * 100, 1)
            ram_used = item.get("mem", 0) / (1024**3)  # bytes to GB
            ram_total = item.get("maxmem", 0) / (1024**3)
            disk_used = item.get("disk", 0) / (1024**4)  # bytes to TB
            disk_total = item.get("maxdisk", 0) / (1024**4)

            # Determine status based on CPU usage and online status
            if item.get("status") != "online":
                status = NodeStatus.offline
            elif cpu_percent > 90:
                status = NodeStatus.error
            elif cpu_percent > 70:
                status = NodeStatus.busy
            else:
                status = NodeStatus.idle

            nodes.append(Node(
                id=node_name,
                name=node_name,
                type="proxmox",
                cpu_percent=cpu_percent,
                ram_used_gb=round(ram_used, 1),
                ram_total_gb=round(ram_total, 1),
                disk_used_tb=round(disk_used, 2),
                disk_total_tb=round(disk_total, 2),
                status=status,
                position=NODE_POSITIONS.get(node_name, NodePosition(x=50, y=50)),
                k3s_nodes=K3S_NODE_MAP.get(node_name, []),
                active_pods=0,  # Will be filled by K3s service
                uptime=item.get("uptime"),
            ))

        return nodes

    async def get_node_detail(self, node_name: str) -> Dict[str, Any]:
        """Get detailed info for a specific node."""
        return await self._request(f"/nodes/{node_name}/status")

    async def get_vms(self) -> List[Dict[str, Any]]:
        """Get all VMs across cluster."""
        return await self._request("/cluster/resources?type=vm")

    async def get_storage(self) -> List[Dict[str, Any]]:
        """Get storage pools."""
        return await self._request("/cluster/resources?type=storage")


# Singleton instance
proxmox_client = ProxmoxClient()
