import pytest
from src.settings import Profile, Settings

@pytest.fixture
def settings():
    """Provide test settings"""
    return TestSettings(Profile.TEST)

class TestSettings(Settings):
    """Test settings that override the base settings"""
    def __init__(self, profile: Profile = Profile.TEST, **kwargs):
        kwargs['PROFILE'] = profile
        # Define test routes with rate limits
        kwargs['ROUTE_FORWARDING'] = {
            "/api/limited": {
                "target_url": "http://localhost:8081",
                "rate_limit": 2  # Low limit for testing
            },
            "/api/unlimited": {
                "target_url": "http://localhost:8081",
                "rate_limit": 0  # No rate limit
            },
            "/api/service1": {
                "target_url": "http://localhost:8081",
                "rate_limit": 60
            },
            "/api/service2": {
                "target_url": "http://localhost:8082",
                "rate_limit": 30
            }
        }
        super().__init__(**kwargs)
