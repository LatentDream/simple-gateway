from random import randint
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
        kwargs['RATE_LIMIT_WINDOW_SECONDS'] = 1  # Set to 0.5 seconds for faster tests
        super().__init__(**kwargs)
