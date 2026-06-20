# ---- Backend: FastAPI + Uvicorn ----
FROM python:3.12-slim

# Avoid .pyc files and buffer stdout/stderr for clean container logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Directory for the persisted SQLite database (mounted as a volume in compose)
RUN mkdir -p /app/data

EXPOSE 8000

# Use the PORT env var if the platform injects one (Render, Railway, etc.)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
