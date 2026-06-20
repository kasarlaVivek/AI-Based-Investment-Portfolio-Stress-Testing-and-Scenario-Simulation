import os
import secrets
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio.db")

# Alpha Vantage API key. The app falls back to cached/mock data when this is
# unset, so it is optional for local development but recommended for live data.
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")
ALPHA_VANTAGE_BASE_URL = os.getenv("ALPHA_VANTAGE_BASE_URL", "https://www.alphavantage.co/query")

# JWT signing key. MUST be provided via the environment in production.
# A random key is generated as a dev fallback so the app still boots, but
# tokens will be invalidated on every restart until JWT_SECRET_KEY is set.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(32)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Comma-separated list of allowed CORS origins. Use "*" to allow all (dev only).
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
