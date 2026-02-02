const Chat = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          AI Chat Asszisztens
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Intelligens chatbot segítség munkafolyamatokhoz és kérdésekhez
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
              <li>• Természetes nyelvű kérdések és válaszok</li>
              <li>• Munkafolyamat-asszisztencia és javaslatok</li>
              <li>• Dokumentumok elemzése és összefoglalása</li>
              <li>• Automatikus válaszgenerálás emailekhez</li>
              <li>• Kontextus-alapú segítség projektek során</li>
              <li>• Chat előzmények mentése és keresése</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat interface placeholder */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          height: '500px',
        }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Chat Munkamenet
          </h2>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Kezdjen új beszélgetést az AI asszisztenssel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
