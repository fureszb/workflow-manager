const AuditLog = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">📜</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Előzmények & Audit Log
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Rendszeresemények és felhasználói tevékenységek nyomon követése
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
              <li>• Összes rendszeresemény naplózása</li>
              <li>• Felhasználói műveletek követése</li>
              <li>• Szűrés dátum, felhasználó és eseménytípus szerint</li>
              <li>• Exportálás audit célokra</li>
              <li>• Részletes eseményinformációk</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-4 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <select
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option>Minden esemény</option>
            <option>Bejelentkezés</option>
            <option>Folyamat</option>
            <option>Email</option>
            <option>Dokumentum</option>
          </select>
          <select
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option>Minden felhasználó</option>
            <option>Admin</option>
            <option>Felhasználó</option>
          </select>
          <button
            className="px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            Szűrés
          </button>
        </div>
      </div>

      {/* Event log */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Időpont
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Felhasználó
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Esemény
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Részletek
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  time: '2024-03-15 14:32',
                  user: 'admin@example.com',
                  event: 'Bejelentkezés',
                  details: 'Sikeres bejelentkezés',
                  type: 'success',
                },
                {
                  time: '2024-03-15 14:15',
                  user: 'user@example.com',
                  event: 'Folyamat létrehozva',
                  details: 'Új folyamat: "Ügyfél onboarding"',
                  type: 'info',
                },
                {
                  time: '2024-03-15 13:45',
                  user: 'admin@example.com',
                  event: 'Beállítások módosítva',
                  details: 'Email értesítések bekapcsolva',
                  type: 'info',
                },
                {
                  time: '2024-03-15 12:20',
                  user: 'user2@example.com',
                  event: 'Dokumentum feltöltve',
                  details: 'Q1_Report.pdf',
                  type: 'success',
                },
              ].map((log, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {log.time}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {log.user}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: log.type === 'success' ? 'var(--success)' + '20' : 'var(--accent)' + '20',
                        color: log.type === 'success' ? 'var(--success)' : 'var(--accent)',
                      }}
                    >
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
