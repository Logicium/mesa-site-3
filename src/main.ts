import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './styles/base.css'
import './styles/themes.css'
import './styles/scrollbar.css'
import { PLATFORM_ENABLED } from './platform/config'
import { useSiteContentStore } from './platform/siteContentStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

async function boot() {
  if (PLATFORM_ENABLED) {
    // Hydrate the runtime content overlay before mount so the first render is correct.
    try { await useSiteContentStore(pinia).hydrate() } catch { /* fall back to build-time config */ }
  }
  app.mount('#app')
}

void boot()
