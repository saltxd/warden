from kubernetes import client, config
from typing import List, Dict
from ..config import settings
from ..models import K3sNode

# Map K3s nodes to their Proxmox hosts
K3S_TO_PROXMOX = {
    "k3s-cp-1": "proxmox-0",
    "k3s-cp-2": "proxmox-1",
    "k3s-cp-3": "proxmox-2",
    "k3s-worker-1": "proxmox-1",
}


class K3sClient:
    def __init__(self):
        self.kubeconfig_path = settings.K3S_KUBECONFIG_PATH
        self.connected = False
        self.v1 = None
        self._load_config()

    def _load_config(self):
        """Load kubeconfig from file."""
        try:
            config.load_kube_config(config_file=self.kubeconfig_path)
            self.v1 = client.CoreV1Api()
            self.connected = True
            print(f"K3s client connected using {self.kubeconfig_path}")
        except Exception as e:
            print(f"Warning: Could not connect to K3s: {e}")
            self.connected = False

    def get_nodes(self) -> List[K3sNode]:
        """Get all K3s nodes with metrics."""
        if not self.connected or not self.v1:
            return []

        try:
            nodes = self.v1.list_node()
            result = []

            for node in nodes.items:
                name = node.metadata.name

                # Get node conditions
                conditions = {c.type: c.status for c in node.status.conditions}
                status = "Ready" if conditions.get("Ready") == "True" else "NotReady"

                # Get roles from labels
                roles = []
                labels = node.metadata.labels or {}
                if labels.get("node-role.kubernetes.io/control-plane"):
                    roles.append("control-plane")
                if labels.get("node-role.kubernetes.io/master"):
                    roles.append("master")
                if not roles:
                    roles.append("worker")

                # Get pod count on this node
                pods = self.v1.list_pod_for_all_namespaces(
                    field_selector=f"spec.nodeName={name}"
                )
                pod_count = len([p for p in pods.items if p.status.phase == "Running"])

                result.append(K3sNode(
                    name=name,
                    status=status,
                    roles=roles,
                    cpu_percent=0,  # Would need metrics-server for real values
                    ram_percent=0,
                    pods=pod_count,
                    proxmox_host=K3S_TO_PROXMOX.get(name, "unknown"),
                ))

            return result
        except Exception as e:
            print(f"Error getting K3s nodes: {e}")
            return []

    def get_pods_by_node(self) -> Dict[str, int]:
        """Get pod count per node."""
        if not self.connected or not self.v1:
            return {}

        try:
            pods = self.v1.list_pod_for_all_namespaces()
            counts: Dict[str, int] = {}
            for pod in pods.items:
                if pod.status.phase == "Running":
                    node = pod.spec.node_name
                    if node:
                        counts[node] = counts.get(node, 0) + 1
            return counts
        except Exception as e:
            print(f"Error getting pods by node: {e}")
            return {}

    def get_pod_count_for_proxmox_node(self, proxmox_node: str) -> int:
        """Get total pods running on K3s nodes hosted by a Proxmox node."""
        pod_counts = self.get_pods_by_node()
        total = 0
        for k3s_node, proxmox_host in K3S_TO_PROXMOX.items():
            if proxmox_host == proxmox_node:
                total += pod_counts.get(k3s_node, 0)
        return total


# Singleton instance
k3s_client = K3sClient()
