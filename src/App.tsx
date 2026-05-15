import { useState, useEffect, useMemo, useRef } from 'react';
import { Star, ArrowUp, ArrowDown, Search, Lock, User, Eye, EyeOff, LogOut } from 'lucide-react';
import { getTickers, subscribeTickers, getContractDetails, getKlines } from './services/mexc';
import type { Ticker, ContractDetail } from './services/mexc';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'mexc123') {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1e2329] rounded-2xl p-8 shadow-2xl border border-white/5">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-mexc-blue/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-mexc-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Market Terminal</h1>
          <p className="text-gray-400 text-sm">Please sign in to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#2b3139] border border-transparent focus:border-mexc-blue rounded-lg py-3 pl-11 pr-4 text-white outline-none transition-all placeholder:text-gray-600"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#2b3139] border border-transparent focus:border-mexc-blue rounded-lg py-3 pl-11 pr-12 text-white outline-none transition-all placeholder:text-gray-600"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-mexc-blue hover:bg-mexc-blue/90 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-mexc-blue/20"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

const Sparkline = ({ data, width = 100, height = 30, strokeWidth = 1.5 }: { data?: number[], width?: number, height?: number, strokeWidth?: number }) => {
  if (!data || data.length === 0) return <div style={{ width, height }} className="bg-white/5 rounded-sm animate-pulse" />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={isUp ? '#00c087' : '#ff3b30'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const IntervalCell = ({ change, data, width = 80, height = 28 }: { change?: number, data?: number[], width?: number, height?: number }) => {
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  
  return (
    <div className="flex flex-col items-end space-y-1.5">
      <Sparkline data={data} width={width} height={height} strokeWidth={1.5} />
      <span className={cn(
        "font-bold text-[13px] tracking-tight leading-none",
        change === undefined ? "text-gray-700" : (isUp ? "text-[#00c087]" : isDown ? "text-[#ff3b30]" : "text-gray-500")
      )}>
        {change === undefined ? "--" : `${isUp ? '+' : ''}${(change * 100).toFixed(2)}%`}
      </span>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [tickers, setTickers] = useState<(Ticker & { isNew?: boolean; iconUrl?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Crypto');
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ 
    key: 'lastPrice' | 'riseFallRate' | 'change1h' | 'change4h' | 'change8h' | 'change2d' | 'change7d' | 'change30d', 
    direction: 'asc' | 'desc' 
  } | null>({
    key: 'riseFallRate',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchIntervalData = async (symbol: string, lastPrice: number) => {
      try {
        // Fetch specific granularities to ensure each interval has its own UNIQUE chart data
        // Each chart will use exactly 300 points for consistent density
        const [m1, m5, m15, m60, d1] = await Promise.all([
          getKlines(symbol, 'Min1', 300),  // For 1h (60m -> we use 300 points of 1m)
          getKlines(symbol, 'Min5', 300),  // For 4h (240m -> we use 300 points of 5m)
          getKlines(symbol, 'Min15', 300), // For 8h (480m -> we use 300 points of 15m)
          getKlines(symbol, 'Min60', 300), // For 24h/2d (1440m/2880m -> we use 300 points of 60m)
          getKlines(symbol, 'Day1', 365)   // For 7d/30d/1y
        ]);

        const result: any = {};

        // 1h Chart (using 300 points of 1m data)
        if (m1 && m1.close && m1.close.length > 0) {
          result.sparkline1h = m1.close;
          result.startPrice1h = m1.close[Math.max(0, m1.close.length - 60)];
        }

        // 4h Chart (using 300 points of 5m data)
        if (m5 && m5.close && m5.close.length > 0) {
          result.sparkline4h = m5.close;
          result.startPrice4h = m5.close[Math.max(0, m5.close.length - 48)]; // 48 * 5m = 4h
        }

        // 8h Chart (using 300 points of 15m data)
        if (m15 && m15.close && m15.close.length > 0) {
          result.sparkline8h = m15.close;
          result.startPrice8h = m15.close[Math.max(0, m15.close.length - 32)]; // 32 * 15m = 8h
        }

        // 24h & 2d Charts (using 300 points of 60m data)
        if (m60 && m60.close && m60.close.length > 0) {
          result.sparkline24h = m60.close;
          result.startPrice24h = m60.close[Math.max(0, m60.close.length - 24)]; // 24 * 60m = 24h
          
          // For 2d we'll also use 60m data but we can take the last 300 points (which is ~12 days)
          // or we can just use the same 60m granularity as it provides good detail for a 2d view
          result.sparkline2d = m60.close;
          result.startPrice2d = m60.close[Math.max(0, m60.close.length - 48)]; // 48 * 60m = 2d
        }

        // 7d, 30d, and 1y Charts (using Day1 data)
        if (d1 && d1.close && d1.close.length > 0) {
          const c = d1.close;
          const len = c.length;
          
          // 7d Chart (using 300 points of daily data is too much, so we take what we have)
          result.sparkline7d = c.slice(-7); 
          result.startPrice7d = c[Math.max(0, len - 7)];

          // 30d Chart
          result.sparkline30d = c.slice(-30);
          result.startPrice30d = c[Math.max(0, len - 30)];

          // 1y Chart (exactly 300 points as requested before)
          result.sparklineData = c.slice(-300);
          
          // Calculate 1y volatility based on full year data
          let minVal = c[0], maxVal = c[0], minIdx = 0, maxIdx = 0;
          c.forEach((p: number, i: number) => {
            if (p < minVal) { minVal = p; minIdx = i; }
            if (p > maxVal) { maxVal = p; maxIdx = i; }
          });
          result.volatility1y = maxIdx < minIdx ? (minVal - maxVal) / maxVal : (maxVal - minVal) / minVal;
        }

        return Object.keys(result).length > 0 ? result : null;
      } catch (err) {
        console.error(`Error calculating intervals for ${symbol}:`, err);
      }
      return null;
    };

    const initData = async () => {
      try {
        const [tickerData, contractDetails] = await Promise.all([
          getTickers(),
          getContractDetails()
        ]);

        const detailMap = new Map(contractDetails.map(d => [d.symbol, d]));
        
        const initialTickers = tickerData.filter(t => t.symbol.endsWith('_USDT')).map(t => ({
          ...t,
          isNew: detailMap.get(t.symbol)?.isNew,
          iconUrl: detailMap.get(t.symbol)?.baseCoinIconUrl,
          // Real data will be fetched and updated below
          change1h: undefined,
          change4h: undefined,
          change8h: undefined,
          change2d: undefined,
        }));
        
        setTickers(initialTickers);
        setLoading(false);

        // Fetch real interval data for all tokens
        // To avoid heavy rate limiting, we'll process them in batches
        const BATCH_SIZE = 10;
        for (let i = 0; i < initialTickers.length; i += BATCH_SIZE) {
          const batch = initialTickers.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (token) => {
            const changes = await fetchIntervalData(token.symbol, token.lastPrice);
            if (changes) {
              setTickers(prev => {
                const index = prev.findIndex(t => t.symbol === token.symbol);
                if (index === -1) return prev;
                const updated = [...prev];
                updated[index] = { ...updated[index], ...changes };
                return updated;
              });
            }
          }));
          // Very small delay since the endpoint is quite fast
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        console.error('Failed to init data:', err);
        setLoading(false);
      }
    };

    initData();

    let pollingInterval: number;

    const unsubscribe = subscribeTickers((newTicker) => {
      if (!newTicker.symbol.endsWith('_USDT')) return;
      
      setTickers(prev => {
        const index = prev.findIndex(t => t.symbol === newTicker.symbol);
        if (index === -1) return [...prev, newTicker];
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newTicker };
        return updated;
      });
    });

    // Fallback polling if WS is unreliable
    pollingInterval = window.setInterval(async () => {
      try {
        const data = await getTickers();
        const usdtTickers = data.filter(t => t.symbol.endsWith('_USDT'));
        if (usdtTickers.length > 0) {
          setTickers(prev => {
            const updated = [...prev];
            usdtTickers.forEach(newTicker => {
              const index = updated.findIndex(t => t.symbol === newTicker.symbol);
              if (index !== -1) {
                // Merge while preserving our custom fields
                updated[index] = { ...updated[index], ...newTicker };
              } else {
                // For new tickers, we add them with default mocks
                updated.push({
                  ...newTicker,
                  change1h: newTicker.riseFallRate * 0.4,
                  change4h: newTicker.riseFallRate * 0.6,
                  change8h: newTicker.riseFallRate * 0.8,
                  change2d: newTicker.riseFallRate * 1.5,
                });
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Polling failed:', err);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol) 
        : [...prev, symbol]
    );
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
  };

  const toggleSort = (key: 'lastPrice' | 'riseFallRate' | 'change1h' | 'change4h' | 'change8h' | 'change2d' | 'change7d' | 'change30d') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const filteredTickers = useMemo(() => {
    let result = tickers;
    if (activeTab === 'Favourites') {
      result = result.filter(t => favorites.includes(t.symbol));
    }
    if (activeFilter === 'New') {
      result = result.filter(t => t.isNew);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => {
        const symbol = t.symbol.toLowerCase();
        // Remove underscores and handle common variations like "BUSDT" -> "B_USDT"
        const normalizedSymbol = symbol.replace(/_/g, '');
        return symbol.includes(query) || normalizedSymbol.includes(query);
      });
    }
    
    if (sortConfig) {
      return [...result].sort((a, b) => {
        let aVal: number;
        let bVal: number;

        switch (sortConfig.key) {
          case 'change1h':
            aVal = a.startPrice1h ? (a.lastPrice - a.startPrice1h) / a.startPrice1h : -Infinity;
            bVal = b.startPrice1h ? (b.lastPrice - b.startPrice1h) / b.startPrice1h : -Infinity;
            break;
          case 'change4h':
            aVal = a.startPrice4h ? (a.lastPrice - a.startPrice4h) / a.startPrice4h : -Infinity;
            bVal = b.startPrice4h ? (b.lastPrice - b.startPrice4h) / b.startPrice4h : -Infinity;
            break;
          case 'change8h':
            aVal = a.startPrice8h ? (a.lastPrice - a.startPrice8h) / a.startPrice8h : -Infinity;
            bVal = b.startPrice8h ? (b.lastPrice - b.startPrice8h) / b.startPrice8h : -Infinity;
            break;
          case 'change2d':
             aVal = a.startPrice2d ? (a.lastPrice - a.startPrice2d) / a.startPrice2d : -Infinity;
             bVal = b.startPrice2d ? (b.lastPrice - b.startPrice2d) / b.startPrice2d : -Infinity;
             break;
           case 'change7d':
             aVal = a.startPrice7d ? (a.lastPrice - a.startPrice7d) / a.startPrice7d : -Infinity;
             bVal = b.startPrice7d ? (b.lastPrice - b.startPrice7d) / b.startPrice7d : -Infinity;
             break;
           case 'change30d':
             aVal = a.startPrice30d ? (a.lastPrice - a.startPrice30d) / a.startPrice30d : -Infinity;
             bVal = b.startPrice30d ? (b.lastPrice - b.startPrice30d) / b.startPrice30d : -Infinity;
             break;
           default:
            aVal = (a[sortConfig.key] as number) || 0;
            bVal = (b[sortConfig.key] as number) || 0;
        }

        return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    return result;
  }, [tickers, activeTab, favorites, searchQuery, sortConfig]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-mexc-bg text-white font-sans selection:bg-mexc-blue/30">
      {/* Header Tabs */}
      <div className="px-6 pt-8">
        <div className="flex items-center space-x-10 text-base font-medium border-b border-gray-900/50">
          {['Favourites', 'Crypto'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 transition-all relative",
                activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
              )}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center space-x-6 pb-4">
            <div className="relative">
              <div className="bg-mexc-card rounded-md flex items-center px-3 py-1.5 w-72 border border-transparent focus-within:border-gray-700 transition-all">
                <Search className="w-4 h-4 text-gray-500 mr-2" />
                <input
                  type="text"
                  placeholder="Search Crypto / Futures"
                  className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 outline-none placeholder:text-gray-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors text-sm font-medium px-4 py-1.5 border border-white/5 rounded-md hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex items-center space-x-6 text-sm border-b border-gray-900/30">
        {['All', 'New'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "transition-colors relative pb-1",
              activeFilter === filter ? "text-white font-bold" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {filter}
            {activeFilter === filter && (
              <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="px-6 py-6 pb-20 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-[12px] border-b border-gray-900/50">
                <th className="pb-4 font-normal w-10"></th>
                <th className="pb-4 font-normal w-48">Trading Pair</th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('lastPrice')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Price</span>
                    {sortConfig?.key === 'lastPrice' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="pb-4 font-normal text-center w-64">Last 1 Year</th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('change30d')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>30d</span>
                    {sortConfig?.key === 'change30d' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('change7d')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>7d</span>
                    {sortConfig?.key === 'change7d' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('change2d')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>2d</span>
                    {sortConfig?.key === 'change2d' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('riseFallRate')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>24h</span>
                    {sortConfig?.key === 'riseFallRate' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('change8h')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>8h</span>
                    {sortConfig?.key === 'change8h' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-32"
                  onClick={() => toggleSort('change4h')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>4h</span>
                    {sortConfig?.key === 'change4h' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors pr-4 w-32"
                  onClick={() => toggleSort('change1h')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>1h</span>
                    {sortConfig?.key === 'change1h' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-40">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm tracking-wide">Fetching market data...</span>
                  </div>
                </td></tr>
              ) : filteredTickers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-32 text-gray-500 text-sm">No matching pairs found</td></tr>
              ) : filteredTickers.map((ticker) => (
                <tr key={ticker.symbol} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all group">
                  <td className="py-5 pl-2">
                    <Star
                      className={cn(
                        "w-[14px] h-[14px] cursor-pointer transition-all",
                        favorites.includes(ticker.symbol) ? "fill-white text-white" : "text-gray-700 hover:text-gray-400"
                      )}
                      onClick={() => toggleFavorite(ticker.symbol)}
                    />
                  </td>
                  <td className="py-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                      {ticker.iconUrl ? (
                        <img 
                          src={ticker.iconUrl.startsWith('http') ? ticker.iconUrl : `https://public.mocortech.com/coin/${ticker.iconUrl}`} 
                          alt={ticker.symbol} 
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-[10px] font-bold text-gray-400">${ticker.symbol.charAt(0)}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-[10px] font-bold text-gray-400">
                          {ticker.symbol.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[14px] text-white tracking-tight">{ticker.symbol.replace('_', '')}</span>
                      </div>
                    </div>
                  </div>
                </td>
                  <td className="py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[15px] font-bold text-white tracking-tight leading-none">
                        {(ticker.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium mt-1.5">
                        ${(ticker.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 text-center">
                    <div className="flex flex-col items-center">
                      <Sparkline data={ticker.sparklineData} width={140} height={45} strokeWidth={2} />
                      {ticker.volatility1y !== undefined && (
                        <span className={cn(
                          "text-[10px] mt-2 font-bold tracking-tight px-1.5 py-0.5 rounded-sm",
                          ticker.volatility1y > 0 ? "text-[#00c087] bg-[#00c087]/10" : "text-[#ff3b30] bg-[#ff3b30]/10"
                        )}>
                          1y: {ticker.volatility1y > 0 ? '+' : ''}{(ticker.volatility1y * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.startPrice30d ? (ticker.lastPrice - ticker.startPrice30d) / ticker.startPrice30d : undefined} 
                        data={ticker.sparkline30d} 
                      />
                    </td>
                    <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.startPrice7d ? (ticker.lastPrice - ticker.startPrice7d) / ticker.startPrice7d : undefined} 
                        data={ticker.sparkline7d} 
                      />
                    </td>
                    <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.startPrice2d ? (ticker.lastPrice - ticker.startPrice2d) / ticker.startPrice2d : undefined} 
                        data={ticker.sparkline2d} 
                      />
                    </td>
                    <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.riseFallRate} 
                        data={ticker.sparkline24h} 
                      />
                    </td>
                    <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.startPrice8h ? (ticker.lastPrice - ticker.startPrice8h) / ticker.startPrice8h : undefined} 
                        data={ticker.sparkline8h} 
                      />
                    </td>
                    <td className="py-5 text-right">
                      <IntervalCell 
                        change={ticker.startPrice4h ? (ticker.lastPrice - ticker.startPrice4h) / ticker.startPrice4h : undefined} 
                        data={ticker.sparkline4h} 
                      />
                    </td>
                    <td className="py-5 text-right pr-4">
                      <IntervalCell 
                        change={ticker.startPrice1h ? (ticker.lastPrice - ticker.startPrice1h) / ticker.startPrice1h : undefined} 
                        data={ticker.sparkline1h} 
                      />
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
