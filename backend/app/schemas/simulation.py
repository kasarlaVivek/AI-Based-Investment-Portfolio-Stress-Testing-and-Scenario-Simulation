from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class SimulationResultBase(BaseModel):
    scenario_name: str
    best_case_return: float
    avg_case_return: float
    worst_case_return: float
    roi_5y: float
    roi_10y: float
    num_simulations: int
    # Holds {"paths": {percentile: [...]}, "days": [...], "prob_loss_5y": float, "prob_loss_10y": float, "max_drawdown": float}
    simulation_paths: Optional[Dict[str, Any]] = None

class SimulationResultCreate(SimulationResultBase):
    pass

class SimulationResult(SimulationResultBase):
    id: int
    portfolio_id: int
    run_at: datetime

    class Config:
        from_attributes = True

class StressTestResult(BaseModel):
    scenario: str
    potential_loss: float
    risk_score: float
    impacted_stocks: List[dict] # symbol, potential_value, percentage_change
