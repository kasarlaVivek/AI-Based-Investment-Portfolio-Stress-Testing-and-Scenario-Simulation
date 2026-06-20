import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from .market_data import fetch_historical_data

# Each scenario is defined by an absolute *target annualized return* for the
# market regime (annual_drift) and a volatility multiplier (vol_mult) applied to
# the historical covariance. annual_drift is used directly rather than as a
# multiplier on each asset's historical mean: a multiplier-based crash applied
# to assets with positive historical returns only produces a mild negative
# drift, which the scenario's large volatility then overwhelms via the right
# skew of (summed) lognormal GBM paths — making a "crash" look benign on the
# median and probability-of-loss metrics. Absolute regime drifts keep the
# scenarios correctly ordered (Bull > Normal > High Inflation > Bear > Crash).
SCENARIOS = {
    "BULL_MARKET": {
        "name": "Bull Market",
        "annual_drift": 0.18,
        "vol_mult": 0.8
    },
    "NORMAL_MARKET": {
        "name": "Normal Market",
        "annual_drift": 0.08,
        "vol_mult": 1.0
    },
    "BEAR_MARKET": {
        "name": "Bear Market",
        "annual_drift": -0.12,
        "vol_mult": 1.4
    },
    "MARKET_CRASH": {
        "name": "Market Crash",
        "annual_drift": -0.35,
        "vol_mult": 2.2
    },
    "HIGH_INFLATION": {
        "name": "High Inflation",
        "annual_drift": 0.01,
        "vol_mult": 1.2
    }
}

async def run_portfolio_monte_carlo(
    holdings: List[Dict[str, Any]],
    scenario_key: str,
    num_simulations: int = 1000,
    years: int = 10
) -> Dict[str, Any]:
    """
    Simulates portfolio paths using Cholesky Decomposition of the historical covariance matrix
    to preserve asset correlations.
    """
    scenario = SCENARIOS.get(scenario_key, SCENARIOS["NORMAL_MARKET"])
    
    # 1. Fetch historical data for all holdings
    symbols = [h["symbol"] for h in holdings]
    quantities = [h["quantity"] for h in holdings]
    current_prices = [h["current_price"] for h in holdings]
    
    # Compute initial allocation weights and values
    values = np.array([q * p for q, p in zip(quantities, current_prices)])
    initial_portfolio_value = float(values.sum())
    
    if initial_portfolio_value <= 0:
        raise ValueError("Initial portfolio value must be greater than 0.")
        
    weights = values / initial_portfolio_value

    # Fetch daily historical close data
    histories = {}
    for sym in symbols:
        histories[sym] = await fetch_historical_data(sym)

    # 2. Build aligned returns dataframe
    dfs = []
    for sym, hist in histories.items():
        df_sym = pd.DataFrame(hist)
        df_sym["date"] = pd.to_datetime(df_sym["date"])
        df_sym = df_sym.set_index("date").sort_index()
        # Calculate log returns
        df_sym[sym] = np.log(df_sym["price"] / df_sym["price"].shift(1))
        dfs.append(df_sym[[sym]])
        
    returns_df = pd.concat(dfs, axis=1).dropna()
    
    # Check if we have enough returns data
    n_assets = len(symbols)
    if returns_df.empty or len(returns_df) < 5:
        # Fallback to a generic volatility structure if returns cannot align
        cov_matrix = np.diag([0.015**2 for _ in range(n_assets)]) # ~24% volatility
    else:
        cov_matrix = returns_df.cov().values

    # Scenario drift is an absolute target annualized return for the regime,
    # applied uniformly across assets (see SCENARIOS comment above for why we use
    # an absolute drift rather than a multiplier on historical means). The
    # historical covariance is preserved and scaled by the volatility multiplier.
    drift = np.full(n_assets, scenario["annual_drift"])  # Annualized drift
    # Covariance scales with square of volatility multiplier
    covariance = cov_matrix * 252 * (scenario["vol_mult"] ** 2)  # Annualized covariance
    
    # Daily drift and covariance
    daily_drift = drift / 252
    daily_cov = covariance / 252

    # 3. Simulate correlated paths
    trading_days = 252 * years
    dt = 1.0  # Daily steps
    
    # Cholesky Decomposition: Cov = L * L_T
    # If single asset or matrix not positive definite, use diagonal / independent path generation
    try:
        if n_assets == 1:
            L = np.array([[np.sqrt(daily_cov[0][0])]])
        else:
            # Add small regularization to diagonal to ensure positive-definiteness
            reg_cov = daily_cov + np.eye(n_assets) * 1e-10
            L = np.linalg.cholesky(reg_cov)
    except np.linalg.LinAlgError:
        # Fallback to independent volatilities
        L = np.diag(np.sqrt(np.diag(daily_cov)))

    # Vectorized Simulation using GBM
    # We will track portfolio paths
    # portfolio_paths: (num_simulations, trading_days + 1)
    portfolio_paths = np.zeros((num_simulations, trading_days + 1))
    portfolio_paths[:, 0] = initial_portfolio_value

    # Pre-generate all random variables to optimize runtime
    # Z shape: (trading_days, n_assets, num_simulations)
    Z = np.random.normal(0, 1, size=(trading_days, n_assets, num_simulations))
    
    # Track paths for individual stocks
    # stock_paths: (n_assets, num_simulations, trading_days + 1)
    stock_paths = np.zeros((n_assets, num_simulations, trading_days + 1))
    for i in range(n_assets):
        stock_paths[i, :, 0] = current_prices[i]

    # Run step-by-step to compile portfolio value at each day
    # S_t = S_0 * exp(cumsum(daily_drift - 0.5 * daily_variance + vol * Z))
    # Let's compute daily return factors for each asset
    # daily_var = diag of daily_cov
    daily_var = np.diag(daily_cov)
    
    # Iterate days
    for t in range(1, trading_days + 1):
        # Correlate the random variables
        # Z_t is (n_assets, num_simulations)
        z_t = Z[t-1]
        # correlated_z is (n_assets, num_simulations) = L (n_assets, n_assets) * z_t (n_assets, num_simulations)
        correlated_z = L @ z_t
        
        # Calculate next stock prices
        for i in range(n_assets):
            drift_term = daily_drift[i] - 0.5 * daily_var[i]
            rand_term = correlated_z[i] # This is already scaled by volatility since L includes it
            ratio = np.exp(drift_term + rand_term)
            stock_paths[i, :, t] = stock_paths[i, :, t-1] * ratio
            
        # Portfolio value on day t is sum of (quantity_i * price_i_t)
        p_val = np.zeros(num_simulations)
        for i in range(n_assets):
            p_val += quantities[i] * stock_paths[i, :, t]
        portfolio_paths[:, t] = p_val

    # 4. Extract metrics from simulated portfolio paths
    # End of year 5 index: 252 * 5
    index_5y = 252 * 5
    index_10y = trading_days

    final_values_5y = portfolio_paths[:, index_5y]
    final_values_10y = portfolio_paths[:, index_10y]

    # Calculate return percentages relative to initial investment
    returns_5y = (final_values_5y - initial_portfolio_value) / initial_portfolio_value
    returns_10y = (final_values_10y - initial_portfolio_value) / initial_portfolio_value

    # Extract percentiles for fan chart: 5th, 25th, 50th, 75th, 95th
    percentiles = [5, 25, 50, 75, 95]
    percentile_paths = {}
    
    # Calculate daily percentiles for visualization (subsampled for faster chart rendering, e.g. every 10 days)
    chart_step = 10
    days_indices = list(range(0, trading_days + 1, chart_step))
    if days_indices[-1] != trading_days:
        days_indices.append(trading_days)
        
    for p in percentiles:
        paths_at_p = []
        for day in days_indices:
            paths_at_p.append(float(np.percentile(portfolio_paths[:, day], p)))
        percentile_paths[str(p)] = paths_at_p

    # Probability of loss (final value < initial investment)
    prob_loss_5y = float((final_values_5y < initial_portfolio_value).mean() * 100)
    prob_loss_10y = float((final_values_10y < initial_portfolio_value).mean() * 100)

    # Compute Max Drawdown across all simulation paths
    # Peak portfolio values
    peaks = np.maximum.accumulate(portfolio_paths, axis=1)
    drawdowns = (portfolio_paths - peaks) / peaks
    max_drawdown = float(abs(drawdowns.min()) * 100)

    # Best, Median, Worst returns at 5y/10y
    return {
        "scenario_name": scenario["name"],
        "best_case_return": float(np.percentile(returns_10y, 95) * 100),
        "avg_case_return": float(np.percentile(returns_10y, 50) * 100),
        "worst_case_return": float(np.percentile(returns_10y, 5) * 100),
        "roi_5y": float(np.percentile(returns_5y, 50) * 100),
        "roi_10y": float(np.percentile(returns_10y, 50) * 100),
        "prob_loss_5y": prob_loss_5y,
        "prob_loss_10y": prob_loss_10y,
        "max_drawdown": max_drawdown,
        "num_simulations": num_simulations,
        "simulation_paths": percentile_paths, # Cached percentile timelines
        "chart_days": [int(d) for d in days_indices] # List of day indices corresponding to paths
    }
