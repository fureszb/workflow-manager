const Scripts = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">💻</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Python Scriptek
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Egyéni Python scriptek futtatása és kezelése
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
              <li>• Python scriptek feltöltése és tárolása</li>
              <li>• Scriptek futtatása ütemezett vagy manuális módon</li>
              <li>• Kimenet és hibák megtekintése</li>
              <li>• Paraméterek átadása scripteknek</li>
              <li>• Verziókövetés és előzmények</li>
              <li>• Környezeti változók kezelése</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Script list */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Elérhető Scriptek
          </h2>
          <button
            className="px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            + Új Script
          </button>
        </div>

        <div className="space-y-3">
          {[
            {
              name: 'data_processor.py',
              description: 'Adat feldolgozási script CSV fájlokhoz',
              lastRun: '2 órája',
              status: 'success',
            },
            {
              name: 'email_automation.py',
              description: 'Automatikus email válaszok generálása',
              lastRun: '5 órája',
              status: 'success',
            },
            {
              name: 'report_generator.py',
              description: 'Heti riportok automatikus készítése',
              lastRun: '1 napja',
              status: 'warning',
            },
            {
              name: 'backup_manager.py',
              description: 'Adatbázis backup és mentés',
              lastRun: '3 napja',
              status: 'success',
            },
          ].map((script, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {script.name}
                    </h3>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          script.status === 'success' ? 'var(--success)' : 'var(--warning)',
                      }}
                    />
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {script.description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Utoljára futtatva: {script.lastRun}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                    }}
                  >
                    Futtatás
                  </button>
                  <button
                    className="px-3 py-1 rounded text-sm font-medium border"
                    style={{
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Szerkesztés
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Scripts;
