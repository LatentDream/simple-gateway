from fastapi import FastAPI
import pytest
from fastapi.testclient import TestClient
from src.server import create_server
from src.settings import Profile
from tests.conftest import TestSettings

@pytest.fixture
def base_url():
    """Provide base URL for API tests"""
    return "http://test"

@pytest.fixture
def test_client(app: FastAPI):
    """TestClient with Test profile with db lifespan handling """
    with TestClient(app) as client:
        yield client  # Handle lifespan(app)

@pytest.fixture
def dev_client():
    """TestClient with DEV profile with db lifespan handling """
    app = create_server(TestSettings(Profile.DEV))
    with TestClient(app) as client:
        yield client  # Handle lifespan(app)

@pytest.fixture
def prod_client():
    """TestClient with PROD profile with db lifespan handling """
    app = create_server(TestSettings(Profile.PROD))
    with TestClient(app) as client:
        yield client  # Handle lifespan(app)
