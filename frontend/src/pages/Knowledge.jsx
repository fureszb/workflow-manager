const Knowledge = () => {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-8 border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="text-6xl mb-4">🧠</div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Tudásbázis & Tanulás
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          Céges tudásbázis, dokumentáció és tananyagok központi helye
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
              <li>• Tudásbázis cikkek létrehozása és kezelése</li>
              <li>• Kategóriák és címkék szervezése</li>
              <li>• Keresés és szűrés kulcsszavak szerint</li>
              <li>• Verziózott dokumentumok</li>
              <li>• Tananyagok és oktatóvideók tárolása</li>
              <li>• Közösségi hozzászólások és kérdések</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Útmutatók', count: 24, icon: '📖', color: 'var(--accent)' },
          { title: 'FAQ', count: 45, icon: '❓', color: 'var(--success)' },
          { title: 'Videók', count: 12, icon: '🎥', color: 'var(--warning)' },
          { title: 'Best Practices', count: 18, icon: '⭐', color: 'var(--danger)' },
        ].map((category, i) => (
          <div
            key={i}
            className="rounded-lg p-6 border hover:shadow-lg transition-shadow cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="text-4xl mb-3 p-3 rounded-lg inline-block"
              style={{ backgroundColor: category.color + '20' }}
            >
              {category.icon}
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {category.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {category.count} cikk
            </p>
          </div>
        ))}
      </div>

      {/* Popular articles */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Népszerű Cikkek
        </h2>
        <div className="space-y-3">
          {[
            {
              title: 'Hogyan hozzunk létre új munkafolyamatot?',
              category: 'Útmutatók',
              views: 245,
            },
            {
              title: 'Email automatizálás beállítása lépésről lépésre',
              category: 'Útmutatók',
              views: 189,
            },
            {
              title: 'AI Chat legjobb gyakorlatai',
              category: 'Best Practices',
              views: 156,
            },
            {
              title: 'Dokumentumok hatékony rendszerezése',
              category: 'Best Practices',
              views: 142,
            },
          ].map((article, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border hover:bg-opacity-50 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--accent)' + '20',
                        color: 'var(--accent)',
                      }}
                    >
                      {article.category}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {article.views} megtekintés
                    </span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Knowledge;
