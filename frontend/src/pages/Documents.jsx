const Documents = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">📁</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Dokumentumok
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Dokumentumok tárolása, kezelése és megosztása
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
              <li>• Dokumentumok feltöltése és szervezése</li>
              <li>• Verziókövetés és dokumentum előzmények</li>
              <li>• Mappák és címkék használata</li>
              <li>• Dokumentumok megosztása csapattagokkal</li>
              <li>• Keresés és szűrés különböző paraméterek szerint</li>
              <li>• PDF, Word, Excel és egyéb formátumok támogatása</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent documents */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Legutóbbi Dokumentumok
        </h2>
        <div className="space-y-3">
          {[
            { name: 'Q1_Report_2024.pdf', size: '2.4 MB', date: '2024-03-15' },
            { name: 'Projekterv_v3.docx', size: '856 KB', date: '2024-03-14' },
            { name: 'Budget_Analysis.xlsx', size: '1.2 MB', date: '2024-03-12' },
            { name: 'Meeting_Notes.pdf', size: '345 KB', date: '2024-03-10' },
          ].map((doc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded hover:bg-opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📄</div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {doc.name}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {doc.size} • {doc.date}
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

export default Documents;
