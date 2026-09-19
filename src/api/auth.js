async function parse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || '인증 요청을 처리하지 못했습니다.')
  return body
}

export async function getCurrentUser() {
  return parse(await fetch('/api/auth/me', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  }))
}

export async function logout() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('로그아웃하지 못했습니다.')
}

export function startGoogleLogin() {
  window.location.assign('/oauth2/authorization/google')
}
