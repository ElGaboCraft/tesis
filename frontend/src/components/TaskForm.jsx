import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee_ids: [],
  category_id: '',
  due_date: '',
  estimated_hours: '',
  progress: 0,
  tag_ids: [],
  is_archived: false,
}

export default function TaskForm({ open, task, users, categories, tags, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [openDropdown, setOpenDropdown] = useState('')

  useEffect(() => {
    // Si editamos, precargamos datos; si creamos, formulario limpio.
    if (!task) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      ...EMPTY_FORM,
      title: task.title ?? '',
      description: task.description ?? '',
      status: task.status ?? 'todo',
      priority: task.priority ?? 'medium',
      assignee_ids: (task.assignees || []).map((item) => String(item.id)),
      category_id: task.category?.id ? String(task.category.id) : '',
      estimated_hours: task.estimated_hours ?? '',
      due_date: task.due_date ?? '',
      progress: task.progress ?? 0,
      tag_ids: (task.tags || []).map((item) => String(item.id)),
      is_archived: task.is_archived ?? false,
    })
  }, [task])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function toggleOption(fieldName, optionId) {
    // Selector multiple custom para responsables y tags.
    const value = String(optionId)

    const values = form[fieldName].includes(value)
      ? form[fieldName].filter((item) => item !== value)
      : [...form[fieldName], value]

    setForm((current) => ({ ...current, [fieldName]: values }))
  }

  function getSelectedLabel(fieldName, options, emptyText) {
    // Etiqueta humana del dropdown: evita mostrar listas eternas.
    const selected = options.filter((item) => form[fieldName].includes(String(item.id)))
    if (selected.length === 0) return emptyText
    if (selected.length === 1) return selected[0].name || selected[0].full_name
    return `${selected.length} seleccionados`
  }

  async function handleSubmit(event) {
    event.preventDefault()

    // Payload en formato exacto que espera el backend.
    await onSave({
      id: task?.id,
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      assignee_ids: form.assignee_ids.map(Number),
      category_id: form.category_id ? Number(form.category_id) : null,
      due_date: form.due_date || null,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      progress: Number(form.progress),
      tag_ids: form.tag_ids.map(Number),
      is_archived: form.is_archived,
    })
  }

  return (
    <aside className={`drawer ${open ? 'drawer-open' : ''}`}>
      <div className="drawer-panel">
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Formulario</p>
            <h2>{task?.id ? 'Editar tarea' : 'Nueva tarea'}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>Cerrar</button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <label className="list-group-field">
            <span>Titulo de la tarea</span>
            <input className="field" name="title" value={form.title} onChange={updateField} placeholder="Ej: Migracion de firewall perimetral" required />
            <small>Define el nombre corto y claro del trabajo a ejecutar.</small>
          </label>

          <label className="list-group-field">
            <span>Descripcion</span>
            <textarea className="field textarea" name="description" value={form.description} onChange={updateField} placeholder="Describe alcance, dependencias, riesgos y resultado esperado" />
            <small>Detalla el contexto operativo para que el equipo tenga claridad de ejecución.</small>
          </label>

          <div className="two-columns">
            <label className="list-group-field">
              <span>Estado</span>
              <select className="field" name="status" value={form.status} onChange={updateField}>
                <option value="todo">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="blocked">Bloqueada</option>
                <option value="done">Completada</option>
              </select>
              <small>Indica la etapa actual de la tarea dentro del flujo operativo.</small>
            </label>

            <label className="list-group-field">
              <span>Importancia</span>
              <select className="field" name="priority" value={form.priority} onChange={updateField}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <small>Define la urgencia del trabajo para priorizar recursos y atención.</small>
            </label>
          </div>

          <div className="two-columns">
            <div className="list-group-field">
              <span>Responsables asignados</span>
              <div className={`multi-dropdown ${openDropdown === 'assignees' ? 'is-open' : ''}`}>
                <button
                  className="field dropdown-trigger"
                  type="button"
                  onClick={() => setOpenDropdown((current) => (current === 'assignees' ? '' : 'assignees'))}
                >
                  {getSelectedLabel('assignee_ids', users, 'Selecciona responsables')}
                </button>

                {openDropdown === 'assignees' && (
                  <div className="dropdown-panel">
                    {/* No tocar este bloque sin revisar UX: aca vive el multi-select de responsables. */}
                    {users.map((user) => {
                      const selected = form.assignee_ids.includes(String(user.id))
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`dropdown-option ${selected ? 'selected' : ''}`}
                          onClick={() => toggleOption('assignee_ids', user.id)}
                        >
                          <span>{user.full_name}</span>
                          {selected && <strong>Seleccionado</strong>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <small>Define quién ejecuta la tarea. Puedes asignar uno o varios usuarios responsables.</small>
            </div>
            <label className="list-group-field">
              <span>Categoria</span>
              <select className="field" name="category_id" value={form.category_id} onChange={updateField} required>
                <option value="">Selecciona una categoria</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
              <small>Ubica la tarea en el dominio correcto: sistemas, infraestructura o soporte.</small>
            </label>
          </div>

          <div className="two-columns">
            <label className="list-group-field">
              <span>Fecha objetivo</span>
              <input className="field" type="date" name="due_date" value={form.due_date} onChange={updateField} />
              <small>Marca el vencimiento esperado para seguimiento del SLA.</small>
            </label>

            <label className="list-group-field">
              <span>Tiempo estimado</span>
              <input className="field" type="number" min="0" name="estimated_hours" value={form.estimated_hours} onChange={updateField} placeholder="Horas estimadas" />
              <small>Proyección de esfuerzo para planificación de carga y capacidad.</small>
            </label>
          </div>

          <div className="two-columns">
            <label className="range-field">
              <span>Progreso</span>
              <input type="range" min="0" max="100" name="progress" value={form.progress} onChange={updateField} />
              <small>Actualiza el porcentaje de avance real de la ejecución.</small>
            </label>
            <div className="list-group-field">
              <span>Etiquetas</span>
              <div className={`multi-dropdown ${openDropdown === 'tags' ? 'is-open' : ''}`}>
                <button
                  className="field dropdown-trigger"
                  type="button"
                  onClick={() => setOpenDropdown((current) => (current === 'tags' ? '' : 'tags'))}
                >
                  {getSelectedLabel('tag_ids', tags, 'Selecciona etiquetas')}
                </button>

                {openDropdown === 'tags' && (
                  <div className="dropdown-panel">
                    {/* Mismo criterio del de responsables, pero para tags. */}
                    {tags.map((tag) => {
                      const selected = form.tag_ids.includes(String(tag.id))
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`dropdown-option ${selected ? 'selected' : ''}`}
                          onClick={() => toggleOption('tag_ids', tag.id)}
                        >
                          <span>{tag.name}</span>
                          {selected && <strong>Seleccionado</strong>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <small>Sirve para clasificar la tarea por tecnología o tipo de incidencia y mejorar filtros.</small>
            </div>
          </div>

          <label className="checkbox-field align-left">
            <input type="checkbox" name="is_archived" checked={form.is_archived} onChange={updateField} />
            <span>Guardar ya archivada (no activa en panel principal)</span>
          </label>

          <button className="primary-button submit-button" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar tarea'}
          </button>
        </form>
      </div>
    </aside>
  )
}