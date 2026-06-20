from typing import List, Dict, Any
from .market_data import fetch_company_overview

async def generate_portfolio_suggestions(
    holdings: List[Dict[str, Any]],
    risk_metrics: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generates actionable optimization recommendations based on portfolio structure, asset correlation,
    and fundamental analysis.
    """
    suggestions = []
    
    total_val = sum(h["quantity"] * h["current_price"] for h in holdings)
    if total_val <= 0:
        return []

    # 1. Fetch fundamental info for all stocks
    overviews = {}
    for h in holdings:
        overviews[h["symbol"]] = await fetch_company_overview(h["symbol"])

    # 2. Check concentration risk (> 25% allocation in any single stock)
    for h in holdings:
        weight = (h["quantity"] * h["current_price"]) / total_val
        if weight > 0.25:
            suggestions.append({
                "type": "CONCENTRATION_RISK",
                "title": f"High Concentration in {h['symbol']}",
                "description": f"{h['symbol']} represents {weight * 100:.1f}% of your portfolio. High concentration increases idiosyncratic risk (company-specific failure).",
                "severity": "HIGH",
                "action": f"Consider trimming position in {h['symbol']} to below 25% and distributing the capital to other sectors."
            })

    # 3. Check sector concentration risk (> 50% in any sector)
    sector_values = {}
    for h in holdings:
        sym = h["symbol"]
        sector = overviews.get(sym, {}).get("Sector", "Unknown/Other")
        val = h["quantity"] * h["current_price"]
        sector_values[sector] = sector_values.get(sector, 0.0) + val
        
    for sector, val in sector_values.items():
        sector_weight = val / total_val
        if sector_weight > 0.50 and sector != "Unknown/Other":
            suggestions.append({
                "type": "SECTOR_CONCENTRATION",
                "title": f"Overweight in {sector} Sector",
                "description": f"The {sector} sector accounts for {sector_weight * 100:.1f}% of your total portfolio, exposing you to systemic sector downturns.",
                "severity": "MEDIUM",
                "action": f"Reallocate capital to defensive sectors (e.g., Consumer Staples, Healthcare, Utilities) to improve diversification."
            })

    # 4. Check high correlation risk (> 0.75 correlation between stocks)
    corr_matrix = risk_metrics.get("correlation_matrix", {})
    symbols = list(corr_matrix.keys())
    high_corr_pairs = set()
    for i in range(len(symbols)):
        for j in range(i + 1, len(symbols)):
            sym_a = symbols[i]
            sym_b = symbols[j]
            corr_val = corr_matrix.get(sym_a, {}).get(sym_b, 0.0)
            if corr_val > 0.75:
                high_corr_pairs.add((sym_a, sym_b, corr_val))

    for sym_a, sym_b, corr_val in high_corr_pairs:
        suggestions.append({
            "type": "HIGH_CORRELATION",
            "title": f"High Correlation: {sym_a} & {sym_b}",
            "description": f"The correlation between {sym_a} and {sym_b} is extremely high ({corr_val:.2f}). They are likely to move in tandem, providing minimal diversification benefit.",
            "severity": "MEDIUM",
            "action": f"Consider replacing one of these holdings with an asset that exhibits lower correlation or operates in a different industry."
        })

    # 5. Check Portfolio Beta (> 1.3 indicates high volatility/market sensitivity)
    portfolio_beta = risk_metrics.get("portfolio_beta", 1.0)
    if portfolio_beta > 1.3:
        suggestions.append({
            "type": "HIGH_BETA_EXPOSURE",
            "title": "Aggressive Portfolio Beta",
            "description": f"Your portfolio beta is {portfolio_beta:.2f}, meaning it is {int((portfolio_beta - 1.0)*100)}% more volatile than the S&P 500. It will outperform in bull markets but suffer severe losses in downturns.",
            "severity": "HIGH",
            "action": "Add lower-beta assets (like utilities, consumer staples, or cash/treasury ETFs) to damp sensitivity to market crashes."
        })
    elif portfolio_beta < 0.6:
        suggestions.append({
            "type": "LOW_BETA_EXPOSURE",
            "title": "Highly Defensive Portfolio",
            "description": f"Your portfolio beta is very low ({portfolio_beta:.2f}). While highly resilient in crashes, you may significantly underperform the broader market during growth cycles.",
            "severity": "LOW",
            "action": "Consider adding growth assets (e.g., tech or consumer discretionary) if your investment horizon is long-term."
        })

    # 6. Analyze company valuation & growth (fundamental anomalies)
    for h in holdings:
        sym = h["symbol"]
        overview = overviews.get(sym, {})
        
        try:
            pe_ratio = float(overview.get("PEPercent", "0"))
            growth = float(overview.get("RevenueGrowthYoY", "0"))
        except ValueError:
            pe_ratio = 0
            growth = 0
            
        # Trigger overvalued + low growth warning
        if pe_ratio > 45.0 and growth < 0.05:
            suggestions.append({
                "type": "HIGH_VALUATION_LOW_GROWTH",
                "title": f"High Valuation with Low Growth: {sym}",
                "description": f"{sym} trades at a high P/E ratio of {pe_ratio:.1f} but shows weak quarterly revenue growth of only {growth * 100:.1f}% YoY.",
                "severity": "MEDIUM",
                "action": f"Review the investment thesis for {sym}. Trim the position if the valuation is no longer justified by fundamental growth."
            })
            
        # Trigger stable dividend compounder recommendation
        try:
            div_yield = float(overview.get("DividendYield", "0"))
        except ValueError:
            div_yield = 0
            
        if div_yield > 0.035 and pe_ratio < 18.0 and pe_ratio > 0:
            suggestions.append({
                "type": "VALUE_DIVIDEND_STABILITY",
                "title": f"Stable Value Opportunity: {sym}",
                "description": f"{sym} has a stable valuation (P/E of {pe_ratio:.1f}) and yields a solid dividend of {div_yield * 100:.1f}%.",
                "severity": "LOW",
                "action": f"This holding provides defensive cushioning. You may want to hold or increase allocation on price dips."
            })

    # 7. Check if portfolio size is too small (fewer than 4 assets)
    if len(holdings) < 4:
        suggestions.append({
            "type": "UNDER_DIVERSIFIED",
            "title": "Under-Diversified Portfolio",
            "description": "Your portfolio consists of fewer than 4 unique holdings. You are exposed to extreme risk if a single company experiences a crisis.",
            "severity": "HIGH",
            "action": "Broaden your holdings by adding 3-5 more stocks in different sectors, or invest in broad-market index ETFs (e.g., SPY, QQQ) to immediately gain diverse exposure."
        })

    return suggestions
