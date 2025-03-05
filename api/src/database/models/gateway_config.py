from typing import Any, final
from sqlalchemy import Integer, String, JSON, Boolean
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Mapped, mapped_column
from src.database.models.base import Base

@final
class GatewayConfig(Base):
    """Model for storing API Gateway route configurations"""
    __tablename__ = "gateway_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    route_prefix: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(String, nullable=False)
    rate_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    url_rewrite: Mapped[Any] = mapped_column(JSON, nullable=False, default={})
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    @classmethod
    async def get_all_active_configs(cls, db: AsyncSession):
        """Retrieve all active gateway configurations"""
        query = select(cls).where(cls.is_active == True)
        result = await db.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_config_by_prefix(cls, db: AsyncSession, prefix: str):
        """Retrieve a specific gateway configuration by its prefix"""
        query = select(cls).where(
            cls.route_prefix == prefix,
            cls.is_active == True
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @classmethod
    async def create_config(
        cls,
        db: AsyncSession,
        route_prefix: str,
        target_url: str, 
        rate_limit: int = 60,
        url_rewrite: dict[str, str] | None = None
    ):
        """Create a new gateway configuration"""
        config = cls(
            route_prefix=route_prefix,
            target_url=target_url,
            rate_limit=rate_limit,
            url_rewrite=url_rewrite or {}
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
        return config

    @classmethod
    async def update_config(cls, db: AsyncSession, route_prefix: str, **kwargs):
        """Update an existing gateway configuration"""
        config = await cls.get_config_by_prefix(db, route_prefix)
        if config:
            for key, value in kwargs.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            await db.commit()
            await db.refresh(config)
        return config

    @classmethod
    async def delete_config(cls, db: AsyncSession, route_prefix: str):
        """Soft delete a gateway configuration by marking it as inactive"""
        config = await cls.get_config_by_prefix(db, route_prefix)
        if config:
            config.is_active = False
            await db.commit()
        return config 
