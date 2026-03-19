const COLUMN_LABELS = {
  todo: 'Pendientes',
  in_progress: 'En progreso',
  blocked: 'Bloqueadas',
  done: 'Completadas',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TaskBoard({ board, onEdit, onDelete, onToggleArchive, onStatusChange }) {
  // Vista comprimida del board: resumen rapido, detalle en click.
  return (
    <section className="board-grid">
      {Object.entries(COLUMN_LABELS).map(([columnKey, label]) => {
        const tasks = board?.[columnKey] ?? []

        return (
          <article className="board-column" key={columnKey}>
            <header className="column-header">
              <div>
                <span className="column-badge">{tasks.length}</span>
                <h2>{label}</h2>
              </div>
            </header>

            <div className="column-stack">
              {tasks.length === 0 && <div className="empty-column">No hay tareas en esta columna.</div>}

              {tasks.map((task) => (
                <article className="task-card brief-card" key={task.id} role="button" tabIndex={0} onClick={() => onEdit(task)} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    // Soporte teclado para accesibilidad basica.
                    onEdit(task)
                  }
                }}>
                  <div className="task-card-top">
                    <div>
                      <p className="task-category">{task.category?.name || 'General'}</p>
                      <h3>{task.title}</h3>
                    </div>
                    <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                  </div>

                  <div className="meta-row">
                    <span>Asignados: {task.assignees?.length || 0}</span>
                    <span>Vence: {formatDate(task.due_date)}</span>
                  </div>

                  <div className="meta-row compact">
                    <span>{task.progress}% completado</span>
                    <span>{task.status.replace('_', ' ')}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}