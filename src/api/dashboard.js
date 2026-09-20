import { apiFetch } from './client'

function toQuery(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  return query.toString()
}

async function get(path, params = {}) {
  const query = toQuery(params)
  const response = await apiFetch(`${path}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(body.message || '대시보드 정보를 불러오지 못했습니다.')
    error.status = response.status
    error.code = body.code
    throw error
  }
  return body
}

export function getDashboardSummary(params = {}) {
  return get('/api/dashboard/summary', {
    period: '30d',
    recentLimit: 5,
    wrongLimit: 5,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
    ...params,
  })
}

export function getQuizAttempts(params = {}) {
  return get('/api/me/quiz-attempts', {
    page: 0,
    size: 20,
    result: 'all',
    sort: 'attemptedAt,desc',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
    ...params,
  })
}

export function getWrongQuizzes(params = {}) {
  return get('/api/me/wrong-quizzes', {
    page: 0,
    size: 20,
    status: 'unresolved',
    sort: 'lastAttemptedAt,desc',
    ...params,
  })
}
