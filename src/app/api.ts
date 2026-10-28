export type Role = 'borrower' | 'officer'

export type ActiveLoan = {
  id: number
  product: string
  principal: number
  balance: number
  monthly_payment: number
  next_due_date: string
  paid_count: number
  total_count: number
  status: string
}

export type MeResponse = {
  name: string
  email: string
  role: Role
  kyc_status: string
  loan_limit: number
  active_loan: ActiveLoan | null
}

export type ModelMetrics = {
  accuracy?: number | null
  mae?: number | null
  r2?: number | null
  risky_wrongly_approved?: number | null
  accuracy_by_k?: Record<string, number> | null
  recall_on_risky_borrowers?: number | null
}

export type MetricsResponse = {
  models: Record<string, ModelMetrics>
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export const auth = {
  get token() { return localStorage.getItem('pesolend_token') },
  get role() { return localStorage.getItem('pesolend_role') as Role | null },
  set(token: string, role: Role) {
    localStorage.setItem('pesolend_token', token)
    localStorage.setItem('pesolend_role', role)
  },
  clear() {
    localStorage.removeItem('pesolend_token')
    localStorage.removeItem('pesolend_role')
  },
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...options?.headers,
      },
    })
  } catch {
    throw new Error('Backend not reachable. Is the server running on port 8001?')
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status}).`
    try {
      const body = await response.json() as { detail?: string | { msg?: string }[] }
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) {
        detail = body.detail.map(item => item.msg).filter(Boolean).join('; ') || detail
      }
    } catch {
      // Retain the HTTP status message for non-JSON responses.
    }
    throw new Error(detail)
  }
  return response.json()
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; role: Role }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  predict: <T = Record<string, unknown>>(slug: string, input: Record<string, unknown>) =>
    request<T>(`/api/${slug}`, {
      method: 'POST', body: JSON.stringify(input),
    }),
  me: () => request<MeResponse>('/api/me'),
  apply: (input: Record<string, unknown>) =>
    request<Record<string, unknown>>('/api/applications', {
      method: 'POST', body: JSON.stringify(input),
    }),
  applications: () => request<Record<string, unknown>[]>('/api/officer/applications'),
  metrics: () => request<MetricsResponse>('/api/metrics'),
  dataset: <T = Record<string, unknown>>(name: string) =>
    request<T>(`/api/datasets/${name}?limit=20`),
}
