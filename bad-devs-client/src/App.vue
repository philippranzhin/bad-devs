<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import ProfileModal from '@/components/ProfileModal.vue'

const gameStore = useGameStore()
const profileModal = ref<InstanceType<typeof ProfileModal> | null>(null)

const showProfileButton = computed(() => {
  return gameStore.currentPhase !== 'character' && gameStore.humanPlayer !== null
})
</script>

<template>
  <div id="app">
    <!-- GitHub-style header -->
    <header class="app-header" v-if="showProfileButton">
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">Bad Devs</h1>
        </div>
        <div class="header-right">
          <button
            class="profile-button"
            @click="profileModal?.show()"
          >
            👤 {{ gameStore.humanPlayer?.name }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="app-main">
      <RouterView />
    </main>

    <!-- Profile Modal -->
    <ProfileModal ref="profileModal" />
  </div>
</template>

<style>
/* GitHub-inspired CSS variables */
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f6f8fa;
  --color-bg-tertiary: #f1f3f4;
  --color-border: #d0d7de;
  --color-border-muted: #d8dee4;
  --color-text-primary: #24292f;
  --color-text-secondary: #656d76;
  --color-text-tertiary: #8c959f;
  --color-accent: #0969da;
  --color-accent-hover: #0860ca;
  --color-success: #1a7f37;
  --color-danger: #d1242f;
  --color-warning: #9a6700;
  --shadow-sm: 0 1px 0 rgba(27, 31, 36, 0.04);
  --shadow-md: 0 3px 6px rgba(140, 149, 159, 0.15);
  --shadow-lg: 0 8px 24px rgba(140, 149, 159, 0.2);
  --border-radius: 6px;
  --border-radius-lg: 12px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #0d1117;
    --color-bg-secondary: #161b22;
    --color-bg-tertiary: #21262d;
    --color-border: #30363d;
    --color-border-muted: #21262d;
    --color-text-primary: #f0f6fc;
    --color-text-secondary: #8b949e;
    --color-text-tertiary: #6e7681;
    --color-accent: #58a6ff;
    --color-accent-hover: #79c0ff;
  }
}

/* Reset and base styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  line-height: 1.5;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header styles - GitHub style */
.app-header {
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left .app-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.profile-button {
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-button:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border-muted);
}

/* Main content - GitHub style */
.app-main {
  flex: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

/* Common component styles - GitHub style */
.card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: none;
}

.card-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-subtitle {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-secondary);
}

.button {
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.button:hover {
  background-color: var(--color-accent-hover);
}

.button:disabled {
  background-color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.button-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.button-secondary:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-muted);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}
</style>
