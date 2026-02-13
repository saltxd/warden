"""Tests for middleware (auth, logging)."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from starlette.testclient import TestClient


def test_auth_middleware_disabled():
    """When API_KEY is empty, all requests should pass."""
    with patch('app.config.settings') as mock_settings:
        mock_settings.auth_enabled = False
        mock_settings.API_KEY = ""
        mock_settings.cors_origins_list = ["*"]
        mock_settings.CORS_ORIGINS = "*"

        from app.main import app
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200


def test_root_endpoint():
    """Test the root endpoint returns app info."""
    with patch('app.config.settings') as mock_settings:
        mock_settings.auth_enabled = False
        mock_settings.API_KEY = ""
        mock_settings.cors_origins_list = ["*"]
        mock_settings.CORS_ORIGINS = "*"

        from app.main import app
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Warden"
        assert "version" in data
