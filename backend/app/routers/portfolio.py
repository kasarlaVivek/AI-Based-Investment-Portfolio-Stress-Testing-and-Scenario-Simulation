import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import portfolio as models
from ..models.user import User
from ..schemas import portfolio as schemas
from ..services.market_data import fetch_stock_price, fetch_company_overview, fetch_historical_data
from ..services.auth import get_current_user
from ..services.risk_analysis import compute_portfolio_risk_metrics

router = APIRouter(prefix="/portfolio", tags=["Portfolios"])

@router.get("/market/{symbol}/history")
async def get_market_history(symbol: str):
    """
    Retrieves historical stock close prices for performance charting.
    """
    return await fetch_historical_data(symbol)

@router.post("/", response_model=schemas.Portfolio, status_code=status.HTTP_201_CREATED)
def create_portfolio(
    portfolio: schemas.PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new portfolio with its associated stock holdings.
    """
    db_portfolio = models.Portfolio(name=portfolio.name, user_id=current_user.id)
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)

    for holding in portfolio.holdings:
        db_holding = models.StockHolding(
            portfolio_id=db_portfolio.id,
            symbol=holding.symbol.upper().strip(),
            quantity=holding.quantity,
            purchase_price=holding.purchase_price,
            sector=holding.sector
        )
        db.add(db_holding)
    
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

@router.post("/upload", response_model=schemas.Portfolio, status_code=status.HTTP_201_CREATED)
async def upload_portfolio_csv(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new portfolio from an uploaded CSV file.
    CSV format should contain: Symbol, Quantity, Purchase Price
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV."
        )

    try:
        contents = await file.read()
        buffer = io.StringIO(contents.decode('utf-8'))
        reader = csv.reader(buffer)
        
        # Skip header if it contains headers
        rows = list(reader)
        if not rows:
            raise HTTPException(status_code=400, detail="CSV is empty.")
            
        header = [col.lower().strip().replace(" ", "_") for col in rows[0]]
        
        # Determine column indexes
        sym_idx, qty_idx, prc_idx = -1, -1, -1
        
        # Map common names
        for idx, col in enumerate(header):
            if "symbol" in col or "ticker" in col or "stock" in col:
                sym_idx = idx
            elif "quantity" in col or "shares" in col or "qty" in col:
                qty_idx = idx
            elif "purchase_price" in col or "price" in col or "cost" in col or "buy" in col:
                prc_idx = idx
        
        # Fallback to column indices if header mapping failed
        if sym_idx == -1 or qty_idx == -1 or prc_idx == -1:
            sym_idx, qty_idx, prc_idx = 0, 1, 2
            
        start_row = 1 if (rows[0][0].isalpha() and not rows[0][1].replace(".","").isdigit()) else 0
        
        holdings_to_create = []
        for row in rows[start_row:]:
            if len(row) <= max(sym_idx, qty_idx, prc_idx):
                continue
            symbol = row[sym_idx].strip().upper()
            if not symbol:
                continue
            try:
                quantity = float(row[qty_idx].strip())
                purchase_price = float(row[prc_idx].strip())
            except ValueError:
                continue # Skip corrupt rows
                
            holdings_to_create.append({
                "symbol": symbol,
                "quantity": quantity,
                "purchase_price": purchase_price
            })
            
        if not holdings_to_create:
            raise HTTPException(status_code=400, detail="No valid holdings could be parsed from the CSV.")

        # Create portfolio in database
        db_portfolio = models.Portfolio(name=name, user_id=current_user.id)
        db.add(db_portfolio)
        db.commit()
        db.refresh(db_portfolio)
        
        # Add holdings and fetch sectors asynchronously
        for holding in holdings_to_create:
            # Try to fetch sector
            try:
                overview = await fetch_company_overview(holding["symbol"])
                sector = overview.get("Sector", "General")
            except Exception:
                sector = "General"
                
            db_holding = models.StockHolding(
                portfolio_id=db_portfolio.id,
                symbol=holding["symbol"],
                quantity=holding["quantity"],
                purchase_price=holding["purchase_price"],
                sector=sector
            )
            db.add(db_holding)
            
        db.commit()
        db.refresh(db_portfolio)
        return db_portfolio
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CSV: {str(e)}"
        )

@router.get("/", response_model=List[schemas.Portfolio])
def list_portfolios(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Lists all portfolios owned by the current user.
    """
    return db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).all()

@router.get("/compare")
async def compare_portfolios(
    ids: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compares value, return, and risk metrics across two or more of the user's portfolios side by side.
    `ids` is a comma-separated list of portfolio ids, e.g. "1,2,3".
    """
    try:
        portfolio_ids = [int(x) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids must be a comma-separated list of integers.")

    if len(portfolio_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 portfolio ids to compare.")

    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.id.in_(portfolio_ids), models.Portfolio.user_id == current_user.id
    ).all()
    if len(portfolios) < 2:
        raise HTTPException(status_code=404, detail="At least 2 owned portfolios with those ids are required.")

    results = []
    for portfolio in portfolios:
        if not portfolio.holdings:
            continue

        holdings_list = []
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

        risk_metrics = await compute_portfolio_risk_metrics(holdings_list)

        results.append({
            "id": portfolio.id,
            "name": portfolio.name,
            "num_holdings": len(portfolio.holdings),
            "total_cost": total_cost,
            "current_value": current_value,
            "profit_loss_percentage": ((current_value - total_cost) / total_cost * 100) if total_cost > 0 else 0.0,
            "portfolio_volatility": risk_metrics.get("portfolio_volatility"),
            "portfolio_beta": risk_metrics.get("portfolio_beta"),
            "sharpe_ratio": risk_metrics.get("sharpe_ratio"),
            "value_at_risk_95": risk_metrics.get("value_at_risk_95"),
        })

    return {"portfolios": results}

@router.get("/{portfolio_id}", response_model=schemas.PortfolioDetail)
async def get_portfolio_detail(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full details of a specific portfolio, including live prices, values, and total profit/loss.
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found."
        )
        
    holdings_detail = []
    total_cost = 0.0
    current_value = 0.0
    
    for holding in portfolio.holdings:
        try:
            current_price = await fetch_stock_price(holding.symbol)
        except Exception:
            current_price = holding.purchase_price # fallback
            
        cost = holding.quantity * holding.purchase_price
        val = holding.quantity * current_price
        pnl = val - cost
        pnl_pct = (pnl / cost * 100) if cost > 0 else 0.0
        
        total_cost += cost
        current_value += val
        
        holdings_detail.append({
            "id": holding.id,
            "symbol": holding.symbol,
            "quantity": holding.quantity,
            "purchase_price": holding.purchase_price,
            "current_price": current_price,
            "cost": cost,
            "current_value": val,
            "pnl": pnl,
            "pnl_percentage": pnl_pct,
            "sector": holding.sector or "General"
        })
        
    pnl_total = current_value - total_cost
    pnl_total_pct = (pnl_total / total_cost * 100) if total_cost > 0 else 0.0
    
    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "created_at": portfolio.created_at,
        "updated_at": portfolio.updated_at,
        "holdings": portfolio.holdings,
        "current_value": current_value,
        "total_cost": total_cost,
        "profit_loss": pnl_total,
        "profit_loss_percentage": pnl_total_pct,
        "holdings_detail": holdings_detail
    }

@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a portfolio and all its child holdings and simulations.
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found."
        )
    db.delete(portfolio)
    db.commit()
    return None

@router.get("/{portfolio_id}/sector-exposure")
async def get_sector_exposure(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregates current portfolio value by sector for donut/pie chart visualization.
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id, models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
    if not portfolio.holdings:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Portfolio has no holdings.")

    sector_values = {}
    total_value = 0.0
    for h in portfolio.holdings:
        try:
            current_price = await fetch_stock_price(h.symbol)
        except Exception:
            current_price = h.purchase_price
        value = h.quantity * current_price
        sector = (h.sector or "General").strip().title()
        sector_values[sector] = sector_values.get(sector, 0.0) + value
        total_value += value

    breakdown = [
        {
            "sector": sector,
            "value": value,
            "percentage": (value / total_value * 100) if total_value > 0 else 0.0
        }
        for sector, value in sorted(sector_values.items(), key=lambda kv: kv[1], reverse=True)
    ]
    return {"total_value": total_value, "breakdown": breakdown}
