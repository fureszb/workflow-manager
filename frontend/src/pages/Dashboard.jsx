const Dashboard = () => {
  const cards = [
    {
      title: 'Aktív Folyamatok',
      value: '12',
      icon: '📋',
      color: 'var(--accent)',
      description: 'Folyamatban lévő munkafolyamatok',
    },
    {
      title: 'Olvasatlan Emailek',
      value: '45',
      icon: '✉️',
      color: 'var(--warning)',
      description: 'Feldolgozásra váró emailek',
    },
    {
      title: 'Dokumentumok',
      value: '234',
      icon: '📁',
      color: 'var(--success)',
      description: 'Tárolt dokumentumok száma',
    },
    {
      title: 'AI Chat Beszélgetések',
      value: '8',
      icon: '💬',
      color: 'var(--accent)',
      description: 'Mai chat munkamenetek',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Üdvözöljük a WorkFlow Managerben!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Itt áttekintheti a projektek és folyamatok állapotát, valamint gyorsan hozzáférhet a legfontosabb funkciókhoz.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="rounded-lg p-6 border hover:shadow-lg transition-shadow duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="text-3xl p-3 rounded-lg"
                style={{ backgroundColor: card.color + '20' }}
              >
                {card.icon}
              </div>
              <div
                className="text-3xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </div>
            </div>
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {card.title}
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Legutóbbi Tevékenységek
        </h2>
        <div className="space-y-3">
          {[
            { text: 'Új folyamat létrehozva: "Ügyfél onboarding"', time: '5 perce' },
            { text: '3 új email érkezett', time: '15 perce' },
            { text: 'Dokumentum feltöltve: "Q1 Report.pdf"', time: '1 órája' },
            { text: 'AI Chat munkamenet befejezve', time: '2 órája' },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span style={{ color: 'var(--text-primary)' }}>{activity.text}</span>
              <span
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
