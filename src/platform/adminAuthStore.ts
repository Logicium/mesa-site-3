/**
 * Pinia store for the owner-session.
 *
 * The session token is stored in localStorage and sent as Authorization: Bearer.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contentClient, clearSessionToken } from './contentClient'

export interface AdminOwner { id: string; email: string; name?: string }

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const owner = ref<AdminOwner | null>(null)
  // Start loading=true so the gate never flickers on initial render before the first /auth/me check.
  const loading = ref(true)

  async function refresh() {
    loading.value = true
    try {
      const res = await contentClient.me()
      owner.value = res.owner
    } catch {
      owner.value = null
      // 401 means the stored token is invalid or expired — clear it
      clearSessionToken()
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    // contentClient.logout() also calls clearSessionToken() internally
    try { await contentClient.logout() } finally { owner.value = null }
  }

  return { owner, loading, refresh, logout }
})
