import numpy as np
import pandas as pd
from typing import List, Dict, Any
from scipy.optimize import minimize
from .market_data import fetch_historical_data

RISK_FREE_RATE = 0.045

async def _build_returns_frame(symbols: List[str]) -> pd.DataFrame:
    histories = {}
    for sym in symbols:
        histories[sym] = await fetch_historical_data(sym)

    dfs = []
    for sym, hist in histories.items():
        df_sym = pd.DataFrame(hist)
        df_sym["date"] = pd.to_datetime(df_sym["date"])
        df_sym = df_sym.set_index("date").sort_index()
        df_sym[sym] = np.log(df_sym["price"] / df_sym["price"].shift(1))
        dfs.append(df_sym[[sym]])

    return pd.concat(dfs, axis=1).dropna()


def _portfolio_perf(weights, mean_returns, cov_matrix):
    ret = float(np.dot(weights, mean_returns))
    vol = float(np.sqrt(weights @ cov_matrix @ weights))
    return ret, vol


def _negative_sharpe(weights, mean_returns, cov_matrix):
    ret, vol = _portfolio_perf(weights, mean_returns, cov_matrix)
    if vol == 0:
        return 0.0
    return -(ret - RISK_FREE_RATE) / vol


def _portfolio_volatility(weights, mean_returns, cov_matrix):
    _, vol = _portfolio_perf(weights, mean_returns, cov_matrix)
    return vol


async def compute_efficient_frontier(
    holdings: List[Dict[str, Any]],
    num_frontier_points: int = 30
) -> Dict[str, Any]:
    """
    Computes the Modern Portfolio Theory (MPT) efficient frontier, the minimum-variance
    portfolio, and the maximum-Sharpe-ratio portfolio for the given holdings.
    """
    symbols = [h["symbol"] for h in holdings]
    quantities = [h["quantity"] for h in holdings]
    current_prices = [h["current_price"] for h in holdings]
    n_assets = len(symbols)

    values = np.array([q * p for q, p in zip(quantities, current_prices)])
    total_val = float(values.sum())
    if total_val <= 0:
        return {"error": "Portfolio value is zero"}
    current_weights = values / total_val

    if n_assets < 2:
        return {"error": "At least 2 holdings are required to compute an efficient frontier."}

    returns_df = await _build_returns_frame(symbols)

    if returns_df.empty or len(returns_df) < 5:
        mean_returns = np.array([0.08] * n_assets)
        cov_matrix = np.diag([0.04] * n_assets)
    else:
        mean_returns = returns_df.mean().values * 252
        cov_matrix = returns_df.cov().values * 252

    bounds = tuple((0.0, 1.0) for _ in range(n_assets))
    base_constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0},)
    init_guess = np.array([1.0 / n_assets] * n_assets)

    min_var_result = minimize(
        _portfolio_volatility, init_guess, args=(mean_returns, cov_matrix),
        method="SLSQP", bounds=bounds, constraints=base_constraints
    )
    min_var_weights = min_var_result.x if min_var_result.success else init_guess
    min_var_ret, min_var_vol = _portfolio_perf(min_var_weights, mean_returns, cov_matrix)

    max_sharpe_result = minimize(
        _negative_sharpe, init_guess, args=(mean_returns, cov_matrix),
        method="SLSQP", bounds=bounds, constraints=base_constraints
    )
    max_sharpe_weights = max_sharpe_result.x if max_sharpe_result.success else init_guess
    max_sharpe_ret, max_sharpe_vol = _portfolio_perf(max_sharpe_weights, mean_returns, cov_matrix)

    target_returns = np.linspace(mean_returns.min(), mean_returns.max(), num_frontier_points)
    frontier_points = []
    for target in target_returns:
        cons = (
            {"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
            {"type": "eq", "fun": lambda w, target=target: np.dot(w, mean_returns) - target},
        )
        result = minimize(
            _portfolio_volatility, init_guess, args=(mean_returns, cov_matrix),
            method="SLSQP", bounds=bounds, constraints=cons
        )
        if result.success:
            frontier_points.append({
                "return": float(target * 100),
                "volatility": float(result.fun * 100)
            })

    current_ret, current_vol = _portfolio_perf(current_weights, mean_returns, cov_matrix)

    return {
        "frontier": frontier_points,
        "current_portfolio": {
            "return": float(current_ret * 100),
            "volatility": float(current_vol * 100),
            "weights": {symbols[i]: float(current_weights[i] * 100) for i in range(n_assets)}
        },
        "min_variance_portfolio": {
            "return": float(min_var_ret * 100),
            "volatility": float(min_var_vol * 100),
            "weights": {symbols[i]: float(min_var_weights[i] * 100) for i in range(n_assets)}
        },
        "max_sharpe_portfolio": {
            "return": float(max_sharpe_ret * 100),
            "volatility": float(max_sharpe_vol * 100),
            "weights": {symbols[i]: float(max_sharpe_weights[i] * 100) for i in range(n_assets)}
        }
    }
