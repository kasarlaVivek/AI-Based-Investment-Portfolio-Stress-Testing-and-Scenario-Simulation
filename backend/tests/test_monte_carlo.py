import numpy as np
import pytest

from app.services import monte_carlo
from tests.conftest import make_price_history


@pytest.fixture(autouse=True)
def patch_market_data(monkeypatch):
    """Replace the network fetcher with deterministic synthetic histories."""
    histories = {
        "AAPL": make_price_history(seed=1, daily_drift=0.0005),
        "MSFT": make_price_history(seed=2, daily_drift=0.0004),
        "SPY": make_price_history(seed=3, daily_drift=0.0003, daily_vol=0.009),
    }

    async def fake_fetch(symbol):
        return histories.get(symbol, make_price_history(seed=hash(symbol) % 100))

    monkeypatch.setattr(monte_carlo, "fetch_historical_data", fake_fetch)
    # Seed the GBM random draws so the run is reproducible.
    np.random.seed(123)


HOLDINGS = [
    {"symbol": "AAPL", "quantity": 10, "current_price": 150.0},
    {"symbol": "MSFT", "quantity": 5, "current_price": 300.0},
]


async def test_returns_expected_structure():
    result = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "NORMAL_MARKET", num_simulations=50, years=10
    )
    expected_keys = {
        "scenario_name", "best_case_return", "avg_case_return", "worst_case_return",
        "roi_5y", "roi_10y", "prob_loss_5y", "prob_loss_10y", "max_drawdown",
        "num_simulations", "simulation_paths", "chart_days",
    }
    assert expected_keys.issubset(result.keys())
    assert result["scenario_name"] == "Normal Market"
    assert result["num_simulations"] == 50


async def test_probabilities_and_drawdown_in_valid_range():
    result = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "NORMAL_MARKET", num_simulations=50, years=10
    )
    assert 0.0 <= result["prob_loss_5y"] <= 100.0
    assert 0.0 <= result["prob_loss_10y"] <= 100.0
    assert result["max_drawdown"] >= 0.0


async def test_percentiles_are_ordered():
    result = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "NORMAL_MARKET", num_simulations=200, years=10
    )
    paths = result["simulation_paths"]
    # At the final day the 5th <= 50th <= 95th percentile portfolio value.
    assert paths["5"][-1] <= paths["50"][-1] <= paths["95"][-1]
    # And best >= median >= worst case returns.
    assert result["best_case_return"] >= result["avg_case_return"] >= result["worst_case_return"]


async def test_crash_scenario_is_riskier_than_bull():
    # The crash scenario must be unambiguously worse than the bull scenario on
    # every dimension: lower median ROI, higher probability of loss, deeper
    # worst-case loss, and larger max drawdown.
    np.random.seed(7)
    bull = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "BULL_MARKET", num_simulations=500, years=10
    )
    np.random.seed(7)
    crash = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "MARKET_CRASH", num_simulations=500, years=10
    )
    assert crash["roi_10y"] < bull["roi_10y"]
    assert crash["prob_loss_10y"] >= bull["prob_loss_10y"]
    assert crash["worst_case_return"] < bull["worst_case_return"]
    assert crash["max_drawdown"] > bull["max_drawdown"]


async def test_scenarios_are_monotonically_ordered():
    # Median ROI and probability of loss must be monotonic across the regime
    # severity ordering. This guards against the regression where a large
    # volatility multiplier inflated the crash median above calmer scenarios.
    order = ["BULL_MARKET", "NORMAL_MARKET", "HIGH_INFLATION", "BEAR_MARKET", "MARKET_CRASH"]
    rois, plosses = [], []
    for scenario in order:
        np.random.seed(7)
        res = await monte_carlo.run_portfolio_monte_carlo(
            HOLDINGS, scenario, num_simulations=500, years=10
        )
        rois.append(res["roi_10y"])
        plosses.append(res["prob_loss_10y"])
    # Median ROI strictly decreasing as the regime worsens.
    assert all(rois[i] > rois[i + 1] for i in range(len(rois) - 1)), rois
    # Probability of loss non-decreasing as the regime worsens.
    assert all(plosses[i] <= plosses[i + 1] for i in range(len(plosses) - 1)), plosses


async def test_unknown_scenario_defaults_to_normal():
    result = await monte_carlo.run_portfolio_monte_carlo(
        HOLDINGS, "NOT_A_REAL_SCENARIO", num_simulations=20, years=10
    )
    assert result["scenario_name"] == "Normal Market"


async def test_zero_value_portfolio_raises():
    bad = [{"symbol": "AAPL", "quantity": 0, "current_price": 0.0}]
    with pytest.raises(ValueError):
        await monte_carlo.run_portfolio_monte_carlo(
            bad, "NORMAL_MARKET", num_simulations=10, years=10
        )
