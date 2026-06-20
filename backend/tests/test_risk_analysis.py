import math

import pytest

from app.services import risk_analysis
from tests.conftest import make_price_history


@pytest.fixture(autouse=True)
def patch_market_data(monkeypatch):
    histories = {
        "AAPL": make_price_history(seed=1, daily_drift=0.0005),
        "MSFT": make_price_history(seed=2, daily_drift=0.0004),
        "SPY": make_price_history(seed=3, daily_drift=0.0003, daily_vol=0.009),
    }

    async def fake_fetch(symbol):
        return histories.get(symbol, make_price_history(seed=hash(symbol) % 100))

    monkeypatch.setattr(risk_analysis, "fetch_historical_data", fake_fetch)


HOLDINGS = [
    {"symbol": "AAPL", "quantity": 10, "current_price": 150.0},
    {"symbol": "MSFT", "quantity": 5, "current_price": 300.0},
]


async def test_returns_expected_structure():
    result = await risk_analysis.compute_portfolio_risk_metrics(HOLDINGS)
    expected_keys = {
        "portfolio_volatility", "portfolio_beta", "sharpe_ratio",
        "value_at_risk_95", "conditional_value_at_risk_95",
        "correlation_matrix", "asset_metrics",
    }
    assert expected_keys.issubset(result.keys())


async def test_metrics_are_finite_and_sane():
    result = await risk_analysis.compute_portfolio_risk_metrics(HOLDINGS)
    assert result["portfolio_volatility"] > 0
    for key in ("portfolio_beta", "sharpe_ratio", "value_at_risk_95",
                "conditional_value_at_risk_95"):
        assert math.isfinite(result[key])
    # CVaR is the mean loss in the tail, so it cannot be smaller than VaR.
    assert result["conditional_value_at_risk_95"] >= result["value_at_risk_95"]


async def test_asset_weights_sum_to_100():
    result = await risk_analysis.compute_portfolio_risk_metrics(HOLDINGS)
    total_weight = sum(a["weight"] for a in result["asset_metrics"])
    assert total_weight == pytest.approx(100.0, abs=1e-6)


async def test_correlation_matrix_is_symmetric_with_unit_diagonal():
    result = await risk_analysis.compute_portfolio_risk_metrics(HOLDINGS)
    corr = result["correlation_matrix"]
    symbols = [h["symbol"] for h in HOLDINGS]
    for s in symbols:
        assert corr[s][s] == pytest.approx(1.0, abs=1e-9)
    assert corr["AAPL"]["MSFT"] == pytest.approx(corr["MSFT"]["AAPL"], abs=1e-9)


async def test_single_asset_correlation_is_one():
    single = [{"symbol": "AAPL", "quantity": 10, "current_price": 150.0}]
    result = await risk_analysis.compute_portfolio_risk_metrics(single)
    assert result["correlation_matrix"]["AAPL"]["AAPL"] == pytest.approx(1.0)


async def test_zero_value_portfolio_returns_error():
    bad = [{"symbol": "AAPL", "quantity": 0, "current_price": 0.0}]
    result = await risk_analysis.compute_portfolio_risk_metrics(bad)
    assert "error" in result
