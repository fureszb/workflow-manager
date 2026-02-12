import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { Calendar, RefreshCw, TrendingUp, Mail, Cpu, Download, FileSpreadsheet, FileText } from 'lucide-react';
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

const Statistics = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [processStats, setProcessStats] = useState(null);
  const [emailStats, setEmailStats] = useState(null);
  const [tokenStats, setTokenStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    const params = {
      start_date: formatDate(dateRange.start),
      end_date: formatDate(dateRange.end),
    };

    try {
      const [processRes, emailRes, tokenRes] = await Promise.all([
        api.get('/v1/statistics/processes', { params }),
        api.get('/v1/statistics/emails', { params }),
        api.get('/v1/statistics/tokens', { params }),
      ]);
      setProcessStats(processRes.data);
      setEmailStats(emailRes.data);
      setTokenStats(tokenRes.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const handleExport = async (format) => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const response = await api.post(
        '/v1/statistics/export',
        {
          format,
          start_date: formatDate(dateRange.start),
          end_date: formatDate(dateRange.end),
        },
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `statistics_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting statistics:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Theme-aware chart colors
  const chartColors = {
    primary: 'var(--accent)',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    error: '#ef4444',
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
              Statisztikák & Elemzések
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Részletes elemzések és vizualizációk a teljesítmény nyomon követéséhez
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
              onClick={fetchStats}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              title="Frissítés"
            >
              <RefreshCw size={16} style={{ color: 'var(--text-primary)' }} />
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  opacity: isExporting ? 0.7 : 1,
                }}
              >
                {isExporting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Exportálás
              </button>
              {showExportMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-10"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-opacity-80 transition-colors rounded-t-lg"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <FileText size={18} style={{ color: '#ef4444' }} />
                    PDF formátum
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-opacity-80 transition-colors rounded-b-lg"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <FileSpreadsheet size={18} style={{ color: '#10b981' }} />
                    Excel formátum
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Összes Folyamat"
          value={processStats?.total || 0}
          subValue={`${processStats?.completed || 0} befejezve`}
          icon={TrendingUp}
          color={chartColors.primary}
        />
        <StatsCard
          title="Folyamatban"
          value={processStats?.in_progress || 0}
          subValue={processStats?.avg_completion_days ? `Átl. ${processStats.avg_completion_days} nap` : undefined}
          icon={TrendingUp}
          color={chartColors.warning}
        />
        <StatsCard
          title="Emailek"
          value={emailStats?.total || 0}
          subValue={`${emailStats?.unread || 0} olvasatlan`}
          icon={Mail}
          color={chartColors.info}
        />
        <StatsCard
          title="Token Használat"
          value={((tokenStats?.total_input_tokens || 0) + (tokenStats?.total_output_tokens || 0)).toLocaleString()}
          subValue={`$${(tokenStats?.total_cost || 0).toFixed(4)}`}
          icon={Cpu}
          color={chartColors.success}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process by Status - Pie Chart */}
        <ChartCard title="Folyamatok státusz szerint">
          {processStats?.by_status?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processStats.by_status}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {processStats.by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott időszakban
            </div>
          )}
        </ChartCard>

        {/* Emails by Importance - Pie Chart */}
        <ChartCard title="Emailek fontosság szerint">
          {emailStats?.by_importance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emailStats.by_importance}
                  dataKey="count"
                  nameKey="importance"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ importance, count }) => `${importance}: ${count}`}
                >
                  {emailStats.by_importance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott időszakban
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Monthly Process Trend - Bar Chart */}
        <ChartCard title="Havi folyamat trend">
          {processStats?.by_month?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processStats.by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Folyamatok" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott időszakban
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Email Trend - Line Chart */}
        <ChartCard title="Napi email forgalom">
          {emailStats?.by_day?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emailStats.by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Emailek"
                  stroke={chartColors.info}
                  strokeWidth={2}
                  dot={{ fill: chartColors.info }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott időszakban
            </div>
          )}
        </ChartCard>

        {/* Token Usage by Provider - Bar Chart */}
        <ChartCard title="Token használat provider szerint">
          {tokenStats?.by_provider?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tokenStats.by_provider} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis dataKey="provider" type="category" stroke="var(--text-secondary)" width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="input_tokens" name="Input" stackId="tokens" fill={chartColors.info} />
                <Bar dataKey="output_tokens" name="Output" stackId="tokens" fill={chartColors.success} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
              Nincs adat a megadott időszakban
            </div>
          )}
        </ChartCard>
      </div>

      {/* Daily Token Usage Trend */}
      <ChartCard title="Napi token használat trend">
        {tokenStats?.by_day?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tokenStats.by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis yAxisId="left" stroke="var(--text-secondary)" />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="input_tokens"
                name="Input tokenek"
                stroke={chartColors.info}
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="output_tokens"
                name="Output tokenek"
                stroke={chartColors.success}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                name="Költség ($)"
                stroke={chartColors.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]" style={{ color: 'var(--text-secondary)' }}>
            Nincs adat a megadott időszakban
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default Statistics;
