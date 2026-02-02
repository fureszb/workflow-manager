const Emails = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">✉️</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Email Menedzsment
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Emailek kezelése, automatizálása és nyomon követése
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
              <li>• Email fiókok integrálása és szinkronizálása</li>
              <li>• Automatikus email kategorizálás és címkézés</li>
              <li>• Email sablonok létrehozása és használata</li>
              <li>• Tömeges email küldés kampányokhoz</li>
              <li>• Email válaszadási szabályok beállítása</li>
              <li>• Csatolmányok kezelése és archiválása</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Email stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Beérkező', count: 45, color: 'var(--accent)' },
          { label: 'Elküldött', count: 28, color: 'var(--success)' },
          { label: 'Vázlatok', count: 3, color: 'var(--warning)' },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-3xl font-bold mb-2" style={{ color: stat.color }}>
              {stat.count}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Emails;
