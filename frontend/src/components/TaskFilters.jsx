const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'todo', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'done', label: 'Completada' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Todas las prioridades' },
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

const DUE_OPTIONS = [
  { value: 'all', label: 'Cualquier vencimiento' },
  { value: 'today', label: 'Vence hoy' },
  { value: 'upcoming', label: 'Próximos 7 días' },
  { value: 'overdue', label: 'Atrasadas' },
]

const ORDER_OPTIONS = [
  { value: 'due_date', label: 'Vencimiento ascendente' },
  { value: '-updated_at', label: 'Última actualización' },
  { value: '-priority', label: 'Prioridad descendente' },
  { value: '-progress', label: 'Mayor progreso' },
]

export default function TaskFilters({ filters, categories, onChange, onCreate, onRefresh, loading }) {
  function updateField(event) {
    // Update único de filtros para mantener componente liviano.
    const { name, value, type, checked } = event.target
    onChange({ ...filters, [name]: type === 'checkbox' ? checked : value })
  }

  return (
    <section className="toolbar">
      <div className="toolbar-copy">
        <p className="eyebrow">Task Management Suite</p>
        <h1>Operaciones, prioridades y entregables en un solo tablero</h1>
      </div>

      <div className="toolbar-actions">
        <button className="ghost-button" onClick={onRefresh} disabled={loading}>
          Actualizar
        </button>
        <button className="primary-button" onClick={onCreate}>
          Nueva tarea
        </button>
      </div>

      <div className="filters-grid">
        <input
          className="field"
          type="search"
          name="search"
          value={filters.search}
          onChange={updateField}
          placeholder="Buscar por titulo, descripcion o responsable"
        />

        <select className="field" name="status" value={filters.status} onChange={updateField}>
          {STATUS_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>

        <select className="field" name="priority" value={filters.priority} onChange={updateField}>
          {PRIORITY_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>

        <select className="field" name="dueBucket" value={filters.dueBucket} onChange={updateField}>
          {DUE_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>

        <select className="field" name="category" value={filters.category} onChange={updateField}>
          <option value="all">Todas las categorias</option>
          {categories.map((category) => (
            <option value={category.id} key={category.id}>{category.name}</option>
          ))}
        </select>

        <select className="field" name="ordering" value={filters.ordering} onChange={updateField}>
          {ORDER_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="checkbox-field">
          <input type="checkbox" name="includeArchived" checked={filters.includeArchived} onChange={updateField} />
          <span>Mostrar archivadas</span>
        </label>
      </div>
    </section>
  )
}