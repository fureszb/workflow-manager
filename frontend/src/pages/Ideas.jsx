const Ideas = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">💡</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Ötletek & Javítások
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ötletek gyűjtése, priorizálása és megvalósítása
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
              <li>• Új ötletek beküldése és dokumentálása</li>
              <li>• Ötletek szavazása és értékelése</li>
              <li>• Javítási javaslatok nyomon követése</li>
              <li>• Állapotkezelés (tervezés, fejlesztés, kész)</li>
              <li>• Csapattagok hozzászólásai és visszajelzései</li>
              <li>• Priorizálás és kategorizálás</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ideas list */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Legutóbbi Ötletek
        </h2>
        <div className="space-y-3">
          {[
            {
              title: 'Email automatizálás továbbfejlesztése',
              status: 'Tervezés',
              votes: 12,
              color: 'var(--warning)',
            },
            {
              title: 'Dashboard testreszabható widgetek',
              status: 'Fejlesztés',
              votes: 8,
              color: 'var(--accent)',
            },
            {
              title: 'Mobil alkalmazás fejlesztése',
              status: 'Ötlet',
              votes: 15,
              color: 'var(--success)',
            },
          ].map((idea, i) => (
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
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {idea.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm px-2 py-1 rounded"
                      style={{ backgroundColor: idea.color + '20', color: idea.color }}
                    >
                      {idea.status}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {idea.votes} szavazat
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ideas;
