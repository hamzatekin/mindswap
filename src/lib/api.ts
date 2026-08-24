const TOKEN_KEY = "mindswap-token"

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // private mode etc. — session just won't persist
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getToken() ?? ""}`,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    if (response.status === 401) clearToken()
    throw new ApiError(response.status, `${response.status} on ${path}`)
  }
  return response.json() as Promise<T>
}
