# AI-Based Investment Portfolio Stress Testing & Scenario Simulation

An advanced full-stack investment analytics platform designed to stress-test stock portfolios under various macroeconomic scenarios. The system uses a **FastAPI** backend to run multi-asset **Monte Carlo simulations** (preserving covariance correlations via Cholesky Decomposition), computes Modern Portfolio Theory (MPT) risk statistics, and serves optimization suggestions to a modern **React (JavaScript + Tailwind CSS)** frontend.

## Live Demo

* **Frontend**: <https://frontend-production-0001.up.railway.app>
* **Backend API + docs**: <https://ai-based-investment-portfolio-stress-testing-and-production.up.railway.app/docs>

---

## Key Features

1. **Dual-Folder Modular Architecture**: Complete separation of concerns:
   * `/backend`: FastAPI REST service with SQLite/SQLAlchemy database models.
   * `/frontend`: Vite-powered React client SPA with Recharts and Tailwind CSS.
2. **Monte Carlo Simulation Engine**:
   * Uses a vectorized **Geometric Brownian Motion (GBM)** model.
   * Employs **Cholesky Decomposition** on the historical covariance matrix to preserve real-world stock price correlations.
   * Projects outcomes over **10 years (2,520 trading days)** across 1,000 parallel paths.
   * Simulates **5 distinct macroeconomic scenarios**: Bull Market, Normal Market, Bear Market, Market Crash, and High Inflation.
   * Computes **5y and 10y ROI projections** (Best, Median, and Worst cases), **Probability of Capital Loss**, and **Max Drawdown**.
3. **Modern Portfolio Theory (MPT) Risk Statistics**:
   * **Annualized Volatility**: Historical volatility computed from daily log returns.
   * **Portfolio Beta**: Measures market sensitivity compared against `SPY`.
   * **Sharpe Ratio**: Evaluates risk-adjusted returns (using a 4.5% risk-free rate).
   * **Value at Risk (VaR)**: Calculates maximum expected loss at 95% confidence.
   * **Expected Shortfall (CVaR)**: Calculates average loss in the worst 5% of outcomes.
4. **Holding Correlation Heatmap Matrix**:
   * Shows inter-stock correlation coefficients in an interactive color-coded matrix. Helpful to identify diversification overlaps.
5. **AI-Powered Portfolio Optimization Suggestions**:
   * Analyzes concentration risk (flagging holdings representing $>25\%$ of total value).
   * Flags sector concentration ($>50\%$ weight in a single sector).
   * Highlights high-volatility, low-growth, or high-valuation assets (using price trend vs SMA and stock valuation data).
   * Identifies excessive market sensitivity (Beta &gt; 1.3) or low-growth defensive locks.
6. **Robust Data Fallbacks & Caching**:
   * Integrated local caching for API calls to avoid Alpha Vantage rate limits.
   * Automatic mock generation with realistic daily fluctuations for offline development.

---

## Directory Structure

```
AI-Based-Investment-Portfolio-Stress-Testing-and-Scenario-Simulation/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── models/           # SQLAlchemy database schemas
│   │   ├── schemas/          # Pydantic schemas (request/response validation)
│   │   ├── routers/          # API endpoints (portfolio, simulations)
│   │   ├── services/         # Numerical engines (Monte Carlo, Risk stats, Alpha Vantage API)
│   │   ├── config.py         # App configurations & environment variables
│   │   └── main.py           # FastAPI entrypoint
│   ├── cache/                # Alpha Vantage query caches (auto-created)
│   ├── requirements.txt      # Python dependencies list
│   └── portfolio.db          # SQLite database (auto-created)
│
├── frontend/                 # React Frontend Client
│   ├── src/
│   │   ├── components/       # UI Components (Charts, Heatmaps, Tables, Forms)
│   │   ├── services/         # Axios client and API wrappers
│   │   └── App.jsx           # Main Dashboard Orchestrator
│   ├── package.json          # Node dependencies list
│   └── vite.config.js        # Vite build tool configuration
```

---

## Setup & Running Locally

### 1. Prerequisite Environments
Ensure you have the following installed on your machine:
* **Python 3.8+**
* **Node.js 18+** & **npm**

---

### 2. Run the Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   
   # On Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   * The API docs will be active at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   * The backend port should be `8000` for the React app to communicate correctly.

---

### 3. Run the Frontend Dashboard

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## Environment Configuration

Both apps read configuration from `.env` files (never commit these — they are gitignored). Copy the provided templates and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | DB connection string (SQLite default, or Postgres) |
| `ALPHA_VANTAGE_API_KEY` | backend | Live market data key (blank = cached/mock data) |
| `JWT_SECRET_KEY` | backend | **Required in production.** Token signing secret |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins (`*` for dev) |
| `VITE_API_BASE_URL` | frontend | Backend API URL, e.g. `https://api.example.com/api` |

> ⚠️ Generate a strong JWT secret: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
> In production set `CORS_ORIGINS` to your exact frontend origin rather than `*`.

---

## Testing

Backend unit tests cover the numerical engines (Monte Carlo simulation and MPT
risk metrics) using deterministic synthetic market data, so they run fast and
offline:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

CI runs the backend tests and the frontend production build on every push and
pull request (see `.github/workflows/ci.yml`).

---

## Deployment

### Option A — Docker Compose (single host, recommended)

The simplest path. Requires Docker + Docker Compose.

```bash
# From the project root. Set secrets first (or put them in a root .env file):
export JWT_SECRET_KEY="<your-generated-secret>"
export ALPHA_VANTAGE_API_KEY="<your-key>"            # optional
export VITE_API_BASE_URL="http://localhost:8000/api" # public backend URL in prod
export CORS_ORIGINS="http://localhost:5173"          # your frontend origin in prod

docker compose up --build -d
```

* Frontend: <http://localhost:5173>
* Backend API + docs: <http://localhost:8000/docs>
* The SQLite database persists in the `backend_data` Docker volume.

To stop: `docker compose down` (add `-v` to also wipe the database volume).

> Note: `VITE_API_BASE_URL` is baked into the frontend **at build time**. If you
> change the backend URL, rebuild the frontend image (`docker compose build frontend`).

### Option B — Managed platforms (split deploy)

**Backend** on a container/PaaS host (Render, Railway, Fly.io, AWS App Runner):
* Build from `backend/Dockerfile`.
* Set env vars: `JWT_SECRET_KEY`, `ALPHA_VANTAGE_API_KEY`, `CORS_ORIGINS` (your frontend URL), and `DATABASE_URL` (use managed Postgres for durability — SQLite is ephemeral on most PaaS filesystems).
* The container listens on `$PORT` automatically.

**Frontend** on a static host (Vercel, Netlify, Cloudflare Pages):
* Build command: `npm run build`  →  publish directory: `dist`.
* Set env var `VITE_API_BASE_URL` to the deployed backend URL (with `/api`).
* SPA routing fallback to `index.html` is already handled (see `frontend/nginx.conf` for the Docker path).

### Production checklist

- [ ] `JWT_SECRET_KEY` set to a strong random value (not the dev fallback)
- [ ] `CORS_ORIGINS` restricted to the real frontend origin (not `*`)
- [ ] `DATABASE_URL` points at a durable database (Postgres) if data must survive restarts
- [ ] `VITE_API_BASE_URL` points at the public backend URL and the frontend was rebuilt
- [ ] If reusing the old Alpha Vantage key from git history, **rotate it** (free new key)

---

## Portfolio CSV Formatting

To upload your holdings, prepare a standard CSV file with three columns. A header row is optional but recommended.

**Example format:**
```csv
Symbol,Quantity,Purchase Price
AAPL,50,150.25
MSFT,30,280.50
GOOGL,40,110.10
NVDA,15,480.00
TSLA,25,185.00
```
* The parser is flexible and automatically attempts to map headers containing variations of **Symbol**, **Quantity**, or **Price**. If headers are missing, it defaults to column ordering (Col 1: Symbol, Col 2: Quantity, Col 3: Price).
