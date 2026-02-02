import { useTheme } from '../store/ThemeContext';

const Settings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">⚙️</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Beállítások
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Rendszer és felhasználói beállítások konfigurálása
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile settings */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Profil Beállítások
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Név
              </label>
              <input
                type="text"
                placeholder="Teljes név"
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Notification settings */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Értesítések
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Email értesítések', checked: true },
              { label: 'Push értesítések', checked: false },
              { label: 'Folyamat frissítések', checked: true },
              { label: 'Heti összefoglaló', checked: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-5 h-5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Theme settings */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Megjelenés
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Téma
              </label>
              <select
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Világos</option>
                <option value="dark">Sötét</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Nyelv
              </label>
              <select
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option>Magyar</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security settings */}
        <div
          className="rounded-lg p-6 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Biztonság
          </h2>
          <div className="space-y-3">
            <button
              className="w-full px-4 py-2 rounded font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
              }}
            >
              Jelszó Módosítása
            </button>
            <button
              className="w-full px-4 py-2 rounded font-medium transition-colors border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              Két Faktoros Hitelesítés
            </button>
            <button
              className="w-full px-4 py-2 rounded font-medium transition-colors border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              Munkamenetek Kezelése
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
