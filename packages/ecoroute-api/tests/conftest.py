import pytest
from app.database import engine, Base
from app.models import User, Subscription, APIKey, SavedRoute  # noqa: F401

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # We could drop tables here but usually it's fine for CI to just let the service die
    # Base.metadata.drop_all(bind=engine)
