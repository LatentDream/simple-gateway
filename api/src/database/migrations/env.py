from logging.config import fileConfig
import os
import sys
from alembic import context
from sqlalchemy import engine_from_config, pool

# Add the src directory to the path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

# Import your models and base
from src.database.base import Base, get_database_url, get_engine_args
from src.settings import Settings

# Import all your models to ensure they are attached to the metadata
# This is where Alembic picks up models for migrations
# Import all models here
from src.database.models import *  # Import your model modules here

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get our database URL from settings
settings = Settings()
db_url = get_database_url(settings)
config.set_main_option("sqlalchemy.url", db_url)

# Print a warning if using SQLite
if settings.DB_ENGINE.lower() == "sqlite":
    print("WARNING: Running migrations on SQLite. This is not typical usage.")
    print("SQLite tables are normally created directly at application startup.")
    print("Continue only if you have a specific reason to use migrations with SQLite.")

# Add engine arguments
alembic_engine_args = get_engine_args(settings, None)
# Remove non-serializable args if necessary
alembic_engine_args.pop('future', None)

for key, value in alembic_engine_args.items():
    if isinstance(value, dict):
        for subkey, subvalue in value.items():
            config.set_section_option("alembic", f"{key}.{subkey}", str(subvalue))
    else:
        config.set_section_option("alembic", key, str(value))

# Use Base.metadata for migrations
target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
