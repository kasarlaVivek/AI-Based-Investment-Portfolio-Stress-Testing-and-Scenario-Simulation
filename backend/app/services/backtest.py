import numpy as np
import pandas as pd
from typing import List, Dict, Any
from .market_data import fetch_full_historical_data

BENCHMARKS = ["SPY", "QQQ"]

async def run_historical_backtest(
    holdings: List[Dict[str, Any]],
    years: int = 5
) -> Dict[str, Any]:
    """
    Simulates buy-and-hold performance of the current holdings (at fixed share quantities)
    over real historical prices, compared against SPY and QQQ benchmarks.
    """
    symbols = [h["symbol"] for h in holdings]
    quantities = [h["quantity"] for h in holdings]

    histories = {}
    for sym in set(symbols) | set(BENCHMARKS):
        histories[sym] = await fetch_full_historical_data(sym, years=years)

    dfs = {}
    for sym, hist in histories.items():
        df = pd.DataFrame(hist)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").sort_index()
        dfs[sym] = df["price"]

    price_df = pd.DataFrame(dfs).dropna()
    if price_df.empty:
        return {"error": "Insufficient historical data to run backtest."}

    cutoff_date = price_df.index.max() - pd.Timedelta(days=365 * years)
    price_df = price_df[price_df.index >= cutoff_date]
    if len(price_df) < 2:
        return {"error": "Insufficient historical data to run backtest."}

    portfolio_value = sum(quantities[i] * price_df[symbols[i]] for i in range(len(symbols)))
    initial_value = float(portfolio_value.iloc[0])
    portfolio_normalized = (portfolio_value / initial_value) * 100

    benchmark_series = {}
    for bench in BENCHMARKS:
        if bench in price_df.columns:
            bench_prices = price_df[bench]
            benchmark_series[bench] = (bench_prices / bench_prices.iloc[0]) * 100

    # Subsample for chart rendering (~150 points)
    step = max(1, len(price_df) // 150)
    sampled_idx = list(range(0, len(price_df), step))
    if sampled_idx[-1] != len(price_df) - 1:
        sampled_idx.append(len(price_df) - 1)

    timeline = []
    dates = price_df.index
    for i in sampled_idx:
        point = {
            "date": dates[i].strftime("%Y-%m-%d"),
            "portfolio": float(round(portfolio_normalized.iloc[i], 2))
        }
        for bench, series in benchmark_series.items():
            point[bench] = float(round(series.iloc[i], 2))
        timeline.append(point)

    total_return_pct = float(portfolio_normalized.iloc[-1] - 100)
    daily_returns = portfolio_normalized.pct_change().dropna()
    annualized_return = float(((1 + total_return_pct / 100) ** (1 / years) - 1) * 100) if years > 0 else total_return_pct
    annualized_vol = float(daily_returns.std() * np.sqrt(252) * 100) if len(daily_returns) > 1 else 0.0

    peak = portfolio_normalized.cummax()
    drawdown = (portfolio_normalized - peak) / peak
    max_drawdown = float(abs(drawdown.min()) * 100)

    benchmark_returns = {
        bench: float(series.iloc[-1] - 100) for bench, series in benchmark_series.items()
    }

    return {
        "years": years,
        "timeline": timeline,
        "total_return_pct": total_return_pct,
        "annualized_return_pct": annualized_return,
        "annualized_volatility_pct": annualized_vol,
        "max_drawdown_pct": max_drawdown,
        "benchmark_returns": benchmark_returns
    }
