import { useState } from 'react'

const EMPTY_USER = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
}

const EMPTY_EDIT = {
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  is_active: true,
}

export default function UserAdminPanel({ users, onCreateUser, onUpdateUser, onDeleteUser, onResetPassword, loading }) {
  const [form, setForm] = useState(EMPTY_USER)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Alta de usuario con contraseña temporal.
      await onCreateUser(form)
      setForm(EMPTY_USER)
      setSuccess('Usuario creado correctamente. Se exigira cambio de contraseña en el primer inicio.')
    } catch (requestError) {
      setError('No se pudo crear el usuario. Verifica que el nombre sea unico y que la clave cumpla las reglas.')
    }
  }

  function beginEdit(user) {
    setEditForm({
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      is_active: Boolean(user.is_active),
    })
    setError('')
    setSuccess('')
  }

  function updateEditField(event) {
    const { name, value, type, checked } = event.target
    setEditForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function submitEdit(event) {
    event.preventDefault()
    if (!editForm.id) return
    setError('')
    setSuccess('')

    try {
      // Edicion simple: datos perfil + estado activo.
      await onUpdateUser(editForm.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        is_active: editForm.is_active,
      })
      setSuccess('Usuario actualizado correctamente.')
      setEditForm(EMPTY_EDIT)
    } catch (_error) {
      setError('No se pudo actualizar el usuario.')
    }
  }

  async function handleResetPassword(user) {
    const confirmed = window.confirm(`Generar contraseña temporal para ${user.username}?`)
    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      // Al resetear, backend marca cambio obligatorio en próximo login.
      const response = await onResetPassword(user.id)
      setSuccess(`Contraseña temporal para ${user.username}: ${response.temporary_password}`)
    } catch (_error) {
      setError('No se pudo generar contraseña temporal.')
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(`Desactivar usuario ${user.username}?`)
    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      // Es desactivacion logica, no borrado fisico.
      await onDeleteUser(user.id)
      setSuccess(`Usuario ${user.username} desactivado.`)
      if (editForm.id === user.id) {
        setEditForm(EMPTY_EDIT)
      }
    } catch (_error) {
      setError('No se pudo desactivar el usuario.')
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-copy">
        <p className="eyebrow">Administracion</p>
        <h2>Usuarios habilitados para asignacion</h2>
      </div>

      <form className="admin-user-form" onSubmit={handleSubmit}>
        <input className="field" name="username" value={form.username} onChange={updateField} placeholder="Usuario" required />
        <input className="field" name="first_name" value={form.first_name} onChange={updateField} placeholder="Nombre" />
        <input className="field" name="last_name" value={form.last_name} onChange={updateField} placeholder="Apellido" />
        <input className="field" type="email" name="email" value={form.email} onChange={updateField} placeholder="Correo" />
        <input className="field" type="password" name="password" value={form.password} onChange={updateField} placeholder="Clave temporal" required />
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear usuario'}</button>
      </form>

      {error && <div className="error-banner compact-banner">{error}</div>}
      {success && <div className="success-banner compact-banner">{success}</div>}

      {editForm.id && (
        <form className="admin-user-form edit-user-form" onSubmit={submitEdit}>
          <input className="field" name="first_name" value={editForm.first_name} onChange={updateEditField} placeholder="Nombre" />
          <input className="field" name="last_name" value={editForm.last_name} onChange={updateEditField} placeholder="Apellido" />
          <input className="field" type="email" name="email" value={editForm.email} onChange={updateEditField} placeholder="Correo" />
          <label className="checkbox-field align-left">
            <input type="checkbox" name="is_active" checked={editForm.is_active} onChange={updateEditField} />
            <span>Usuario activo</span>
          </label>
          <button className="primary-button" type="submit">Guardar cambios</button>
          <button className="ghost-button" type="button" onClick={() => setEditForm(EMPTY_EDIT)}>Cancelar</button>
        </form>
      )}

      <div className="user-list">
        {users.map((user) => (
          <article className="user-card" key={user.id}>
            <strong>{user.full_name}</strong>
            <span>@{user.username}</span>
            <small>{user.email || 'Sin correo'}</small>
            <small>{user.must_change_password ? 'Cambio de contraseña pendiente' : 'Contraseña al dia'}</small>
            <div className="card-actions">
              <button className="inline-button" type="button" onClick={() => beginEdit(user)}>Editar</button>
              <button className="inline-button" type="button" onClick={() => handleResetPassword(user)}>Reset temporal</button>
              <button className="inline-button danger" type="button" onClick={() => handleDelete(user)}>Desactivar</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}