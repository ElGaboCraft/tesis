import { startTransition, useEffect, useState } from 'react'
import DashboardStats from './components/DashboardStats'
import ForcePasswordChange from './components/ForcePasswordChange'
import LoginScreen from './components/LoginScreen'
import TaskBoard from './components/TaskBoard'
import TaskFilters from './components/TaskFilters'
import TaskForm from './components/TaskForm'
import UserAdminPanel from './components/UserAdminPanel'
import {
  changePassword,
  createTask,
  createUser,
  deleteUser,
  fetchCurrentUser,
  fetchReferenceData,
  fetchTaskBoard,
  fetchTaskSummary,
  getStoredToken,
  isUnauthorizedError,
  login,
  logout,
  removeTask,
  resetUserPassword,
  setAuthToken,
  updateUser,
  updateTask,
} from './api/tasks'

// Estado base de filtros del tablero.
const INITIAL_FILTERS = {
  search: '',
  status: 'all',
  priority: 'all',
  category: 'all',
  dueBucket: 'all',
  includeArchived: false,
  ordering: 'due_date',
}

const EMPTY_BOARD = {
  todo: [],
  in_progress: [],
  blocked: [],
  done: [],
}

export default function App() {
  // Estado principal de sesion y dashboard.
  const [currentUser, setCurrentUser] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [board, setBoard] = useState(EMPTY_BOARD)
  const [summary, setSummary] = useState(null)
  const [referenceData, setReferenceData] = useState({ users: [], categories: [], tags: [], can_manage_users: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState('')
  const [passwordFlowError, setPasswordFlowError] = useState('')
  const [passwordFlowLoading, setPasswordFlowLoading] = useState(false)
  const [userSaving, setUserSaving] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTask, setActiveTask] = useState(null)

  async function loadReferenceState() {
    // Cargamos diccionarios y permisos UI en una sola llamada.
    const data = await fetchReferenceData()
    setReferenceData(data)
    return data
  }

  async function loadDashboard(activeFilters = filters) {
    setLoading(true)
    setError('')

    try {
      // Pedimos board + summary en paralelo para que la UI responda mas rapido.
      const [boardResponse, summaryResponse] = await Promise.all([
        fetchTaskBoard(activeFilters),
        fetchTaskSummary(activeFilters),
      ])

      startTransition(() => {
        setBoard({ ...EMPTY_BOARD, ...boardResponse })
        setSummary(summaryResponse)
      })
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        // Sesion invalida: cortamos por seguridad y volvemos a login.
        handleLogout({ silent: true })
        return
      }
      setError('No se pudo cargar el tablero. Verifica que Django esté ejecutándose en el puerto 8000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function bootstrapSession() {
      // Intento de restauracion de sesion al abrir la app.
      const storedToken = getStoredToken()
      if (!storedToken) {
        setSessionLoading(false)
        return
      }

      setAuthToken(storedToken)

      try {
        const user = await fetchCurrentUser()
        setCurrentUser(user)
        await loadReferenceState()
      } catch (_error) {
        setAuthToken(null)
        setCurrentUser(null)
      } finally {
        setSessionLoading(false)
      }
    }

    bootstrapSession()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }
    loadDashboard(filters)
  }, [currentUser, filters])

  async function handleLogin(credentials) {
    setAuthLoading(true)
    setAuthError('')

    try {
      const response = await login(credentials)
      setCurrentUser(response.user)
      await loadReferenceState()
    } catch (_error) {
      setAuthError('No fue posible iniciar sesion con esas credenciales.')
      setAuthToken(null)
    } finally {
      setAuthLoading(false)
      setSessionLoading(false)
    }
  }

  async function handleLogout(options = {}) {
    try {
      if (!options.silent) {
        await logout()
      }
    } catch (_error) {
    } finally {
      // Limpieza fuerte para evitar estados fantasmas al cerrar sesion.
      setAuthToken(null)
      setCurrentUser(null)
      setReferenceData({ users: [], categories: [], tags: [], can_manage_users: false })
      setBoard(EMPTY_BOARD)
      setSummary(null)
      setDrawerOpen(false)
      setActiveTask(null)
      setError('')
    }
  }

  function openCreateDrawer() {
    setActiveTask(null)
    setDrawerOpen(true)
  }

  function openEditDrawer(task) {
    setActiveTask(task)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setActiveTask(null)
    setDrawerOpen(false)
  }

  async function handleSave(taskPayload) {
    setSaving(true)
    setError('')

    try {
      // Un solo handler para crear o editar.
      if (taskPayload.id) {
        await updateTask(taskPayload.id, taskPayload)
      } else {
        await createTask(taskPayload)
      }

      closeDrawer()
      await loadDashboard(filters)
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleLogout({ silent: true })
        return
      }
      setError('No se pudo guardar la tarea. Revisa los datos obligatorios y vuelve a intentar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(taskId) {
    const confirmed = window.confirm('Esta accion elimina la tarea de forma permanente. ¿Continuar?')
    if (!confirmed) return

    try {
      await removeTask(taskId)
      await loadDashboard(filters)
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleLogout({ silent: true })
        return
      }
      setError('No se pudo eliminar la tarea.')
    }
  }

  async function handleArchiveToggle(task) {
    try {
      await updateTask(task.id, { is_archived: !task.is_archived })
      await loadDashboard(filters)
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleLogout({ silent: true })
        return
      }
      setError('No se pudo actualizar el archivo de la tarea.')
    }
  }

  async function handleStatusChange(task, status) {
    try {
      await updateTask(task.id, { status })
      await loadDashboard(filters)
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        handleLogout({ silent: true })
        return
      }
      setError('No se pudo actualizar el estado.')
    }
  }

  async function handleCreateUser(payload) {
    setUserSaving(true)

    try {
      await createUser(payload)
      await loadReferenceState()
    } finally {
      setUserSaving(false)
    }
  }

  async function handleUpdateUser(userId, payload) {
    await updateUser(userId, payload)
    await loadReferenceState()
  }

  async function handleDeleteUser(userId) {
    await deleteUser(userId)
    await loadReferenceState()
  }

  async function handleResetUserPassword(userId) {
    const result = await resetUserPassword(userId)
    await loadReferenceState()
    return result
  }

  async function handleForcedPasswordChange(payload) {
    setPasswordFlowLoading(true)
    setPasswordFlowError('')

    try {
      // Si sale bien, backend devuelve token nuevo y usuario actualizado.
      const response = await changePassword(payload)
      setCurrentUser(response.user)
      await loadReferenceState()
    } catch (_error) {
      setPasswordFlowError('No se pudo actualizar la contraseña. Verifica los datos ingresados.')
    } finally {
      setPasswordFlowLoading(false)
    }
  }

  if (sessionLoading) {
    return <div className="loading-screen">Preparando entorno seguro...</div>
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} error={authError} />
  }

  if (currentUser.must_change_password) {
    // No tocar este guard sin pensar: es una regla de seguridad clave.
    return (
      <ForcePasswordChange
        user={currentUser}
        onSubmit={handleForcedPasswordChange}
        loading={passwordFlowLoading}
        error={passwordFlowError}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-one" />
      <div className="bg-orb orb-two" />

      <main className="layout">
        <section className="session-bar">
          <div>
            <p className="eyebrow">Sesion activa</p>
            <strong>{currentUser.full_name}</strong>
            <span className="session-meta">@{currentUser.username} {currentUser.is_superuser ? '· root admin' : '· operador'}</span>
          </div>
          <button className="ghost-button" onClick={() => handleLogout()}>Cerrar sesion</button>
        </section>

        <TaskFilters
          filters={filters}
          categories={referenceData.categories}
          onChange={setFilters}
          onCreate={openCreateDrawer}
          onRefresh={() => loadDashboard(filters)}
          loading={loading}
        />

        <DashboardStats summary={summary} />

        {referenceData.can_manage_users && (
          <UserAdminPanel
            users={referenceData.users}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetUserPassword}
            loading={userSaving}
          />
        )}

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state">Cargando tablero...</div>
        ) : (
          <TaskBoard
            board={board}
            onEdit={openEditDrawer}
            onDelete={handleDelete}
            onToggleArchive={handleArchiveToggle}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      <TaskForm
        open={drawerOpen}
        task={activeTask}
        users={referenceData.users}
        categories={referenceData.categories}
        tags={referenceData.tags}
        onClose={closeDrawer}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}