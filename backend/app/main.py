from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import portfolio, simulation, auth
from . import config

# Create database tables at startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Portfolio Stress Testing & Simulation API",
    description="High performance financial modeling API supporting Monte Carlo simulations, portfolio optimization and risk metrics.",
    version="1.0.0"
)

# Enable CORS for frontend integration.
# Set CORS_ORIGINS in the environment to a comma-separated list of allowed
# origins in production (e.g. "https://myapp.com"). Defaults to "*" for dev.
_origins = [o.strip() for o in config.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "active",
        "message": "AI Portfolio Stress Testing and Scenario Simulation API is online."
    }
