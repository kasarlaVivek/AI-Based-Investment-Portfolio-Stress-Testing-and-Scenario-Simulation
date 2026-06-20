import httpx
import os
import json
import numpy as np
from datetime import datetime, timedelta
from ..config import ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Predefined metadata fallback for common symbols to support fundamental analysis offline
MOCK_OVERVIEWS = {
    "AAPL": {"Name": "Apple Inc.", "Sector": "Technology", "Industry": "Consumer Electronics", "PEPercent": "30.5", "EVToEBITDA": "22.1", "DividendYield": "0.0055", "RevenueGrowthYoY": "0.08"},
    "MSFT": {"Name": "Microsoft Corporation", "Sector": "Technology", "Industry": "Software-Infrastructure", "PEPercent": "35.2", "EVToEBITDA": "25.4", "DividendYield": "0.0075", "RevenueGrowthYoY": "0.15"},
    "GOOGL": {"Name": "Alphabet Inc.", "Sector": "Technology", "Industry": "Internet Content & Information", "PEPercent": "26.3", "EVToEBITDA": "18.2", "DividendYield": "0.0000", "RevenueGrowthYoY": "0.12"},
    "AMZN": {"Name": "Amazon.com Inc.", "Sector": "Consumer Cyclical", "Industry": "Internet Retail", "PEPercent": "42.1", "EVToEBITDA": "14.5", "DividendYield": "0.0000", "RevenueGrowthYoY": "0.14"},
    "TSLA": {"Name": "Tesla Inc.", "Sector": "Consumer Cyclical", "Industry": "Auto Manufacturers", "PEPercent": "55.4", "EVToEBITDA": "30.2", "DividendYield": "0.0000", "RevenueGrowthYoY": "0.19"},
    "NVDA": {"Name": "NVIDIA Corporation", "Sector": "Technology", "Industry": "Semiconductors", "PEPercent": "68.2", "EVToEBITDA": "45.1", "DividendYield": "0.0002", "RevenueGrowthYoY": "1.25"},
}

def get_cache_path(category: str, symbol: str) -> str:
    return os.path.join(CACHE_DIR, f"{category}_{symbol.upper()}.json")

def read_cache(category: str, symbol: str, max_age_hours: int = 12):
    path = get_cache_path(category, symbol)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                cached = json.load(f)
            cached_time = datetime.fromisoformat(cached["cached_at"])
            if datetime.utcnow() - cached_time < timedelta(hours=max_age_hours):
                return cached["data"]
        except Exception:
            pass
    return None

def write_cache(category: str, symbol: str, data):
    path = get_cache_path(category, symbol)
    try:
        with open(path, "w") as f:
            json.dump({"cached_at": datetime.utcnow().isoformat(), "data": data}, f)
    except Exception:
        pass

async def fetch_stock_price(symbol: str) -> float:
    symbol = symbol.upper()
    cached = read_cache("price", symbol, max_age_hours=1)
    if cached:
        return cached

    # Attempt to call Alpha Vantage
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(ALPHA_VANTAGE_BASE_URL, params={
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": ALPHA_VANTAGE_API_KEY
            }, timeout=10.0)
            
            data = response.json()
            if "Global Quote" in data and "05. price" in data["Global Quote"]:
                price = float(data["Global Quote"]["05. price"])
                write_cache("price", symbol, price)
                return price
            
            # Check for API rate limiting messages
            if "Note" in data or "Information" in data:
                print(f"Alpha Vantage rate limited when fetching price for {symbol}. Using fallback.")
    except Exception as e:
        print(f"Failed to fetch price from Alpha Vantage for {symbol}: {e}")

    # Fallback to generating dummy price based on ticker symbol hash
    # This ensures consistency for tickers
    np.random.seed(abs(hash(symbol)) % (2**32))
    base_price = 100.0 + (abs(hash(symbol)) % 400)
    mock_price = float(base_price + np.random.uniform(-5, 5))
    write_cache("price", symbol, mock_price)
    return mock_price

async def fetch_historical_data(symbol: str) -> list:
    symbol = symbol.upper()
    cached = read_cache("history", symbol, max_age_hours=24)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(ALPHA_VANTAGE_BASE_URL, params={
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "outputsize": "compact",
                "apikey": ALPHA_VANTAGE_API_KEY
            }, timeout=10.0)
            
            data = response.json()
            if "Time Series (Daily)" in data:
                time_series = data["Time Series (Daily)"]
                result = []
                for date_str, values in time_series.items():
                    result.append({
                        "date": date_str,
                        "price": float(values["4. close"])
                    })
                # Sort historical data oldest to newest
                result.sort(key=lambda x: x["date"])
                write_cache("history", symbol, result)
                return result
            
            if "Note" in data or "Information" in data:
                print(f"Alpha Vantage rate limited when fetching history for {symbol}. Using fallback.")
    except Exception as e:
        print(f"Failed to fetch history from Alpha Vantage for {symbol}: {e}")

    # Fallback simulation of daily history (e.g. 100 days)
    np.random.seed(abs(hash(symbol)) % (2**32))
    base_price = 100.0 + (abs(hash(symbol)) % 400)
    history = []
    current = base_price
    start_date = datetime.now() - timedelta(days=120)
    
    # Simple random walk to simulate close prices
    for i in range(120):
        # Exclude weekends
        date = start_date + timedelta(days=i)
        if date.weekday() >= 5:
            continue
        pct_change = np.random.normal(0.0005, 0.015)
        current = max(1.0, current * (1 + pct_change))
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": float(round(current, 2))
        })
    
    write_cache("history", symbol, history)
    return history

async def fetch_full_historical_data(symbol: str, years: int = 10) -> list:
    symbol = symbol.upper()
    cache_key = f"full_history_{years}y"
    cached = read_cache(cache_key, symbol, max_age_hours=24)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(ALPHA_VANTAGE_BASE_URL, params={
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "outputsize": "full",
                "apikey": ALPHA_VANTAGE_API_KEY
            }, timeout=15.0)

            data = response.json()
            if "Time Series (Daily)" in data:
                time_series = data["Time Series (Daily)"]
                cutoff = datetime.now() - timedelta(days=365 * years + 30)
                result = []
                for date_str, values in time_series.items():
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    if date_obj >= cutoff:
                        result.append({"date": date_str, "price": float(values["4. close"])})
                result.sort(key=lambda x: x["date"])
                if result:
                    write_cache(cache_key, symbol, result)
                    return result

            if "Note" in data or "Information" in data:
                print(f"Alpha Vantage rate limited when fetching full history for {symbol}. Using fallback.")
    except Exception as e:
        print(f"Failed to fetch full history from Alpha Vantage for {symbol}: {e}")

    # Fallback: simulate a longer daily history via random walk (business days only)
    np.random.seed(abs(hash(symbol)) % (2**32))
    base_price = 100.0 + (abs(hash(symbol)) % 400)
    total_days = 365 * years + 30
    history = []
    current = base_price
    start_date = datetime.now() - timedelta(days=total_days)
    for i in range(total_days):
        date = start_date + timedelta(days=i)
        if date.weekday() >= 5:
            continue
        pct_change = np.random.normal(0.0004, 0.013)
        current = max(1.0, current * (1 + pct_change))
        history.append({"date": date.strftime("%Y-%m-%d"), "price": float(round(current, 2))})

    write_cache(cache_key, symbol, history)
    return history

async def fetch_company_overview(symbol: str) -> dict:
    symbol = symbol.upper()
    cached = read_cache("overview", symbol, max_age_hours=72)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(ALPHA_VANTAGE_BASE_URL, params={
                "function": "OVERVIEW",
                "symbol": symbol,
                "apikey": ALPHA_VANTAGE_API_KEY
            }, timeout=10.0)
            
            data = response.json()
            if "Symbol" in data:
                overview = {
                    "Name": data.get("Name", "Unknown Company"),
                    "Sector": data.get("Sector", "General"),
                    "Industry": data.get("Industry", "General"),
                    "PEPercent": data.get("PERatio", "0"),
                    "EVToEBITDA": data.get("EVToEBITDA", "0"),
                    "DividendYield": data.get("DividendYield", "0"),
                    "RevenueGrowthYoY": data.get("QuarterlyRevenueGrowthYOY", "0")
                }
                write_cache("overview", symbol, overview)
                return overview
    except Exception as e:
        print(f"Failed to fetch overview for {symbol}: {e}")

    # Fallback Overview
    overview = MOCK_OVERVIEWS.get(symbol, {
        "Name": f"{symbol} Corp",
        "Sector": "Technology" if (abs(hash(symbol)) % 2 == 0) else "Financial",
        "Industry": "General",
        "PEPercent": str(round(np.random.uniform(15, 45), 1)),
        "EVToEBITDA": str(round(np.random.uniform(8, 25), 1)),
        "DividendYield": str(round(np.random.uniform(0.0, 0.04), 4)),
        "RevenueGrowthYoY": str(round(np.random.uniform(-0.05, 0.25), 2))
    })
    write_cache("overview", symbol, overview)
    return overview
