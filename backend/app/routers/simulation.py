from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from ..models import portfolio as portfolio_models
from ..models import simulation as sim_models
from ..models.user import User
from ..schemas import simulation as schemas
from ..services.auth import get_current_user
from ..services.market_data import fetch_stock_price
from ..services.monte_carlo import run_portfolio_monte_carlo, SCENARIOS
from ..services.risk_analysis import compute_portfolio_risk_metrics
from ..services.suggestions import generate_portfolio_suggestions
from ..services.efficient_frontier import compute_efficient_frontier
from ..services.backtest import run_historical_backtest
from ..services.pdf_report import generate_portfolio_report
from ..services.recommendations import suggest_new_assets

router = APIRouter(tags=["Simulations & Risk Analysis"])

def _get_owned_portfolio(portfolio_id: int, db: Session, current_user: User) -> portfolio_models.Portfolio:
    portfolio = db.query(portfolio_models.Portfolio).filter(
        portfolio_models.Portfolio.id == portfolio_id,
        portfolio_models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
    return portfolio

async def _holdings_with_prices(portfolio: portfolio_models.Portfolio) -> List[Dict[str, Any]]:
    holdings_list = []
    for h in portfolio.holdings:
        try:
            current_price = await fetch_stock_price(h.symbol)
        except Exception:
            current_price = h.purchase_price
        holdings_list.append({
            "symbol": h.symbol,
            "quantity": h.quantity,
            "current_price": current_price
        })
    return holdings_list

@router.post("/portfolio/{portfolio_id}/simulate", response_model=List[schemas.SimulationResult])
async def run_portfolio_simulation(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Runs Monte Carlo simulation for the portfolio across all 5 scenarios (Bull, Normal, Bear, Crash, High Inflation).
    Saves/caches the results in the SQLite database.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)

    if not portfolio.holdings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio must contain at least one holding to run simulation."
        )

    holdings_list = await _holdings_with_prices(portfolio)

    # Clear previous cached results
    db.query(sim_models.SimulationResult).filter(
        sim_models.SimulationResult.portfolio_id == portfolio_id
    ).delete()

    results = []
    for scenario_key in SCENARIOS.keys():
        sim_res = await run_portfolio_monte_carlo(
            holdings=holdings_list,
            scenario_key=scenario_key,
            num_simulations=1000,
            years=10
        )

        db_res = sim_models.SimulationResult(
            portfolio_id=portfolio_id,
            scenario_name=sim_res["scenario_name"],
            best_case_return=sim_res["best_case_return"],
            avg_case_return=sim_res["avg_case_return"],
            worst_case_return=sim_res["worst_case_return"],
            roi_5y=sim_res["roi_5y"],
            roi_10y=sim_res["roi_10y"],
            num_simulations=sim_res["num_simulations"],
            simulation_paths={
                "paths": sim_res["simulation_paths"],
                "days": sim_res["chart_days"],
                "prob_loss_5y": sim_res["prob_loss_5y"],
                "prob_loss_10y": sim_res["prob_loss_10y"],
                "max_drawdown": sim_res["max_drawdown"]
            }
        )
        db.add(db_res)
        results.append(db_res)

    db.commit()
    for r in results:
        db.refresh(r)

    return results

@router.get("/portfolio/{portfolio_id}/simulation-results", response_model=List[schemas.SimulationResult])
def get_cached_simulation_results(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves previously cached Monte Carlo simulation results for a portfolio.
    """
    _get_owned_portfolio(portfolio_id, db, current_user)

    results = db.query(sim_models.SimulationResult).filter(
        sim_models.SimulationResult.portfolio_id == portfolio_id
    ).all()

    if not results:
        # If no simulations are cached, run them automatically
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No simulation results found. Trigger simulations by calling the /simulate endpoint."
        )
    return results

@router.get("/portfolio/{portfolio_id}/risk-analysis")
async def get_portfolio_risk_analysis(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes Modern Portfolio Theory (MPT) risk statistics and the stock correlation matrix.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = await _holdings_with_prices(portfolio)
    risk_metrics = await compute_portfolio_risk_metrics(holdings_list)
    return risk_metrics

@router.get("/portfolio/{portfolio_id}/suggestions")
async def get_portfolio_suggestions(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves AI-powered suggestions and rebalancing insights for the portfolio.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = await _holdings_with_prices(portfolio)
    risk_metrics = await compute_portfolio_risk_metrics(holdings_list)
    suggestions = await generate_portfolio_suggestions(holdings_list, risk_metrics)
    return suggestions

@router.get("/portfolio/{portfolio_id}/asset-suggestions")
async def get_asset_suggestions(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scans a candidate universe of assets not already held and recommends the ones that
    would most improve the portfolio's risk/return profile if added.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = await _holdings_with_prices(portfolio)
    risk_metrics = await compute_portfolio_risk_metrics(holdings_list)
    return await suggest_new_assets(holdings_list, risk_metrics)

@router.get("/portfolio/{portfolio_id}/efficient-frontier")
async def get_efficient_frontier(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes the Modern Portfolio Theory efficient frontier, plus the minimum-variance
    and maximum-Sharpe-ratio portfolios, for the current holdings.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = await _holdings_with_prices(portfolio)
    return await compute_efficient_frontier(holdings_list)

@router.get("/portfolio/{portfolio_id}/backtest")
async def get_portfolio_backtest(
    portfolio_id: int,
    years: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Backtests the current holdings (buy-and-hold) against real historical prices over
    the requested horizon, compared against SPY and QQQ benchmarks.
    """
    if years not in (1, 3, 5, 10):
        raise HTTPException(status_code=400, detail="years must be one of 1, 3, 5, 10.")

    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = [{"symbol": h.symbol, "quantity": h.quantity} for h in portfolio.holdings]
    result = await run_historical_backtest(holdings_list, years=years)
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])
    return result

@router.get("/portfolio/{portfolio_id}/report")
async def download_portfolio_report(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and returns a downloadable PDF report summarizing portfolio composition,
    risk metrics, simulation results, and AI suggestions.
    """
    portfolio = _get_owned_portfolio(portfolio_id, db, current_user)
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings.")

    holdings_list = []
    holdings_detail = []
    total_cost = 0.0
    current_value = 0.0
    for h in portfolio.holdings:
        try:
            current_price = await fetch_stock_price(h.symbol)
        except Exception:
            current_price = h.purchase_price
        cost = h.quantity * h.purchase_price
        val = h.quantity * current_price
        total_cost += cost
        current_value += val
        holdings_list.append({"symbol": h.symbol, "quantity": h.quantity, "current_price": current_price})
        holdings_detail.append({
            "symbol": h.symbol, "quantity": h.quantity, "purchase_price": h.purchase_price,
            "current_price": current_price, "current_value": val,
            "pnl_percentage": ((val - cost) / cost * 100) if cost > 0 else 0.0
        })

    portfolio_dict = {
        "name": portfolio.name,
        "holdings_detail": holdings_detail,
        "total_cost": total_cost,
        "current_value": current_value,
        "profit_loss_percentage": ((current_value - total_cost) / total_cost * 100) if total_cost > 0 else 0.0
    }

    risk_metrics = await compute_portfolio_risk_metrics(holdings_list)
    suggestions = await generate_portfolio_suggestions(holdings_list, risk_metrics)
    sim_results = db.query(sim_models.SimulationResult).filter(
        sim_models.SimulationResult.portfolio_id == portfolio_id
    ).all()
    simulations = [
        {
            "scenario_name": s.scenario_name, "worst_case_return": s.worst_case_return,
            "avg_case_return": s.avg_case_return, "best_case_return": s.best_case_return,
            "roi_5y": s.roi_5y, "roi_10y": s.roi_10y
        } for s in sim_results
    ]

    pdf_bytes = generate_portfolio_report(portfolio_dict, risk_metrics, simulations, suggestions)
    filename = f"{portfolio.name.replace(' ', '_')}_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
