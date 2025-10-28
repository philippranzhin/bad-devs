<script setup lang="ts">
import { computed } from 'vue'
import DeadlineIndicator from './DeadlineIndicator.vue'

interface RoundResults {
  roundNumber: number
  playerActions: any[]
  projectProgress: Record<string, number>
  isProjectCompleted: boolean
  nextRoundTasks: any[]
  expiredPenalties?: Array<{
    playerId: string
    taskId: string
    taskComplexity: number
    avoided: boolean
    complexityDeducted: number
  }>
  playerContributions?: Record<string, number>
}

interface Props {
  results: RoundResults | null
  projectProgress: Record<string, number>
  isProjectCompleted: boolean
}

const props = defineProps<Props>()

const hasResults = computed(() => props.results !== null)

const successCount = computed(() => {
  if (!props.results) return 0
  return props.results.playerActions.filter(action => action.success).length
})

const totalActions = computed(() => {
  if (!props.results) return 0
  return props.results.playerActions.length
})

const successRate = computed(() => {
  if (totalActions.value === 0) return 0
  return Math.round((successCount.value / totalActions.value) * 100)
})

const progressChanges = computed(() => {
  if (!props.results) return {}

  const changes: Record<string, number> = {}
  Object.keys(props.projectProgress).forEach(skill => {
    changes[skill] = props.results.projectProgress[skill] || 0
  })

  return changes
})

const hasExpiredPenalties = computed(() => {
  return props.results?.expiredPenalties && props.results.expiredPenalties.length > 0
})

const expiredPenalties = computed(() => {
  return props.results?.expiredPenalties || []
})

</script>

<template>
  <div class="round-results">
    <div class="results-header">
      <h3 class="section-title">Результаты раунда {{ results?.roundNumber || 'N/A' }}</h3>
    </div>

        <div v-if="hasResults && results" class="results-content">
      <!-- Success Summary -->
      <div class="success-summary">
        <div class="summary-card">
          <div class="summary-icon">✅</div>
          <div class="summary-content">
            <div class="summary-title">Успешные действия</div>
            <div class="summary-value">{{ successCount }} / {{ totalActions }}</div>
            <div class="summary-rate">{{ successRate }}% успеха</div>
          </div>
        </div>
      </div>

      <!-- Project Progress Changes -->
      <div class="progress-changes">
        <h4 class="changes-title">Изменения прогресса проекта</h4>
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
        <h4 class="details-title">Детали действий</h4>
        <div class="actions-list">
          <div
            v-for="action in results.playerActions"
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
              <div class="task-info">
                <span class="task-id">Задача: {{ action.taskId }}</span>
                <span v-if="action.taskDeadline !== undefined" class="task-deadline-info">
                  Дедлайн: {{ action.taskDeadline }} раунд{{ action.taskDeadline !== 1 ? 'ов' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Unresolved Tasks -->
      <div v-if="results.nextRoundTasks && results.nextRoundTasks.length > 0" class="unresolved-tasks">
        <h4 class="unresolved-title">Невыполненные задачи (переносятся в следующий раунд)</h4>
        <div class="unresolved-list">
          <div
            v-for="task in results.nextRoundTasks"
            :key="task.id"
            class="unresolved-task-item"
          >
            <div class="unresolved-task-header">
              <span class="unresolved-task-name">{{ task.name }}</span>
              <DeadlineIndicator :task="task" size="small" />
            </div>
            <div class="unresolved-task-details">
              <span class="unresolved-task-skill">{{ task.requiredSkill }}</span>
              <span class="unresolved-task-reward">{{ task.experienceReward }} XP</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Expired Task Penalties -->
      <div v-if="hasExpiredPenalties" class="penalties-section">
        <h4 class="penalties-title">⚠️ Штрафы за просроченные задачи</h4>
        <div class="penalties-list">
          <div
            v-for="penalty in expiredPenalties"
            :key="penalty.taskId"
            class="penalty-item"
            :class="{ 'avoided': penalty.avoided }"
          >
            <div class="penalty-header">
              <div class="penalty-player">
                <span class="penalty-label">Игрок:</span>
                <span class="penalty-player-name">{{ penalty.playerId }}</span>
              </div>
              <div class="penalty-result">
                <span v-if="penalty.avoided" class="penalty-avoided">🎲 Штраф избегнут!</span>
                <span v-else class="penalty-applied">❌ Штраф применен</span>
              </div>
            </div>
            <div class="penalty-details">
              <div class="penalty-complexity">
                <span class="penalty-label">Сложность задачи:</span>
                <span class="penalty-value">{{ penalty.taskComplexity }}</span>
              </div>
              <div class="penalty-deducted">
                <span class="penalty-label">Списано с вклада:</span>
                <span class="penalty-value negative">-{{ penalty.complexityDeducted }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Status -->
      <div class="project-status">
        <div v-if="isProjectCompleted" class="status-completed">
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
    </div>

    <div v-else class="no-results">
      <p>Результаты раунда загружаются...</p>
    </div>
  </div>
</template>

<style scoped>
.round-results {
  max-width: 800px;
  margin: 0 auto;
}

.results-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.section-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.results-content {
  display: grid;
  gap: var(--spacing-xl);
}

.success-summary {
  display: flex;
  justify-content: center;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--color-success);
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
  margin-bottom: var(--spacing-xs);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: var(--spacing-xs);
}

.summary-rate {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.progress-changes {
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
}

.changes-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-grid {
  display: grid;
  gap: var(--spacing-md);
}

.progress-change-item {
  display: grid;
  gap: var(--spacing-sm);
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

.actions-details {
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
}

.details-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions-list {
  display: grid;
  gap: var(--spacing-sm);
}

.action-item {
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
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
  margin-bottom: var(--spacing-xs);
}

.action-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
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
  gap: var(--spacing-sm);
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
  color: var(--color-text-secondary);
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.task-id {
  font-weight: 500;
}

.task-deadline-info {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.unresolved-tasks {
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
}

.unresolved-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.unresolved-list {
  display: grid;
  gap: var(--spacing-sm);
}

.unresolved-task-item {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

.unresolved-task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.unresolved-task-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.unresolved-task-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.unresolved-task-skill {
  text-transform: capitalize;
}

.unresolved-task-reward {
  font-weight: 500;
}

/* Penalties Section */
.penalties-section {
  background-color: rgba(209, 36, 47, 0.05);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--color-danger);
}

.penalties-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-danger);
}

.penalties-list {
  display: grid;
  gap: var(--spacing-sm);
}

.penalty-item {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-danger);
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.penalty-item.avoided {
  border-color: var(--color-success);
  background-color: rgba(26, 127, 55, 0.05);
}

.penalty-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.penalty-player {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.penalty-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.penalty-player-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.penalty-result {
  display: flex;
  align-items: center;
}

.penalty-avoided {
  color: var(--color-success);
  font-weight: 600;
  font-size: 14px;
}

.penalty-applied {
  color: var(--color-danger);
  font-weight: 600;
  font-size: 14px;
}

.penalty-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
  font-size: 13px;
}

.penalty-complexity,
.penalty-deducted {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.penalty-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.penalty-value.negative {
  color: var(--color-danger);
}

.project-status {
  text-align: center;
}

.status-completed,
.status-continuing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
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
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-description {
  margin: 0;
  color: var(--color-text-secondary);
}

.no-results {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .summary-card {
    flex-direction: column;
    text-align: center;
  }

  .action-header {
    flex-direction: column;
    gap: var(--spacing-xs);
    align-items: flex-start;
  }

  .penalty-header {
    flex-direction: column;
    gap: var(--spacing-xs);
    align-items: flex-start;
  }

  .penalty-details {
    grid-template-columns: 1fr;
  }

  .status-completed,
  .status-continuing {
    flex-direction: column;
    text-align: center;
  }
}
</style>
