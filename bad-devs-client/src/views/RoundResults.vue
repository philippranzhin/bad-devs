<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import type { RoundResult } from 'bad-devs-gameengine'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const gameStore = useGameStore()

// Props для получения результатов раунда
interface Props {
  roundResult?: RoundResult | null
}

const props = defineProps<Props>()

// Computed properties
const gameSession = computed(() => gameStore.gameSession)
const project = computed(() => gameStore.currentProject)
const humanPlayer = computed(() => gameStore.humanPlayer)
const allPlayers = computed(() => gameStore.gameSession?.playerInterfaces || [])

const roundResult = computed(() => props.roundResult || gameStore.roundResult)
const hasResults = computed(() => roundResult.value !== null)

// Статистика успешности
const successCount = computed(() => {
  if (!roundResult.value) return 0
  return roundResult.value.playerActions.filter(action => action.success).length
})

const totalActions = computed(() => {
  if (!roundResult.value) return 0
  return roundResult.value.playerActions.length
})

const successRate = computed(() => {
  if (totalActions.value === 0) return 0
  return Math.round((successCount.value / totalActions.value) * 100)
})

// Действия игроков с деталями
const playerActionsWithDetails = computed(() => {
  if (!roundResult.value) return []

  return roundResult.value.playerActions.map(action => {
    const player = allPlayers.value.find(p => p.id === action.playerId)
    const task = roundResult.value?.currentRoundTasks.find(t => t.id === action.taskId)

    return {
      ...action,
      playerName: player?.name || 'Неизвестный игрок',
      taskName: task?.name || 'Неизвестная задача',
      taskDescription: task?.description || '',
      requiredSkill: task?.requiredSkill || 'unknown',
      complexity: task?.complexity || 0
    }
  })
})

// Группировка действий по игрокам
const actionsByPlayer = computed(() => {
  const grouped: Record<string, any[]> = {}

  playerActionsWithDetails.value.forEach(action => {
    if (!grouped[action.playerId]) {
      grouped[action.playerId] = []
    }
    grouped[action.playerId].push(action)
  })

  return grouped
})

// Изменения прогресса проекта
const progressChanges = computed(() => {
  if (!roundResult.value) return {}

  const changes: Record<string, number> = {}
  Object.keys(roundResult.value.projectProgress).forEach(skill => {
    changes[skill] = roundResult.value!.projectProgress[skill] || 0
  })

  return changes
})

// Общий прогресс проекта
const projectProgressPercentage = computed(() => {
  if (!project.value) return 0

  const progress = project.value.progress || {}
  const requirements = project.value.requirements || {}

  const totalProgress = Object.values(progress).reduce((sum, value) => sum + value, 0)
  const totalRequired = Object.values(requirements).reduce((sum, value) => sum + value, 0)

  if (totalRequired === 0) return 0
  return Math.min(Math.round((totalProgress / totalRequired) * 100), 100)
})

// Методы
function continueToNextRound() {
  if (roundResult.value?.isProjectCompleted) {
    // Проект завершен - переходим к результатам проекта
    router.push('/project-results')
  } else {
    // Подготавливаем GameEngine к следующему раунду
    if (gameSession.value) {
      gameSession.value.prepareNextRound()
    }

    // Переходим к следующему раунду (распределение задач)
    router.push('/game-session')
  }
}

function goToProjectSelection() {
  gameStore.setCurrentPhase('project-selection')
  router.push('/project-selection')
}

function goToCharacterCreation() {
  gameStore.setCurrentPhase('character')
  router.push('/')
}

onMounted(() => {
  if (!roundResult.value && !gameSession.value) {
    router.push('/')
    return
  }
})
</script>

<template>
  <div class="round-results-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">Результаты раунда {{ roundResult?.roundNumber || 'N/A' }}</h1>
          <p class="page-description">
            {{ roundResult?.isProjectCompleted ? 'Проект завершен!' : 'Проект продолжается...' }}
          </p>
        </div>
        <div class="page-actions">
          <div class="project-info">
            <span class="project-name">{{ project?.name }}</span>
            <div class="progress-indicator">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${projectProgressPercentage}%` }"></div>
              </div>
              <span class="progress-text">{{ projectProgressPercentage }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="page-content">
      <div v-if="hasResults && roundResult" class="results-content">
        <!-- Success Summary -->
        <div class="success-summary">
          <div class="summary-card">
            <div class="summary-icon">🎯</div>
            <div class="summary-content">
              <div class="summary-title">Общая статистика</div>
              <div class="summary-value">{{ successCount }} / {{ totalActions }}</div>
              <div class="summary-rate">{{ successRate }}% успеха</div>
            </div>
          </div>
        </div>

        <!-- Project Progress Changes -->
        <div class="progress-changes">
          <h3 class="section-title">Прогресс проекта</h3>
          <div class="progress-grid">
            <div
              v-for="(change, skill) in progressChanges"
              :key="skill"
              class="progress-change-item"
            >
              <div class="change-header">
                <span class="change-skill">{{ skill }}</span>
                <span class="change-value" :class="{ 'positive': change > 0, 'zero': change === 0 }">
                  {{ change > 0 ? '+' : '' }}{{ change }}
                </span>
              </div>
              <div class="change-bar">
                <div
                  class="change-fill"
                  :style="{ width: `${Math.min(Math.abs(change) * 10, 100)}%` }"
                  :class="{ 'positive': change > 0, 'zero': change === 0 }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Player Actions Details -->
        <div class="actions-details">
          <h3 class="section-title">Детали действий игроков</h3>
          <div class="players-grid">
            <div
              v-for="(actions, playerId) in actionsByPlayer"
              :key="playerId"
              class="player-section"
            >
              <div class="player-header">
                <h4 class="player-name">{{ actions[0].playerName }}</h4>
                <div class="player-stats">
                  <span class="success-count">{{ actions.filter(a => a.success).length }}</span>
                  <span class="separator">/</span>
                  <span class="total-count">{{ actions.length }}</span>
                </div>
              </div>
              <div class="player-actions">
                <div
                  v-for="action in actions"
                  :key="action.taskId"
                  class="action-item"
                  :class="{ 'success': action.success, 'failure': !action.success }"
                >
                  <div class="action-header">
                    <div class="action-status">
                      <span class="status-icon">{{ action.success ? '✅' : '❌' }}</span>
                      <span class="status-text">{{ action.success ? 'Успех' : 'Неудача' }}</span>
                    </div>
                    <div class="action-rewards">
                      <span v-if="action.pointsEarned > 0" class="reward-item">
                        +{{ action.pointsEarned }} XP
                      </span>
                      <span v-if="action.enthusiasmSpent > 0" class="cost-item">
                        -{{ action.enthusiasmSpent }} энтузиазм
                      </span>
                    </div>
                  </div>
                  <div class="action-task">
                    <div class="task-name">{{ action.taskName }}</div>
                    <div class="task-description">{{ action.taskDescription }}</div>
                    <div class="task-meta">
                      <span class="task-skill">{{ action.requiredSkill }}</span>
                      <span class="task-complexity">Сложность: {{ action.complexity }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Project Status -->
        <div class="project-status">
          <div v-if="roundResult.isProjectCompleted" class="status-completed">
            <div class="status-icon">🎉</div>
            <div class="status-content">
              <h4 class="status-title">Проект завершен!</h4>
              <p class="status-description">
                Поздравляем! Вы успешно завершили проект и получили награды.
              </p>
            </div>
          </div>
          <div v-else class="status-continuing">
            <div class="status-icon">⏳</div>
            <div class="status-content">
              <h4 class="status-title">Проект продолжается</h4>
              <p class="status-description">
                Проект еще не завершен. Переходим к следующему раунду...
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button
            v-if="roundResult.isProjectCompleted"
            @click="continueToNextRound"
            class="btn btn-primary"
          >
            Посмотреть результаты проекта
          </button>
          <button
            v-else
            @click="continueToNextRound"
            class="btn btn-primary"
          >
            Следующий раунд
          </button>
          <button @click="goToProjectSelection" class="btn btn-secondary">
            Выбрать другой проект
          </button>
          <button @click="goToCharacterCreation" class="btn btn-outline">
            Создать нового персонажа
          </button>
        </div>
      </div>

      <div v-else class="no-results">
        <div class="loading-spinner"></div>
        <p>Результаты раунда загружаются...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page Layout */
.round-results-page {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.page-header {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 0;
}

.page-header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  width: 100px;
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success) 0%, var(--color-accent) 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* Main content */
.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.results-content {
  display: grid;
  gap: 24px;
}

/* Success Summary */
.success-summary {
  display: flex;
  justify-content: center;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--color-success);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 32px;
}

.summary-content {
  text-align: center;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 4px;
}

.summary-rate {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* Progress Changes */
.progress-changes {
  background-color: var(--color-bg-secondary);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-grid {
  display: grid;
  gap: 12px;
}

.progress-change-item {
  display: grid;
  gap: 8px;
}

.change-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-skill {
  font-weight: 500;
  color: var(--color-text-primary);
  text-transform: capitalize;
}

.change-value {
  font-weight: 600;
  font-size: 16px;
}

.change-value.positive {
  color: var(--color-success);
}

.change-value.zero {
  color: var(--color-text-secondary);
}

.change-bar {
  height: 6px;
  background-color: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.change-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.change-fill.positive {
  background-color: var(--color-success);
}

.change-fill.zero {
  background-color: var(--color-text-tertiary);
}

/* Actions Details */
.actions-details {
  background-color: var(--color-bg-secondary);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.players-grid {
  display: grid;
  gap: 20px;
}

.player-section {
  background-color: var(--color-bg-primary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.player-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.player-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
}

.success-count {
  color: var(--color-success);
}

.separator {
  color: var(--color-text-secondary);
}

.total-count {
  color: var(--color-text-primary);
}

.player-actions {
  display: grid;
  gap: 8px;
}

.action-item {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.action-item.success {
  background-color: rgba(26, 127, 55, 0.1);
  border-color: var(--color-success);
}

.action-item.failure {
  background-color: rgba(209, 36, 47, 0.1);
  border-color: var(--color-danger);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 16px;
}

.status-text {
  font-weight: 500;
  color: var(--color-text-primary);
}

.action-rewards {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.reward-item {
  color: var(--color-success);
  font-weight: 600;
}

.cost-item {
  color: var(--color-text-secondary);
}

.action-task {
  font-size: 14px;
}

.task-name {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.task-description {
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.task-skill {
  padding: 2px 6px;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-radius: 4px;
  font-weight: 500;
}

.task-complexity {
  color: var(--color-text-secondary);
}

/* Project Status */
.project-status {
  text-align: center;
}

.status-completed,
.status-continuing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
}

.status-completed {
  background-color: rgba(26, 127, 55, 0.1);
  border: 2px solid var(--color-success);
}

.status-continuing {
  background-color: rgba(9, 105, 218, 0.1);
  border: 2px solid var(--color-accent);
}

.status-icon {
  font-size: 32px;
}

.status-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-description {
  margin: 0;
  color: var(--color-text-secondary);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background-color: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-bg-secondary);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* No Results */
.no-results {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header-content {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .page-actions {
    width: 100%;
    justify-content: space-between;
  }

  .summary-card {
    flex-direction: column;
    text-align: center;
  }

  .action-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .status-completed,
  .status-continuing {
    flex-direction: column;
    text-align: center;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
