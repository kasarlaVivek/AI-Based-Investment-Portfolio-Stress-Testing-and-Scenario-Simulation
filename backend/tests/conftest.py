"""Shared test fixtures and helpers.

These tests exercise the numerical engines (Monte Carlo, risk metrics) in
isolation by mocking out the network-bound market data fetcher with
deterministic synthetic price series, so they run fast and offline.
"""
from datetime import date, timedelta
from typing import Dict, List

import numpy as np


def make_price_history(
    n_days: int = 260,
    start_price: float = 100.0,
    daily_drift: float = 0.0004,
    daily_vol: float = 0.012,
    seed: int = 0,
) -> List[Dict]:
    """Generate a deterministic synthetic daily price history.

    Returns a list of {"date": "YYYY-MM-DD", "price": float} dicts, matching the
    shape produced by app.services.market_data.fetch_historical_data.
    """
    rng = np.random.default_rng(seed)
    shocks = rng.normal(daily_drift, daily_vol, size=n_days)
    prices = start_price * np.exp(np.cumsum(shocks))
    start = date(2021, 1, 1)
    return [
        {"date": (start + timedelta(days=i)).isoformat(), "price": float(p)}
        for i, p in enumerate(prices)
    ]
