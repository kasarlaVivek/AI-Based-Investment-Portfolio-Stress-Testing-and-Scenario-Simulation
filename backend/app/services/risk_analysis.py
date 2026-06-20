import numpy as np
import pandas as pd
from typing import List, Dict, Any
from .market_data import fetch_historical_data

async def compute_portfolio_risk_metrics(
    holdings: List[Dict[str, Any]],
    risk_free_rate: float = 0.045
) -> Dict[str, Any]:
    """
    Computes volatility, beta, correlation matrix, Sharpe Ratio, VaR, and CVaR for the portfolio.
    """
    symbols = [h["symbol"] for h in holdings]
    quantities = [h["quantity"] for h in holdings]
    current_prices = [h["current_price"] for h in holdings]
    
    values = np.array([q * p for q, p in zip(quantities, current_prices)])
    total_val = float(values.sum())
    
    if total_val <= 0:
        return {"error": "Portfolio value is zero"}
        
    weights = values / total_val
    n_assets = len(symbols)

    # 1. Fetch historical data for all holdings and SPY (Benchmark)
    histories = {}
    for sym in symbols:
        histories[sym] = await fetch_historical_data(sym)
    
    # Also fetch market benchmark SPY
    try:
        spy_history = await fetch_historical_data("SPY")
    except Exception:
        spy_history = []

    # 2. Align returns
    dfs = []
    for sym, hist in histories.items():
        df_sym = pd.DataFrame(hist)
        df_sym["date"] = pd.to_datetime(df_sym["date"])
        df_sym = df_sym.set_index("date").sort_index()
        df_sym[sym] = np.log(df_sym["price"] / df_sym["price"].shift(1))
        dfs.append(df_sym[[sym]])
    
    returns_df = pd.concat(dfs, axis=1).dropna()
    
    # Align SPY returns. If the portfolio already holds SPY, its returns column
    # is already the benchmark series, so reuse it directly instead of joining a duplicate.
    if "SPY" in returns_df.columns:
        aligned_market = returns_df.copy()
    elif spy_history:
        spy_df = pd.DataFrame(spy_history)
        spy_df["date"] = pd.to_datetime(spy_df["date"])
        spy_df = spy_df.set_index("date").sort_index()
        spy_df["SPY"] = np.log(spy_df["price"] / spy_df["price"].shift(1))
        spy_returns = spy_df[["SPY"]]
        aligned_market = returns_df.join(spy_returns, how="inner").dropna()
    else:
        aligned_market = returns_df.copy()
        # Simulated benchmark returns
        np.random.seed(42)
        aligned_market["SPY"] = np.random.normal(0.0003, 0.01, size=len(returns_df))

    # 3. Calculate portfolio historical returns series
    portfolio_daily_returns = returns_df.values @ weights
    
    # 4. Volatility (Annualized)
    portfolio_vol = float(portfolio_daily_returns.std() * np.sqrt(252) * 100)
    
    # 5. Sharpe Ratio
    portfolio_annualized_return = float(portfolio_daily_returns.mean() * 252 * 100)
    excess_return = portfolio_annualized_return - (risk_free_rate * 100)
    sharpe_ratio = float(excess_return / portfolio_vol) if portfolio_vol > 0 else 0.0

    # 6. Beta (relative to SPY)
    portfolio_betas = []
    benchmark_variance = aligned_market["SPY"].var()
    
    # Calculate portfolio beta as weighted sum of stock betas
    stock_betas = {}
    for sym in symbols:
        if sym in aligned_market.columns and benchmark_variance > 0:
            covariance = aligned_market[sym].cov(aligned_market["SPY"])
            beta = covariance / benchmark_variance
        else:
            beta = 1.0 # fallback
        stock_betas[sym] = float(beta)
        
    portfolio_beta = float(sum(weights[i] * stock_betas[symbols[i]] for i in range(n_assets)))

    # 7. Value at Risk (VaR) and Conditional VaR (CVaR) - Historical Method
    # 95% Confidence level means 5th percentile of daily losses
    daily_losses = -portfolio_daily_returns
    var_95_daily = np.percentile(daily_losses, 95)
    
    # Annualized VaR (square root of time rule)
    var_95_annual = float(var_95_daily * np.sqrt(252) * 100)
    
    # CVaR: Average of daily losses exceeding daily VaR
    cvar_losses = daily_losses[daily_losses >= var_95_daily]
    cvar_95_daily = cvar_losses.mean() if len(cvar_losses) > 0 else var_95_daily
    cvar_95_annual = float(cvar_95_daily * np.sqrt(252) * 100)

    # 8. Correlation Matrix
    correlation_matrix = {}
    if n_assets > 1 and not returns_df.empty:
        corr = returns_df.corr().values
        for i, sym_i in enumerate(symbols):
            correlation_matrix[sym_i] = {}
            for j, sym_j in enumerate(symbols):
                correlation_matrix[sym_i][sym_j] = float(corr[i][j])
    else:
        # Single asset correlation is 1.0
        for sym in symbols:
            correlation_matrix[sym] = {sym: 1.0}

    # Individual asset volatility list
    asset_metrics = []
    for i, sym in enumerate(symbols):
        if sym in returns_df.columns:
            a_vol = float(returns_df[sym].std() * np.sqrt(252) * 100)
        else:
            a_vol = 25.0 # default fallback
            
        asset_metrics.append({
            "symbol": sym,
            "weight": float(weights[i] * 100),
            "volatility": a_vol,
            "beta": stock_betas[sym]
        })

    return {
        "portfolio_volatility": portfolio_vol,
        "portfolio_beta": portfolio_beta,
        "sharpe_ratio": sharpe_ratio,
        "value_at_risk_95": var_95_annual,
        "conditional_value_at_risk_95": cvar_95_annual,
        "correlation_matrix": correlation_matrix,
        "asset_metrics": asset_metrics
    }
