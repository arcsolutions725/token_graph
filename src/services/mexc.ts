import axios from 'axios';

const BASE_URL = '/api/mexc/api/v1';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_URL = `${wsProtocol}//${window.location.host}/ws/mexc/ws`;

export interface ContractDetail {
  symbol: string;
  isNew: boolean;
  isHot: boolean;
  baseCoinIconUrl?: string;
}

export const getContractDetails = async (): Promise<ContractDetail[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/contract/detail`);
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching contract details:', error);
    return [];
  }
};

export const getTickers = async (): Promise<Ticker[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/contract/ticker`);
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return [];
  }
};

export interface Ticker {
  symbol: string;
  lastPrice: number;
  riseFallRate: number; // 24h Change
  startPrice6d?: number;
  volatility1y?: number;
  sparklineData?: number[];
  sparklineDataOpen?: number[];
  sparkline6d?: number[];
  sparkline6dOpen?: number[];
  sparkline6dTime?: number[];
  highPrice24: number;
  lowPrice24: number;
  amount24: number;
  volume24: number;
  timestamp: number;
}

export interface WSTicker {
  symbol: string;
  lastPrice: number;
  riseFallRate: number;
  highPrice24: number;
  lowPrice24: number;
  amount24: number;
  volume24: number;
  timestamp: number;
}

export const getKlines = async (symbol: string, interval: string, limit: number = 500): Promise<any> => {
  try {
    // Note: Futures API kline endpoint uses Min60 for 1h, Day1 for 1d, etc.
    const response = await axios.get(`${BASE_URL}/contract/kline/${symbol}`, {
      params: { interval, limit }
    });
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
};

export const subscribeTickers = (onMessage: (data: WSTicker) => void) => {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      method: 'sub.tickers',
      param: {}
    }));
  };

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.channel === 'push.tickers') {
      response.data.forEach((ticker: WSTicker) => {
        onMessage(ticker);
      });
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };

  return () => ws.close();
};
