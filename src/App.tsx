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

const Sparkline = ({ data, dataOpen, dataTime, width = 100, height = 30, maxPoints, showDailyLines }: { data?: number[], dataOpen?: number[], dataTime?: number[], width?: number, height?: number, maxPoints?: number, showDailyLines?: boolean }) => {
  if (!data || data.length === 0) return <div style={{ width, height }} className="bg-white/5 rounded-sm animate-pulse" />;
  
  const allValues = dataOpen ? [...data, ...dataOpen] : data;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  
  const effectivePoints = maxPoints || data.length;
  const candleWidth = width / effectivePoints;
  const offset = maxPoints ? (maxPoints - data.length) * candleWidth : 0;
  const gap = candleWidth * 0.1;

  // Generate vertical lines synchronized with MEXC server time (candle timestamps)
  const verticalLines = [];
  if (showDailyLines && dataTime) {
    dataTime.forEach((timestamp, i) => {
      // Check if this candle marks the start of a new day in UTC (00:00)
      const date = new Date(timestamp * 1000);
      if (date.getUTCHours() === 0) {
        const lineX = offset + (i * candleWidth);
        if (lineX > offset && lineX < width + offset) {
          verticalLines.push(lineX);
        }
      }
    });
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Daily separator markers (dots at the top) */}
      {verticalLines.map((lx, idx) => (
        <circle
          key={`dot-${idx}`}
          cx={lx}
          cy={0}
          r={1.5}
          fill="white"
          fillOpacity="0.8"
          className="drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]"
        />
      ))}
      {data.map((close, i) => {
        const open = (dataOpen && dataOpen[i] !== undefined) ? dataOpen[i] : (i > 0 ? data[i-1] : close);
        const x = offset + (i * candleWidth);
        const yOpen = height - ((open - min) / range) * height;
        const yClose = height - ((close - min) / range) * height;
        
        const top = Math.min(yOpen, yClose);
        const bottom = Math.max(yOpen, yClose);
        const candleHeight = Math.max(bottom - top, 0.5); // Ensure at least 0.5px height
        const isUp = close >= open;

        return (
          <rect
            key={i}
            x={x}
            y={top}
            width={Math.max(candleWidth - (candleWidth > 2 ? gap * 2 : 0), 0.1)}
            height={candleHeight}
            fill={isUp ? '#00c087' : '#ff3b30'}
            className="transition-all duration-300"
          />
        );
      })}
    </svg>
  );
};

const IntervalCell = ({ change, data, dataOpen, dataTime, width = 80, height = 28, maxPoints, showDailyLines }: { change?: number, data?: number[], dataOpen?: number[], dataTime?: number[], width?: number, height?: number, maxPoints?: number, showDailyLines?: boolean }) => {
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  
  return (
    <div className="flex flex-col items-end space-y-1.5">
      <Sparkline data={data} dataOpen={dataOpen} dataTime={dataTime} width={width} height={height} maxPoints={maxPoints} showDailyLines={showDailyLines} />
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
    key: 'lastPrice' | 'riseFallRate', 
    direction: 'asc' | 'desc' 
  } | null>({
    key: 'riseFallRate',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchIntervalData = async (symbol: string, lastPrice: number) => {
      try {
        // Fetch Min60 for short-term intervals (6d = 144h)
        const shortTermData = await getKlines(symbol, 'Min60', 144);
        // Fetch Day1 for the 1-year chart
        const longTermData = await getKlines(symbol, 'Day1', 365);

        const result: any = {};

        if (shortTermData && shortTermData.close && shortTermData.close.length > 0) {
          const sClose = shortTermData.close;
          const sOpen = shortTermData.open || [];
          const sTime = shortTermData.time || [];
          const sLen = sClose.length;

          const getShortMetrics = (candlesBack: number) => {
            if (sLen < candlesBack) return { startPrice: sClose[0], sparkline: sClose, sparklineOpen: sOpen, sparklineTime: sTime };
            const startPrice = sClose[sLen - candlesBack];
            const sparkline = sClose.slice(-candlesBack);
            const sparklineOpen = sOpen.slice(-candlesBack);
            const sparklineTime = sTime.slice(-candlesBack);
            return { startPrice, sparkline, sparklineOpen, sparklineTime };
          };

          const m6d = getShortMetrics(144); // 144 * 1h = 144h (6 days)

          Object.assign(result, {
            startPrice6d: m6d.startPrice,
            sparkline6d: m6d.sparkline,
            sparkline6dOpen: m6d.sparklineOpen,
            sparkline6dTime: m6d.sparklineTime,
          });
        }

        if (longTermData && longTermData.close && longTermData.close.length > 0) {
          const lClose = longTermData.close;
          const lOpen = longTermData.open || [];
          const lLen = lClose.length;

          // Calculate volatility for the entire duration (1 year)
          let minVal = lClose[0];
          let maxVal = lClose[0];
          let minIdx = 0;
          let maxIdx = 0;

          lClose.forEach((p: number, i: number) => {
            if (p < minVal) { minVal = p; minIdx = i; }
            if (p > maxVal) { maxVal = p; maxIdx = i; }
          });

          const volatility1y = maxIdx < minIdx 
            ? (minVal - maxVal) / maxVal  // Max was older, negative change
            : (maxVal - minVal) / minVal; // Min was older, positive change

          Object.assign(result, {
            sparklineData: lClose,
            sparklineDataOpen: lOpen,
            volatility1y: volatility1y,
          });
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
                updated.push(newTicker);
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

  const toggleSort = (key: 'lastPrice' | 'riseFallRate') => {
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
        const aVal = (a[sortConfig.key] as number) || 0;
        const bVal = (b[sortConfig.key] as number) || 0;
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
        <div className="max-w-[1900px] mx-auto">
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
                <th className="pb-4 font-normal text-center w-[600px]">Last 1 Year</th>
                <th 
                  className="pb-4 font-normal text-right cursor-pointer hover:text-white transition-colors w-[600px] pr-4"
                  onClick={() => toggleSort('riseFallRate')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>6d</span>
                    {sortConfig?.key === 'riseFallRate' && (
                      sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-40">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-10 h-10 border-2 border-mexc-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm tracking-wide">Fetching market data...</span>
                  </div>
                </td></tr>
              ) : filteredTickers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-32 text-gray-500 text-sm">No matching pairs found</td></tr>
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
                      <Sparkline data={ticker.sparklineData} dataOpen={ticker.sparklineDataOpen} width={580} height={100} maxPoints={365} />
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
                    <td className="py-5 text-right pr-4">
                      <IntervalCell 
                        change={ticker.startPrice6d ? (ticker.lastPrice - ticker.startPrice6d) / ticker.startPrice6d : undefined} 
                        data={ticker.sparkline6d} 
                        dataOpen={ticker.sparkline6dOpen}
                        dataTime={ticker.sparkline6dTime}
                        width={580}
                        height={80}
                        maxPoints={144}
                        showDailyLines={true}
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