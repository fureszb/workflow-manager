import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, RefreshCw, DollarSign, Cpu, Activity, Database, Server } from 'lucide-react';
import api from '../utils/api';

// Format date for API
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Get default date range (last 30 days)
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
};

// Stats Card Component
const StatsCard = ({ title, value, subValue, icon: Icon, color }) => (
  <div
    className="rounded-lg p-6 border"
    style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)',
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: color + '20' }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold" style={{ color }}>
          {value}
        </div>
        {subValue !== undefined && (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {subValue}
          </div>
        )}
      </div>
    </div>
    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h3>
  </div>
);

// Chart Card Wrapper
const ChartCard = ({ title, children }) => (
  <div
    className="rounded-lg p-6 border"
    style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)',
    }}
  >
    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h2>
    {children}
  </div>
);

const TokenMonitor = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [dailyUsage, setDailyUsage] = useState([]);
  const [monthlyUsage, setMonthlyUsage] = useState([]);
  const [modelUsage, setModelUsage] = useState([]);
  const [costData, setCostData] = useState(null);
  const [ollamaStats, setOllamaStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const params = {
      start_date: formatDate(dateRange.start),
      end_date: formatDate(dateRange.end),
    };

    try {
      const [dailyRes, monthlyRes, modelRes, costRes, ollamaRes] = await Promise.all([
        api.get('/v1/tokens/usage/daily', { params }),
        api.get('/v1/tokens/usage/monthly', { params }),
        api.get('/v1/tokens/usage/by-model', { params }),
        api.get('/v1/tokens/cost', { params }),
        api.get('/v1/tokens/ollama-stats', { params }),
      ]);
      setDailyUsage(dailyRes.data);
      setMonthlyUsage(monthlyRes.data);
      setModelUsage(modelRes.data);
      setCostData(costRes.data);
      setOllamaStats(ollamaRes.data);
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Theme-aware chart colors
  const chartColors = {
    primary: 'var(--accent)',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    error: '#ef4444',
    purple: '#8b5cf6',
  };

  // Custom tooltip style
  const tooltipStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
  };

  // Date range presets
  const setPresetRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({ start, end });
  };

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Custom label for pie chart
  const renderCustomLabel = ({ model_name, total_tokens, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    return `${model_name}: ${formatNumber(total_tokens)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date range */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Token Monitor
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              AI token hasznalat nyomon kovetese es koltsegbecsles
            </p>
          </div>

          {/* Date range selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="date"
                value={formatDate(dateRange.start)}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>-</span>
              <input
                type="date"
                value={formatDate(dateRange.end)}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="flex gap-1">
              {[
                { label: '7 nap', days: 7 },
                { label: '30 nap', days: 30 },
                { label: '90 nap', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setPresetRange(days)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              title="Frissites"
            >
              <RefreshCw size={16} style={{ color: 'var(--text-primary)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Osszes Koltseg"
          value={`$${(costData?.total_cost || 0).toFixed(4)}`}
          subValue={costData?.currency || 'USD'}
          icon={DollarSign}
          color={chartColors.success}
        />
        <StatsCard
          title="Osszes Token"
          value={formatNumber(costData?.total_tokens || 0)}
          subValue={`${formatNumber(costData?.total_input_tokens || 0)} in / ${formatNumber(costData?.total_output_tokens || 0)} out`}
          icon={Cpu}
          color={chartColors.info}
        />
        <StatsCard
          title="Osszes Keres"
          value={formatNumber(costData?.total_requests || 0)}
          subValue={`Atl. $${(costData?.avg_cost_per_request || 0).toFixed(6)}/keres`}
          icon={Activity}
          color={chartColors.warning}
        />
        <StatsCard
          title="Lokalis AI (Ollama)"
          value={formatNumber(ollamaStats?.total_requests || 0)}
          subValue={`${formatNumber((ollamaStats?.total_input_tokens || 0) + (ollamaStats?.total_output_tokens || 0))} token`}
          icon={Server}
          color={chartColors.purple}
        />
      </div>

      {/* Daily usage bar chart */}
      <ChartCard title="Napi Token Hasznalat">
        {dailyUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [formatNumber(value), name]}
              />
              <Legend />
              <Bar dataKey="input_tokens" name="Input Tokenek" fill={chartColors.info} stackId="tokens" />
              <Bar dataKey="output_tokens" name="Output Tokenek" fill={chartColors.success} stackId="tokens" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
            Nincs adat a megadott idoszakban
          </div>
        )}
      </ChartCard>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly usage area chart */}
        <ChartCard title="Havi Token Hasznalat">
          {monthlyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [formatNumber(value), name]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="input_tokens"
                  name="Input Tokenek"
                  stackId="1"
                  stroke={chartColors.info}
                  fill={chartColors.info}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="output_tokens"
                  name="Output Tokenek"
                  stackId="1"
                  stroke={chartColors.success}
                  fill={chartColors.success}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott idoszakban
            </div>
          )}
        </ChartCard>

        {/* Model usage pie chart */}
        <ChartCard title="Token Hasznalat Modell Szerint">
          {modelUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelUsage}
                  dataKey="total_tokens"
                  nameKey="model_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={renderCustomLabel}
                >
                  {modelUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name, props) => [
                    `${formatNumber(value)} tokens ($${(props.payload?.cost ?? 0).toFixed(4)})`,
                    props.payload?.model_name || name
                  ]}
                />
                <Legend
                  formatter={(value, entry) => {
                    const item = modelUsage.find(m => m.model_name === value);
                    return `${value} (${item?.provider || ''})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott idoszakban
            </div>
          )}
        </ChartCard>
      </div>

      {/* Cost breakdown table */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Koltseg Reszletezese
        </h2>
        {costData?.breakdown?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Provider
                  </th>
                  <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Modell
                  </th>
                  <th className="text-right p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Input Tokenek
                  </th>
                  <th className="text-right p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Output Tokenek
                  </th>
                  <th className="text-right p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Koltseg
                  </th>
                </tr>
              </thead>
              <tbody>
                {costData.breakdown.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    }}
                  >
                    <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: item.provider === 'ollama' ? '#10b98120' : '#8b5cf620',
                          color: item.provider === 'ollama' ? '#10b981' : '#8b5cf6',
                        }}
                      >
                        {item.provider}
                      </span>
                    </td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                      {item.model_name || '-'}
                    </td>
                    <td className="p-3 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatNumber(item.input_tokens)}
                    </td>
                    <td className="p-3 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatNumber(item.output_tokens)}
                    </td>
                    <td className="p-3 text-right font-mono" style={{ color: chartColors.success }}>
                      ${(item.actual_cost ?? 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <td colSpan={2} className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                    Osszesen
                  </td>
                  <td className="p-3 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(costData.total_input_tokens)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(costData.total_output_tokens)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold" style={{ color: chartColors.success }}>
                    ${(costData.total_cost ?? 0).toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            Nincs koltseg adat a megadott idoszakban
          </div>
        )}
      </div>

      {/* Daily cost trend */}
      <ChartCard title="Napi Koltseg Trend">
        {dailyUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={(v) => `$${v.toFixed(2)}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`$${value.toFixed(4)}`, 'Koltseg']}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Koltseg"
                stroke={chartColors.warning}
                fill={chartColors.warning}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
            Nincs adat a megadott idoszakban
          </div>
        )}
      </ChartCard>

      {/* Model usage details */}
      {modelUsage.length > 0 && (
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Modell Hasznalat Reszletei
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modelUsage.map((model, index) => (
              <div
                key={index}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderLeft: `4px solid ${model.color}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {model.model_name}
                  </span>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: model.provider === 'ollama' ? '#10b98120' : '#8b5cf620',
                      color: model.provider === 'ollama' ? '#10b981' : '#8b5cf6',
                    }}
                  >
                    {model.provider}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Keresek:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{model.request_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Tokenek:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatNumber(model.total_tokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Koltseg:</span>
                    <span style={{ color: chartColors.success }}>${(model.cost ?? 0).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenMonitor;
