<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const isVisible = ref(false)

const humanPlayer = computed(() => gameStore.humanPlayer)
const currentProject = computed(() => gameStore.currentProject)
const gameSession = computed(() => gameStore.gameSession)

function show() {
  isVisible.value = true
}

function hide() {
  isVisible.value = false
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    hide()
  }
}
</script>

<template>
  <div
    v-if="isVisible"
    class="modal-overlay"
    @click="closeOnBackdrop"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Профиль игрока</h2>
        <button class="close-button" @click="hide">×</button>
      </div>

      <div class="modal-body">
        <div v-if="humanPlayer" class="player-info">
          <div class="player-basic">
            <h3>{{ humanPlayer.name }}</h3>
            <p class="player-specialization">{{ humanPlayer.specialization }}</p>
          </div>

          <div class="player-stats">
            <div class="stat-item">
              <span class="stat-label">Уровень:</span>
              <span class="stat-value">{{ humanPlayer.level }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Опыт:</span>
              <span class="stat-value">{{ humanPlayer.experience }} XP</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Деньги:</span>
              <span class="stat-value">${{ humanPlayer.money }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Энтузиазм:</span>
              <span class="stat-value">{{ humanPlayer.enthusiasm }}</span>
            </div>
          </div>

          <div class="player-skills">
            <h4>Навыки:</h4>
            <div class="skills-grid">
              <div class="skill-item">
                <span class="skill-name">Frontend:</span>
                <span class="skill-value">{{ humanPlayer.skills.frontend }}</span>
              </div>
              <div class="skill-item">
                <span class="skill-name">Backend:</span>
                <span class="skill-value">{{ humanPlayer.skills.backend }}</span>
              </div>
              <div class="skill-item">
                <span class="skill-name">Management:</span>
                <span class="skill-value">{{ humanPlayer.skills.management }}</span>
              </div>
              <div class="skill-item">
                <span class="skill-name">Tech Base:</span>
                <span class="skill-value">{{ humanPlayer.skills.techBase }}</span>
              </div>
              <div class="skill-item">
                <span class="skill-name">Soft Skills:</span>
                <span class="skill-value">{{ humanPlayer.skills.softSkills }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentProject" class="current-project">
            <h4>Текущий проект:</h4>
            <div class="project-info">
              <h5>{{ currentProject.name }}</h5>
              <p>{{ currentProject.description }}</p>
              <div class="project-progress">
                <div class="progress-item">
                  <span>Frontend:</span>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${(currentProject.currentProgress.frontend / currentProject.requirements.frontend) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ currentProject.currentProgress.frontend }}/{{ currentProject.requirements.frontend }}</span>
                </div>
                <div class="progress-item">
                  <span>Backend:</span>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${(currentProject.currentProgress.backend / currentProject.requirements.backend) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ currentProject.currentProgress.backend }}/{{ currentProject.requirements.backend }}</span>
                </div>
                <div class="progress-item">
                  <span>Management:</span>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${(currentProject.currentProgress.management / currentProject.requirements.management) * 100}%` }"
                    ></div>
                  </div>
                  <span>{{ currentProject.currentProgress.management }}/{{ currentProject.requirements.management }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-button:hover {
  background-color: var(--color-bg-secondary);
}

.modal-body {
  padding: 24px;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.player-basic h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.player-specialization {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.player-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.player-skills h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.skill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: 6px;
  font-size: 14px;
}

.skill-name {
  color: var(--color-text-secondary);
}

.skill-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.current-project h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.project-info {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.project-info h5 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.project-info p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.project-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.progress-item span:first-child {
  min-width: 80px;
  color: var(--color-text-secondary);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: var(--color-border-muted);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-item span:last-child {
  min-width: 60px;
  text-align: right;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
