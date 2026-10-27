export type Role = 'borrower' | 'officer'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

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
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options?.headers,
    },
  })
  if (!response.ok) throw new Error('We could not complete that request.')
  return response.json()
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; role: Role }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  predict: (slug: string, input: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/${slug}`, {
      method: 'POST', body: JSON.stringify(input),
    }),
  me: () => request<Record<string, unknown>>('/api/me'),
  apply: (input: Record<string, unknown>) =>
    request<Record<string, unknown>>('/api/applications', {
      method: 'POST', body: JSON.stringify(input),
    }),
  applications: () => request<Record<string, unknown>[]>('/api/officer/applications'),
  dataset: (name: string) => request<Record<string, unknown>>(`/api/datasets/${name}?limit=20`),
}

// Local demo adapter keeps the prototype interactive until a backend URL is supplied.
export async function demoPrediction(model: string, income: number, amount: number) {
  await new Promise(resolve => setTimeout(resolve, 650))
  const affordability = Math.max(8, Math.min(94, Math.round((income * 7 / Math.max(amount, 1)) * 100)))
  const risk = Math.max(7, Math.min(89, 100 - affordability))
  return {
    amount: Math.round(income * 4.8 / 500) * 500,
    approved: affordability >= 42,
    risk,
    interpretation: affordability >= 42
      ? 'Income and requested amount are within safer limits.'
      : 'The requested amount is high compared with available income.',
    model,
  }
}
