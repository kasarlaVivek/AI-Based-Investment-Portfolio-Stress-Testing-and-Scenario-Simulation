from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"))
    scenario_name = Column(String, index=True)
    best_case_return = Column(Float)
    avg_case_return = Column(Float)
    worst_case_return = Column(Float)
    roi_5y = Column(Float)
    roi_10y = Column(Float)
    num_simulations = Column(Integer)
    run_at = Column(DateTime, default=datetime.utcnow)
    simulation_paths = Column(JSON, nullable=True) # Cache a subset of paths (percentiles) for chart rendering

    portfolio = relationship("Portfolio", back_populates="simulations")
