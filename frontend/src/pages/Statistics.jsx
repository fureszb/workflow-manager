const Statistics = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Statisztikák & Riportok
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Részletes elemzések és vizualizációk a teljesítmény nyomon követéséhez
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
              <li>• Folyamatok teljesítmény elemzése</li>
              <li>• Email aktivitás statisztikák</li>
              <li>• Dokumentum használati riportok</li>
              <li>• AI Chat használati metrikák</li>
              <li>• Egyéni és csapat teljesítmény összehasonlítás</li>
              <li>• Exportálható riportok (PDF, Excel)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Heti Aktivitás',
            value: '87%',
            trend: '+12%',
            icon: '📈',
            color: 'var(--success)',
          },
          {
            title: 'Befejezett Folyamatok',
            value: '34',
            trend: '+8',
            icon: '✅',
            color: 'var(--accent)',
          },
          {
            title: 'Átlagos Válaszidő',
            value: '2.3h',
            trend: '-15%',
            icon: '⏱️',
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
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">{stat.icon}</div>
              <span
                className="text-sm font-semibold px-2 py-1 rounded"
                style={{ backgroundColor: stat.color + '20', color: stat.color }}
              >
                {stat.trend}
              </span>
            </div>
            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{stat.title}</div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Havi Trend
        </h2>
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            height: '300px',
          }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            Grafikon megjelenítő terület (Chart.js / Recharts)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
