import { apiFetch, apiUrl } from './client'

async function parse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || '인증 요청을 처리하지 못했습니다.')
  return body
}

export async function getCurrentUser() {
  return parse(await apiFetch('/api/auth/me', {
    headers: { Accept: 'application/json' },
  }))
}

export async function logout() {
  const response = await apiFetch('/api/auth/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('로그아웃하지 못했습니다.')
}

export function startGoogleLogin() {
  window.location.assign(apiUrl('/oauth2/authorization/google'))
}
