import logging
from logging import Logger
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import Any
from src.settings import Settings
from src.database.models.base import Base, metadata

# Global variables that will be set during initialization
async_engine = None
AsyncSessionLocal = None
logging_adapter = None

def configure_sqlalchemy_logging(logger: Logger):
    """
    Configure SQLAlchemy to use the application logger.
    Call this function before initializing the database.
    """
    # Get SQLAlchemy loggers
    sqlalchemy_logger = logging.getLogger('sqlalchemy.engine')
    aiosqlite_logger = logging.getLogger('aiosqlite')
    
    # Remove any existing handlers to prevent duplication
    for handler in list(sqlalchemy_logger.handlers):
        sqlalchemy_logger.removeHandler(handler)
    for handler in list(aiosqlite_logger.handlers):
        aiosqlite_logger.removeHandler(handler)
    
    # Prevent propagation to the root logger (no duplicate logs)
    sqlalchemy_logger.propagate = False
    aiosqlite_logger.propagate = False
    
    # Create a custom handler that forwards to our application logger
    class LoggerAdapter(logging.Handler):
        def emit(self, record):
            # Map SQLAlchemy log levels to our logger's methods
            if record.levelno == logging.DEBUG:
                logger.debug(f"SQLAlchemy: {record.getMessage()}")
            elif record.levelno == logging.INFO:
                logger.info(f"SQLAlchemy: {record.getMessage()}")
            elif record.levelno == logging.WARNING:
                logger.warning(f"SQLAlchemy: {record.getMessage()}")
            elif record.levelno == logging.ERROR:
                logger.error(f"SQLAlchemy: {record.getMessage()}")
            elif record.levelno == logging.CRITICAL:
                logger.critical(f"SQLAlchemy: {record.getMessage()}")
    
    # Add the custom handler to SQLAlchemy loggers
    adapter = LoggerAdapter()
    sqlalchemy_logger.addHandler(adapter)
    aiosqlite_logger.addHandler(adapter)
    
    return adapter

def get_async_database_url(settings: Settings) -> str:
    """
    Construct async database URL based on settings.
    Supports both SQLite and PostgreSQL.
    """
    if settings.DB_ENGINE.lower() == "sqlite":
        return f"sqlite+aiosqlite:///./{settings.DB_NAME}.db"
    elif settings.DB_ENGINE.lower() == "postgresql":
        return (f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}@"
                f"{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    else:
        raise ValueError(f"Unsupported database engine: {settings.DB_ENGINE}")

def get_async_engine_args(settings: Settings, logger: Logger | None = None) -> dict[str, Any]:
    """
    Get engine-specific arguments based on database type for async engine.
    """
    args: dict[str, Any] = {
        "echo": False,  # We're handling logging manually
        "echo_pool": False,  # We're handling logging manually
        "future": True,  # Use SQLAlchemy 2.0 features
    }
    
    # Add SQLite-specific arguments
    if settings.DB_ENGINE.lower() == "sqlite":
        args["connect_args"] = {"check_same_thread": False}
    
    # Add PostgreSQL-specific arguments if needed
    if settings.DB_ENGINE.lower() == "postgresql":
        args["pool_size"] = settings.DB_POOL_SIZE
        args["max_overflow"] = settings.DB_MAX_OVERFLOW
        
    return args

async def init_db(settings: Settings, logger: Logger) -> tuple[Any, Any, Any]:
    """
    Initialize async database connection with provided settings.
    """
    global async_engine, AsyncSessionLocal, logging_adapter
    
    # Configure SQLAlchemy to use our logger
    logging_adapter = configure_sqlalchemy_logging(logger)
    
    database_url = get_async_database_url(settings)
    engine_args = get_async_engine_args(settings, logger)
    
    logger.info(f"Initializing async {settings.DB_ENGINE} database connection to {settings.DB_NAME}")
    
    async_engine = create_async_engine(database_url, **engine_args)
    AsyncSessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession,
        bind=async_engine
    )
    
    # Set log level for SQLAlchemy loggers based on settings
    sqlalchemy_logger = logging.getLogger('sqlalchemy.engine')
    aiosqlite_logger = logging.getLogger('aiosqlite')
    log_level = logging.DEBUG if settings.DB_ECHO else logging.WARNING
    sqlalchemy_logger.setLevel(log_level)
    aiosqlite_logger.setLevel(log_level)
    
    if settings.DB_ECHO and async_engine:
        @event.listens_for(async_engine.sync_engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            logger.debug(f"SQL: {statement}")
            if parameters:
                logger.debug(f"Parameters: {parameters}")
    
    # For SQLite (throwaway database): Create tables directly at initialization
    if settings.DB_ENGINE.lower() == "sqlite":
        logger.warning("When using SQLite, data are lost on restart")
        logger.info("SQLite detected: Creating tables")
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    else:
        # For PostgreSQL: Assume migrations are applied separately
        logger.info("PostgreSQL detected: Tables should be created via migrations")
    
    logger.info("Async database connection established successfully")
    
    return async_engine, AsyncSessionLocal, logging_adapter


async def get_db():
    """
    Get async database session dependency.
    Usage: db: AsyncSession = Depends(get_db)
    """
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db first.")
        
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


async def close_db():
    """
    Close async database connection - useful for testing.
    """
    global async_engine, AsyncSessionLocal, logging_adapter
    if async_engine:
        await async_engine.dispose()
        async_engine = None
        AsyncSessionLocal = None
        logging_adapter = None

