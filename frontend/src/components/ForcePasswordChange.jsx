import { useState } from 'react'

export default function ForcePasswordChange({ user, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    // Doble chequeo en cliente para evitar ida al backend al pepe.
    if (form.new_password !== form.confirm_password) {
      return
    }

    await onSubmit({
      current_password: form.current_password,
      new_password: form.new_password,
    })
  }

  const mismatch = form.confirm_password && form.new_password !== form.confirm_password

  return (
    <main className="auth-shell force-shell">
      <section className="auth-panel force-panel">
        <div>
          <p className="eyebrow">Seguridad requerida</p>
          <h2>Cambio obligatorio de contraseña</h2>
          <p className="auth-copy">Hola {user.full_name}, debes definir una nueva contraseña para continuar al dashboard.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="field" type="password" name="current_password" value={form.current_password} onChange={updateField} placeholder="Contraseña temporal/actual" required />
          <input className="field" type="password" name="new_password" value={form.new_password} onChange={updateField} placeholder="Nueva contraseña" required />
          <input className="field" type="password" name="confirm_password" value={form.confirm_password} onChange={updateField} placeholder="Confirmar nueva contraseña" required />

          {mismatch && <div className="auth-error">La confirmación no coincide con la nueva contraseña.</div>}
          {error && <div className="auth-error">{error}</div>}

          <button className="primary-button submit-button" type="submit" disabled={loading || mismatch}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
