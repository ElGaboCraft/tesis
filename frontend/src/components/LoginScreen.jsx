import { useState } from 'react'

const EMPTY_CREDENTIALS = {
  username: '',
  password: '',
}

export default function LoginScreen({ onLogin, loading, error }) {
  const [credentials, setCredentials] = useState(EMPTY_CREDENTIALS)

  function updateField(event) {
    const { name, value } = event.target
    setCredentials((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // Login simple y directo, sin magia oculta.
    await onLogin(credentials)
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Teyvat Operations Desk</p>
        <h1>Controla sistemas, infraestructura y soporte tecnico desde un solo centro operativo</h1>
        <p className="auth-copy">
          El acceso al tablero requiere autenticacion. Las tareas solo se asignan a usuarios registrados por el administrador root.
        </p>
      </section>

      <section className="auth-panel">
        <div>
          <p className="eyebrow">Inicio de sesion</p>
          <h2>Ingresar al dashboard</h2>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="field" name="username" value={credentials.username} onChange={updateField} placeholder="Usuario" required />
          <input className="field" type="password" name="password" value={credentials.password} onChange={updateField} placeholder="Contraseña" required />

          {error && <div className="auth-error">{error}</div>}

          <button className="primary-button submit-button" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}