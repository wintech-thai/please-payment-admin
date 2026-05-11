import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

const API_URL = '/api/proxy'

export const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

const encodeBase64 = (str: string): string => {
  try {
    if (typeof window !== 'undefined' && window.btoa) return window.btoa(str)
    return Buffer.from(str).toString('base64')
  } catch {
    return str
  }
}

export const setAuthCookies = (accessToken: string, refreshToken?: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`
  if (refreshToken) {
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800; SameSite=Lax`
  }
}

export const clearAuthData = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('username')
  localStorage.removeItem('userId')
  localStorage.removeItem('orgId')
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'user_name=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'orgId=; path=/; max-age=0; SameSite=Lax'
}

// Request interceptor — base64 encode token from localStorage
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      const url = config.url?.toLowerCase() || ''
      const isPublicPath = url.includes('login')

      if (token && config.headers && !isPublicPath) {
        config.headers.Authorization = `Bearer ${encodeBase64(token)}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — validate status field
client.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data
    if (!data) return response

    const { status, description, message } = data
    if (status === undefined || status === null) return response

    const statusUpper = typeof status === 'string' ? status.toUpperCase() : ''
    const isSuccess = statusUpper === 'OK' || statusUpper === 'SUCCESS'

    if (!isSuccess) {
      const errorMsg = description || message || `Operation failed: ${statusUpper}`
      return Promise.reject(new AxiosError(errorMsg, statusUpper, response.config, response.request, response))
    }

    return response
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
      _retryCount?: number
    }
    const errorResponse = error.response
    const errorData = errorResponse?.data as Record<string, unknown> | string | undefined
    const status = errorResponse?.status
    const url = originalRequest?.url?.toLowerCase() || ''
    const isPublicPath = url.includes('login')

    // Rate limit retry with backoff
    if (status === 429) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      if (originalRequest._retryCount <= 3) {
        const waitTime = originalRequest._retryCount * 1000
        return new Promise((resolve) => setTimeout(() => resolve(client(originalRequest)), waitTime))
      }
      toast.error('Too many requests. Please wait.')
      return Promise.reject(error)
    }

    if (isPublicPath) return Promise.reject(error)

    if (status === 403) {
      return Promise.reject(new AxiosError('You do not have permission to perform this action.', 'UNAUTHORIZED'))
    }

    const rawStr = typeof errorData === 'string' ? errorData
      : typeof (errorData as Record<string, unknown>)?.raw === 'string' ? (errorData as Record<string, unknown>).raw as string
      : ''

    const isTokenExpired =
      status === 401 ||
      error.code === 'ERROR_TOKEN_EXPIRED' ||
      rawStr.includes('IDX10223') ||
      rawStr.includes('expired')

    if (!isTokenExpired || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${encodeBase64(token)}`
        }
        return client(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')

      const res = await axios.post(
        '/api/proxy/admin-api/AuthAdmin/org/global/action/Refresh',
        { RefreshToken: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const tokenData = res.data?.token || res.data
      const { access_token, refresh_token } = tokenData

      if (!access_token) throw new Error('No access token in refresh response')

      localStorage.setItem('accessToken', access_token)
      if (refresh_token) localStorage.setItem('refreshToken', refresh_token)
      setAuthCookies(access_token, refresh_token)

      processQueue(null, access_token)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${encodeBase64(access_token)}`
      }

      return client(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAuthData()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
