from pydantic_settings import BaseSettings
from typing import List, Dict
import os


# Node SSH configuration (IP, user)
NODE_SSH_CONFIG: Dict[str, Dict[str, str]] = {
    # Proxmox hosts - use root
    "proxmox-0": {"ip": "10.0.0.10", "user": "root"},
    "proxmox-1": {"ip": "10.0.0.11", "user": "root"},
    "proxmox-2": {"ip": "10.0.0.12", "user": "root"},
    "proxmox-3": {"ip": "10.0.0.13", "user": "root"},
    # K3s nodes - use admin
    "k3s-cp-1": {"ip": "10.0.1.10", "user": "admin"},
    "k3s-cp-2": {"ip": "10.0.1.11", "user": "admin"},
    "k3s-cp-3": {"ip": "10.0.1.13", "user": "admin"},
    "k3s-worker-1": {"ip": "10.0.1.12", "user": "admin"},
}

# Legacy mapping for backwards compatibility
NODE_IPS: Dict[str, str] = {k: v["ip"] for k, v in NODE_SSH_CONFIG.items()}


class Settings(BaseSettings):
    # Proxmox
    PROXMOX_HOST: str = "10.0.0.10"
    PROXMOX_PORT: int = 8006
    PROXMOX_TOKEN_ID: str = "monitoring@pve!monitoring"
    PROXMOX_TOKEN_SECRET: str = ""
    PROXMOX_VERIFY_SSL: bool = False

    # K3s
    K3S_API_SERVER: str = "https://10.0.1.10:6443"
    K3S_KUBECONFIG_PATH: str = os.path.expanduser("~/.kube/config")

    # SSH
    SSH_USER: str = "root"
    SSH_KEY_PATH: str = os.path.expanduser("~/.ssh/id_ed25519")

    # Build Server (for Claude Code execution)
    BUILD_SERVER_HOST: str = "10.0.2.10"  # bastion - dedicated build server
    BUILD_SERVER_USER: str = "admin"
    BUILD_SERVER_PORT: int = 22
    PROJECTS_BASE_PATH: str = "/home/admin/projects"

    # Agent execution timeouts
    AGENT_TIMEOUT: int = 600  # 10 minutes per agent

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
