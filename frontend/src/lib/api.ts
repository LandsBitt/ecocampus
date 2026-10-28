const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: Method
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Explicação legível que o servidor mandou (`detail` em texto), quando há. */
    public detalhe: string | null = null
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Mensagem que o servidor mandou junto com o erro, quando é uma explicação legível. */
export function detalheDoErro(error: unknown): string | null {
  return error instanceof ApiError ? error.detalhe : null
}

/** Lê o corpo de uma resposta de erro uma vez só; validação do FastAPI (detail em lista) fica sem detalhe. */
async function erroDaResposta(response: Response): Promise<ApiError> {
  const texto = await response.text().catch(() => '')
  let detalhe: string | null = null
  try {
    const corpo = JSON.parse(texto) as { detail?: unknown }
    if (typeof corpo.detail === 'string') detalhe = corpo.detail
  } catch {
    // Corpo não é JSON (proxy, timeout): fica só a mensagem.
  }
  return new ApiError(response.status, detalhe ?? (texto || response.statusText || 'Erro na API'), detalhe)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  })

  if (!response.ok) throw await erroDaResposta(response)

  if (response.status === 204) return null as T
  return (await response.json()) as T
}

async function uploadForm<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) throw await erroDaResposta(response)

  return (await response.json()) as T
}

export const api = {
  request,
  get: <T>(path: string, token?: string | null, signal?: AbortSignal) =>
    request<T>(path, { token, signal }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body, token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body, token }),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: 'DELETE', token }),
  uploadForm,
}
