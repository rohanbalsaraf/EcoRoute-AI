FROM python:3.10-slim

# Install system dependencies, C compiler, and Rust
RUN apt-get update && apt-get install -y curl build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy the entire monorepo workspace
COPY . .

# 1. Build and install the Rust core engine into Python
WORKDIR /app/packages/ecoroute-core
RUN pip install --no-cache-dir .

# 2. Install Python API dependencies
WORKDIR /app/packages/ecoroute-api
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port Render expects
EXPOSE 10000

# Run migrations and start the FastAPI server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
