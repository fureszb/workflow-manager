const Processes = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Folyamatok
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Munkafolyamatok kezelése és nyomon követése
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
              <li>• Új folyamatok létrehozása és konfigurálása</li>
              <li>• Folyamatok állapotának nyomon követése</li>
              <li>• Automatizált munkafolyamatok kezelése</li>
              <li>• Feladatok hozzárendelése és delegálása</li>
              <li>• Folyamat sablonok használata</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: 'var(--success)' }}
              />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Folyamat #{i}
              </h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Folyamat részletei és állapot információk jelennek meg itt.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Processes;
