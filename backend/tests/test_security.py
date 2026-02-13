"""Tests for security features - path traversal, auth, etc."""
import pytest


def test_path_traversal_blocked():
    """Test that path traversal attacks are blocked."""
    from app.routers.jobs import validate_workspace_path
    from fastapi import HTTPException

    workspace = "/home/user/projects/job_123"

    # Valid paths should work
    assert validate_workspace_path(workspace, "src/main.py") == f"{workspace}/src/main.py"
    assert validate_workspace_path(workspace, "README.md") == f"{workspace}/README.md"

    # Path traversal should raise
    with pytest.raises(HTTPException) as exc_info:
        validate_workspace_path(workspace, "../../../etc/passwd")
    assert exc_info.value.status_code == 400

    with pytest.raises(HTTPException) as exc_info:
        validate_workspace_path(workspace, "../../secret")
    assert exc_info.value.status_code == 400

    with pytest.raises(HTTPException) as exc_info:
        validate_workspace_path(workspace, "foo/../../../bar")
    assert exc_info.value.status_code == 400


def test_path_traversal_single_dot():
    """Single dots in paths should be OK."""
    from app.routers.jobs import validate_workspace_path

    workspace = "/home/user/projects/job_123"
    # Single dot is fine
    result = validate_workspace_path(workspace, "./src/main.py")
    # Should not raise - but the result should stay within workspace
    assert result.startswith(workspace)


def test_config_no_hardcoded_secrets():
    """Verify secrets aren't hardcoded in config defaults."""
    from app.config import Settings

    # Create settings without env file
    s = Settings(_env_file=None)

    # Token ID and secret should be empty by default
    assert s.PROXMOX_TOKEN_SECRET == ""
    assert s.API_KEY == ""


def test_config_auth_enabled():
    """Test auth_enabled property."""
    from app.config import Settings

    s = Settings(_env_file=None, API_KEY="")
    assert s.auth_enabled is False

    s2 = Settings(_env_file=None, API_KEY="test-key-123")
    assert s2.auth_enabled is True


def test_config_cors_origins_parsed():
    """Test CORS origins parsing."""
    from app.config import Settings

    s = Settings(_env_file=None, CORS_ORIGINS="http://localhost:3000,http://localhost:5173")
    origins = s.cors_origins_list
    assert len(origins) == 2
    assert "http://localhost:3000" in origins
    assert "http://localhost:5173" in origins
