"""SSH service for executing commands on remote nodes."""
import asyncio
import asyncssh
from typing import List, Optional, Callable, Awaitable, Tuple
from datetime import datetime
from ..config import settings, NODE_SSH_CONFIG
import logging

logger = logging.getLogger(__name__)


class SSHExecutor:
    """Execute commands on remote nodes via SSH."""

    def __init__(self):
        self.key_path = settings.SSH_KEY_PATH
        self.known_hosts_path = settings.SSH_KNOWN_HOSTS_PATH

    def _get_node_config(self, node_id: str) -> Optional[Tuple[str, str]]:
        """Get IP and user for a node ID."""
        config = NODE_SSH_CONFIG.get(node_id)
        if config:
            return config["ip"], config["user"]
        return None

    def _timestamp(self) -> str:
        """Get formatted timestamp for logs."""
        return datetime.now().strftime("%H:%M:%S")

    def _get_known_hosts(self):
        """Get known_hosts configuration."""
        if self.known_hosts_path:
            try:
                return asyncssh.read_known_hosts(self.known_hosts_path)
            except Exception:
                logger.warning(f"Could not read known_hosts from {self.known_hosts_path}, accepting all keys")
        return None

    async def execute_command(
        self,
        node_id: str,
        command: str,
        log_callback: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> tuple[bool, List[str]]:
        """
        Execute a command on a remote node.

        Args:
            node_id: The node identifier (e.g., 'proxmox-0', 'k3s-cp-1')
            command: The command to execute
            log_callback: Optional async callback for streaming logs

        Returns:
            Tuple of (success: bool, logs: List[str])
        """
        logs: List[str] = []

        async def log(msg: str):
            timestamped = f"[{self._timestamp()}] {msg}"
            logs.append(timestamped)
            if log_callback:
                await log_callback(timestamped)

        node_config = self._get_node_config(node_id)
        if not node_config:
            await log(f"ERROR: Unknown node '{node_id}'")
            return False, logs

        ip, user = node_config
        await log(f"Connecting to {node_id} ({ip}) as {user}...")

        try:
            async with asyncssh.connect(
                ip,
                username=user,
                client_keys=[self.key_path],
                known_hosts=self._get_known_hosts(),
            ) as conn:
                await log(f"Connected successfully")
                await log(f"Executing: {command}")

                result = await conn.run(command, check=False)

                # Stream stdout
                if result.stdout:
                    for line in result.stdout.strip().split("\n"):
                        if line:
                            await log(line)

                # Stream stderr
                if result.stderr:
                    for line in result.stderr.strip().split("\n"):
                        if line:
                            await log(f"STDERR: {line}")

                if result.exit_status == 0:
                    await log(f"Command completed successfully (exit code: 0)")
                    return True, logs
                else:
                    await log(f"Command failed (exit code: {result.exit_status})")
                    return False, logs

        except asyncssh.DisconnectError as e:
            await log(f"SSH disconnected: {e}")
            return False, logs
        except asyncssh.PermissionDenied as e:
            await log(f"SSH permission denied: {e}")
            return False, logs
        except asyncssh.HostKeyNotVerifiable as e:
            await log(f"SSH host key not verified: {e}")
            return False, logs
        except OSError as e:
            await log(f"Connection error: {e}")
            return False, logs
        except Exception as e:
            await log(f"Unexpected error: {type(e).__name__}: {e}")
            return False, logs

    async def check_services(
        self,
        node_id: str,
        log_callback: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> tuple[bool, List[str]]:
        """Check running services on a node (docker/systemd)."""
        logs: List[str] = []

        async def log(msg: str):
            timestamped = f"[{self._timestamp()}] {msg}"
            logs.append(timestamped)
            if log_callback:
                await log_callback(timestamped)

        await log(f"Checking services on {node_id}...")

        # Check for docker
        success, docker_logs = await self.execute_command(
            node_id,
            "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo 'Docker not available'",
            log_callback,
        )
        logs.extend(docker_logs[len(logs) :])

        # Check for k3s/kubernetes
        await log("Checking Kubernetes pods...")
        success2, k8s_logs = await self.execute_command(
            node_id,
            "kubectl get pods -A --no-headers 2>/dev/null | head -20 || echo 'kubectl not available'",
            log_callback,
        )
        logs.extend(k8s_logs[len(logs) :])

        # Check systemd critical services
        await log("Checking systemd services...")
        success3, systemd_logs = await self.execute_command(
            node_id,
            "systemctl list-units --type=service --state=running --no-pager | head -15",
            log_callback,
        )
        logs.extend(systemd_logs[len(logs) :])

        return success or success2 or success3, logs

    async def check_resources(
        self,
        node_id: str,
        log_callback: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> tuple[bool, List[str]]:
        """Check resource usage on a node."""
        command = """
echo "=== CPU & Memory ===" && \
top -bn1 | head -5 && \
echo "" && \
echo "=== Disk Usage ===" && \
df -h | grep -E '^/dev/' && \
echo "" && \
echo "=== Memory Details ===" && \
free -h
"""
        return await self.execute_command(node_id, command, log_callback)


# Global instance
ssh_executor = SSHExecutor()
