const cards = [
  { key: 'total', label: 'Total activas' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'completed', label: 'Completadas' },
  { key: 'overdue', label: 'Vencidas' },
]

export default function DashboardStats({ summary }) {
  // Tarjetas KPI del dashboard.
  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article className="stat-card" key={card.key}>
          <span>{card.label}</span>
          <strong>{summary?.[card.key] ?? 0}</strong>
        </article>
      ))}
      <article className="stat-card accent-card">
        <span>Ejecucion</span>
        <strong>{summary?.completion_rate ?? 0}%</strong>
        <small>{summary?.high_priority ?? 0} tareas de alta prioridad</small>
      </article>
    </section>
  )
}