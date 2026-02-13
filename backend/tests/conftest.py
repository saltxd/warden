import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock kubernetes before it gets imported
sys.modules['kubernetes'] = MagicMock()
sys.modules['kubernetes.client'] = MagicMock()
sys.modules['kubernetes.config'] = MagicMock()


@pytest.fixture
def mock_settings():
    """Override settings for testing."""
    with patch('app.config.settings') as mock:
        mock.PROXMOX_HOST = "127.0.0.1"
        mock.PROXMOX_PORT = 8006
        mock.PROXMOX_TOKEN_ID = "test@pve!test"
        mock.PROXMOX_TOKEN_SECRET = "test-secret"
        mock.PROXMOX_VERIFY_SSL = False
        mock.BUILD_SERVER_HOST = "127.0.0.1"
        mock.BUILD_SERVER_USER = "testuser"
        mock.BUILD_SERVER_PORT = 22
        mock.PROJECTS_BASE_PATH = "/tmp/test-projects"
        mock.AGENT_TIMEOUT = 60
        mock.SSH_KEY_PATH = "/tmp/test-key"
        mock.SSH_KNOWN_HOSTS_PATH = None
        mock.API_KEY = ""
        mock.auth_enabled = False
        mock.cors_origins_list = ["http://localhost:5173"]
        mock.CORS_ORIGINS = "http://localhost:5173"
        mock.K3S_KUBECONFIG_PATH = "/tmp/kubeconfig"
        mock.K3S_API_SERVER = "https://127.0.0.1:6443"
        yield mock
