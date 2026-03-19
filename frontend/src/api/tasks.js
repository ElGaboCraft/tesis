import axios from 'axios'

const TOKEN_KEY = 'task-suite-token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

const initialToken = window.localStorage.getItem(TOKEN_KEY)
if (initialToken) {
  // Restore de sesion al recargar navegador.
  api.defaults.headers.common.Authorization = `Token ${initialToken}`
}

export function setAuthToken(token) {
  // Este bloque mantiene backend y frontend en sintonia de autenticacion.
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
    api.defaults.headers.common.Authorization = `Token ${token}`
    return
  }

  window.localStorage.removeItem(TOKEN_KEY)
  delete api.defaults.headers.common.Authorization
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function isUnauthorizedError(error) {
  return error?.response?.status === 401
}

function buildParams(filters = {}) {
  // Construimos query params solo con filtros activos para evitar ruido.
  const params = {}

  if (filters.search) params.search = filters.search
  if (filters.status && filters.status !== 'all') params.status = filters.status
  if (filters.priority && filters.priority !== 'all') params.priority = filters.priority
  if (filters.category && filters.category !== 'all') params.category = filters.category
  if (!filters.includeArchived) params.is_archived = false
  if (filters.dueBucket && filters.dueBucket !== 'all') params.due_bucket = filters.dueBucket
  if (filters.ordering) params.ordering = filters.ordering

  return params
}

export async function login(credentials) {
  // Login normal: devolvemos token + user y lo dejamos persistido.
  const { data } = await api.post('/auth/login/', credentials)
  setAuthToken(data.token)
  return data
}

export async function logout() {
  await api.post('/auth/logout/')
  setAuthToken(null)
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me/')
  return data
}

export async function fetchReferenceData() {
  // Data base que necesita casi toda la UI: usuarios, categorias y tags.
  const { data } = await api.get('/reference-data/')
  return data
}

export async function createUser(payload) {
  const { data } = await api.post('/users/', payload)
  return data
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`/users/${id}/`, payload)
  return data
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}/`)
}

export async function resetUserPassword(id, payload = {}) {
  const { data } = await api.post(`/users/${id}/reset_password/`, payload)
  return data
}

export async function changePassword(payload) {
  const { data } = await api.post('/auth/change-password/', payload)
  setAuthToken(data.token)
  return data
}

export async function fetchTaskBoard(filters) {
  // Vista tablero agrupada por columnas.
  const { data } = await api.get('/tasks/board/', { params: buildParams(filters) })
  return data
}

export async function fetchTaskSummary(filters) {
  // KPIs superiores del dashboard.
  const { data } = await api.get('/tasks/summary/', { params: buildParams(filters) })
  return data
}

export async function createTask(payload) {
  const { data } = await api.post('/tasks/', payload)
  return data
}

export async function updateTask(id, payload) {
  const { data } = await api.patch(`/tasks/${id}/`, payload)
  return data
}

export async function removeTask(id) {
  await api.delete(`/tasks/${id}/`)
}