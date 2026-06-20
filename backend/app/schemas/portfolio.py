from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class StockHoldingBase(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g. AAPL")
    quantity: float = Field(..., gt=0, description="Quantity held")
    purchase_price: float = Field(..., gt=0, description="Purchase price per share")
    sector: Optional[str] = Field(None, description="Industry sector")

class StockHoldingCreate(StockHoldingBase):
    pass

class StockHolding(StockHoldingBase):
    id: int
    portfolio_id: int

    class Config:
        from_attributes = True

class PortfolioBase(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the portfolio")

class PortfolioCreate(PortfolioBase):
    holdings: List[StockHoldingCreate]

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None

class Portfolio(PortfolioBase):
    id: int
    created_at: datetime
    updated_at: datetime
    holdings: List[StockHolding] = []

    class Config:
        from_attributes = True

class PortfolioDetail(Portfolio):
    current_value: float
    total_cost: float
    profit_loss: float
    profit_loss_percentage: float
    # Detailed info per holding (symbol, quantity, purchase_price, current_price, current_value, pnl, pnl_pct, sector)
    holdings_detail: List[dict] = []
