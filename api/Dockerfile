# Dockerfile
FROM python:3.12-slim-bookworm
WORKDIR /srv

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    redis-server \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock* /srv/

# Configure Poetry to not create virtual environments
RUN poetry config virtualenvs.create false

# Install Python dependencies
RUN poetry install --only main --no-interaction --no-ansi --no-root

# Copy the application
COPY . /srv

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV BLOCK_REDOWNDLOAD=True
ENV REDIS_URL="redis://127.0.0.1:6379/0"

# Setup supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80

# Run supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
