import type { Router } from 'vue-router'
import { useAuthStoreWithout } from '@/store/modules/auth'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStoreWithout()

    // If there is no session information, get it first
    if (!authStore.session) {
      try {
        await authStore.getSession()
        // After success, re-trigger the current navigation
        // This navigation will enter the 'else' branch below
        next({ ...to, replace: true })
        return
      }
      catch (error) {
        // If getting session fails, it may be a network issue or the backend is down
        // Go directly to the 500 page
        if (to.name !== '500')
          next({ name: '500' })
        else
          next() // If already on page 500, do nothing
        return
      }
    }
    // If there is already session information
    else {
      // If the session says no authentication is required, but the user has a local token, clear it
      if (String(authStore.session.auth) === 'false' && authStore.token)
        authStore.removeToken()

      // If the user is on the 500 page but the session is now available, redirect to root
      if (to.name === '500')
        next({ name: 'Root' })
      else
        next()
    }
  })
}
