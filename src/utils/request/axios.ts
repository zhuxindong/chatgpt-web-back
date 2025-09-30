import axios, { type AxiosResponse } from 'axios'
import { useAuthStore } from '@/store'

const service = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL,
})

service.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()

    // Allow requests to /session and /verify without checking for auth
    if (config.url === '/session' || config.url === '/verify')
      return config

    const token = authStore.token
    const session = authStore.session

    // If auth is required by the session but no token is present, block the request
    if (session && String(session.auth) === 'true' && !token)
      return Promise.reject(new Error('Unauthorized: Authentication is required.'))

    if (token)
      config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => {
    return Promise.reject(error.response)
  },
)

service.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    if (response.status === 200)
      return response

    throw new Error(response.status.toString())
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default service
