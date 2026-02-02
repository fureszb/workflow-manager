const TokenMonitor = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">🪙</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Token Monitor
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          AI token használat nyomon követése és költségbecslés
        </p>
        <div className="max-w-2xl mx-auto text-left space-y-3">
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Funkciók:
            </h3>
            <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li>• Valós idejű token használat monitorozása</li>
              <li>• API hívások számának követése</li>
              <li>• Költségbecslés és riasztások</li>
              <li>• Használati trendek és statisztikák</li>
              <li>• Projekt szerinti szegmentálás</li>
              <li>• Havi limitek és keretösszegek beállítása</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Usage summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Mai Token Használat',
            value: '12,450',
            limit: '50,000',
            percentage: 25,
            color: 'var(--success)',
          },
          {
            label: 'API Hívások (ma)',
            value: '156',
            limit: '500',
            percentage: 31,
            color: 'var(--accent)',
          },
          {
            label: 'Becsült Költség (havi)',
            value: '$24.50',
            limit: '$100',
            percentage: 24,
            color: 'var(--warning)',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              {stat.label}
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              / {stat.limit}
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-color)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${stat.percentage}%`,
                  backgroundColor: stat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Usage breakdown */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Token Használat Szolgáltatásonként
        </h2>
        <div className="space-y-3">
          {[
            { service: 'AI Chat', tokens: 6250, percentage: 50, color: 'var(--accent)' },
            { service: 'Email Generálás', tokens: 3125, percentage: 25, color: 'var(--success)' },
            { service: 'Dokumentum Elemzés', tokens: 2075, percentage: 17, color: 'var(--warning)' },
            { service: 'Egyéb', tokens: 1000, percentage: 8, color: 'var(--text-secondary)' },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.service}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.tokens.toLocaleString()} tokens ({item.percentage}%)
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-color)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent API calls */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Legutóbbi API Hívások
        </h2>
        <div className="space-y-2">
          {[
            { time: '14:32:15', endpoint: 'chat/completion', tokens: 450, status: 'success' },
            { time: '14:28:03', endpoint: 'email/generate', tokens: 320, status: 'success' },
            { time: '14:15:42', endpoint: 'document/analyze', tokens: 890, status: 'success' },
            { time: '14:10:20', endpoint: 'chat/completion', tokens: 520, status: 'success' },
          ].map((call, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-sm font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {call.time}
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {call.endpoint}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {call.tokens} tokens
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--success)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenMonitor;
