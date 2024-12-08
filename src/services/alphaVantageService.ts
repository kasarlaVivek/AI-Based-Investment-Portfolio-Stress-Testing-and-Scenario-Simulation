import axios from 'axios';
import { ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL } from '../config/constants';

export async function fetchStockPrice(symbol: string): Promise<number> {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: ALPHA_VANTAGE_API_KEY,
      },
    });

    const price = parseFloat(response.data['Global Quote']['05. price']);
    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    throw error;
  }
}

export async function fetchHistoricalData(symbol: string): Promise<any[]> {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        outputsize: 'compact',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
    });

    const timeSeriesData = response.data['Time Series (Daily)'];
    return Object.entries(timeSeriesData).map(([date, values]: [string, any]) => ({
      date,
      price: parseFloat(values['4. close']),
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}