import logging
from kubernetes import client, config
from typing import List, Dict
from ..config import settings
from ..models import K3sNode

logger = logging.getLogger(__name__)

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
        """Load kubeconfig - try in-cluster first, then file."""
        # Try in-cluster config first (when running in K8s)
        try:
            config.load_incluster_config()
            self.v1 = client.CoreV1Api()
            self.connected = True
            print("K3s client connected using in-cluster config")
            return
        except config.ConfigException:
            pass  # Not running in cluster, try file

        # Fall back to kubeconfig file (local development)
        try:
            config.load_kube_config(config_file=self.kubeconfig_path)
            self.v1 = client.CoreV1Api()
            self.connected = True
            logger.info(f"K3s client connected using {self.kubeconfig_path}")
        except Exception as e:
            logger.warning(f"Could not connect to K3s: {e}")
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

                # Try to get real metrics from metrics-server
                cpu_percent = 0.0
                ram_percent = 0.0
                try:
                    custom_api = client.CustomObjectsApi()
                    node_metrics = custom_api.get_cluster_custom_object(
                        "metrics.k8s.io", "v1beta1", "nodes", name
                    )
                    # Parse CPU (e.g., "250m" = 250 millicores)
                    cpu_usage = node_metrics.get("usage", {}).get("cpu", "0")
                    if cpu_usage.endswith("n"):
                        cpu_nano = int(cpu_usage[:-1])
                        cpu_percent = round(cpu_nano / 1e9 / 4 * 100, 1)  # Assume 4 cores
                    elif cpu_usage.endswith("m"):
                        cpu_milli = int(cpu_usage[:-1])
                        cpu_percent = round(cpu_milli / 4000 * 100, 1)
                    # Parse memory (e.g., "1234Ki")
                    mem_usage = node_metrics.get("usage", {}).get("memory", "0")
                    if mem_usage.endswith("Ki"):
                        mem_kb = int(mem_usage[:-2])
                        # Get allocatable memory from node status
                        alloc_mem = node.status.allocatable.get("memory", "0")
                        if alloc_mem.endswith("Ki"):
                            total_kb = int(alloc_mem[:-2])
                            if total_kb > 0:
                                ram_percent = round(mem_kb / total_kb * 100, 1)
                except Exception:
                    pass  # metrics-server not available, use 0

                result.append(K3sNode(
                    name=name,
                    status=status,
                    roles=roles,
                    cpu_percent=cpu_percent,
                    ram_percent=ram_percent,
                    pods=pod_count,
                    proxmox_host=K3S_TO_PROXMOX.get(name, "unknown"),
                ))

            return result
        except Exception as e:
            logger.error(f"Error getting K3s nodes: {e}")
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
            logger.error(f"Error getting pods by node: {e}")
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
