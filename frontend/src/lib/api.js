const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Erro na API')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const api = {
  request,
  get: (path, token) => request(path, { token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  del: (path, token) => request(path, { method: 'DELETE', token })
}