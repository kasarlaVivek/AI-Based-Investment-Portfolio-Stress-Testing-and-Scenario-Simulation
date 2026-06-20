import numpy as np
import pandas as pd
from typing import List, Dict, Any
from .market_data import fetch_historical_data, fetch_company_overview

RISK_FREE_RATE = 0.045

# A diversified candidate universe spanning broad-market ETFs, sector ETFs, bonds,
# gold, and defensive blue-chip stocks, used to suggest assets the user doesn't already hold.
CANDIDATE_UNIVERSE = [
    "SPY", "QQQ", "VTI", "GLD", "TLT", "BND",
    "JNJ", "PG", "KO", "XLU", "JPM", "UNH", "HD",
]


async def suggest_new_assets(
    holdings: List[Dict[str, Any]],
    risk_metrics: Dict[str, Any],
    top_n: int = 5
) -> List[Dict[str, Any]]:
    """
    Scans a candidate universe of assets not already held and recommends the ones that,
    if added as a 10% position, would most improve the portfolio's risk/return profile
    (lower volatility and/or higher expected return, weighted toward diversification).
    """
    held_symbols = {h["symbol"] for h in holdings}
    candidates = [c for c in CANDIDATE_UNIVERSE if c not in held_symbols]
    if not candidates or not holdings:
        return []

    quantities = [h["quantity"] for h in holdings]
    current_prices = [h["current_price"] for h in holdings]
    values = np.array([q * p for q, p in zip(quantities, current_prices)])
    total_val = float(values.sum())
    if total_val <= 0:
        return []
    weights = values / total_val
    held_list = [h["symbol"] for h in holdings]

    histories = {}
    for sym in held_list + candidates:
        histories[sym] = await fetch_historical_data(sym)

    dfs = []
    for sym, hist in histories.items():
        df_sym = pd.DataFrame(hist)
        if df_sym.empty:
            continue
        df_sym["date"] = pd.to_datetime(df_sym["date"])
        df_sym = df_sym.set_index("date").sort_index()
        df_sym[sym] = np.log(df_sym["price"] / df_sym["price"].shift(1))
        dfs.append(df_sym[[sym]])

    if not dfs:
        return []

    returns_df = pd.concat(dfs, axis=1).dropna()
    if returns_df.empty or not all(s in returns_df.columns for s in held_list):
        return []

    portfolio_returns = returns_df[held_list].values @ weights
    portfolio_vol = float(np.std(portfolio_returns) * np.sqrt(252))
    portfolio_ret = float(np.mean(portfolio_returns) * 252)

    suggestions = []
    new_position_weight = 0.10
    for sym in candidates:
        if sym not in returns_df.columns:
            continue
        cand_returns = returns_df[sym].values
        corr = float(np.corrcoef(portfolio_returns, cand_returns)[0, 1])
        cand_vol = float(np.std(cand_returns) * np.sqrt(252))
        cand_ret = float(np.mean(cand_returns) * 252)
        cand_sharpe = (cand_ret - RISK_FREE_RATE) / cand_vol if cand_vol > 0 else 0.0

        adj_weights = weights * (1 - new_position_weight)
        combined_returns = returns_df[held_list].values @ adj_weights + cand_returns * new_position_weight
        combined_vol = float(np.std(combined_returns) * np.sqrt(252))
        combined_ret = float(np.mean(combined_returns) * 252)

        vol_change_pct = ((combined_vol - portfolio_vol) / portfolio_vol * 100) if portfolio_vol > 0 else 0.0
        ret_change_pct = ((combined_ret - portfolio_ret) / abs(portfolio_ret) * 100) if portfolio_ret != 0 else 0.0

        overview = await fetch_company_overview(sym)

        suggestions.append({
            "symbol": sym,
            "name": overview.get("Name", sym),
            "sector": overview.get("Sector", "General"),
            "correlation_with_portfolio": corr,
            "expected_annual_return_pct": cand_ret * 100,
            "annual_volatility_pct": cand_vol * 100,
            "standalone_sharpe_ratio": cand_sharpe,
            "projected_volatility_change_pct": vol_change_pct,
            "projected_return_change_pct": ret_change_pct,
            "rationale": _build_rationale(corr, vol_change_pct, ret_change_pct, cand_sharpe),
        })

    # Favor candidates that cut volatility the most while still helping (or not hurting much) return.
    suggestions.sort(key=lambda s: s["projected_volatility_change_pct"] - s["projected_return_change_pct"] * 0.5)
    return suggestions[:top_n]


def _build_rationale(corr: float, vol_change_pct: float, ret_change_pct: float, sharpe: float) -> str:
    if corr < 0.3:
        diversification = f"low correlation ({corr:.2f}) with your current holdings"
    elif corr < 0.6:
        diversification = f"moderate correlation ({corr:.2f}) with your current holdings"
    else:
        diversification = f"high correlation ({corr:.2f}) with your current holdings, limiting diversification benefit"

    if vol_change_pct < 0:
        risk_impact = f"a 10% allocation would cut portfolio volatility by {abs(vol_change_pct):.1f}%"
    else:
        risk_impact = f"a 10% allocation would raise portfolio volatility by {vol_change_pct:.1f}%"

    if ret_change_pct >= 0:
        return_impact = f"while increasing expected annual return by {ret_change_pct:.1f}%"
    else:
        return_impact = f"while reducing expected annual return by {abs(ret_change_pct):.1f}%"

    return f"Has {diversification}; {risk_impact}, {return_impact} (standalone Sharpe ratio {sharpe:.2f})."
