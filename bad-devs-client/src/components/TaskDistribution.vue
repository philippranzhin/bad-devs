<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task, PlayerActionRequest } from 'bad-devs-gameengine'

interface Props {
  tasks: Task[]
  maxActions: number
  currentEnthusiasm: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'tasks-distributed': [actions: PlayerActionRequest[]]
}>()

const taskInvestments = ref<Record<string, Record<string, number>>>({})
const isLoading = ref(false)

const totalActionsUsed = computed(() => {
  let total = 0
  Object.values(taskInvestments.value).forEach(investment => {
    Object.values(investment).forEach(value => {
      total += value || 0
    })
  })
  return total
})

const canSubmit = computed(() => {
  return totalActionsUsed.value > 0 && totalActionsUsed.value <= props.maxActions
})

function updateInvestment(taskId: string, skillType: string, value: number) {
  if (!taskInvestments.value[taskId]) {
    taskInvestments.value[taskId] = {}
  }
  taskInvestments.value[taskId][skillType] = value
}

function getInvestment(taskId: string, skillType: string): number {
  return taskInvestments.value[taskId]?.[skillType] || 0
}

function getTotalInvestment(taskId: string): number {
  const investment = taskInvestments.value[taskId] || {}
  return Object.values(investment).reduce((sum, val) => sum + (val || 0), 0)
}

function calculateSuccessProbability(task: Task, investment: Record<string, number>): number {
  const totalInvestment = Object.values(investment).reduce((sum, val) => sum + (val || 0), 0)
  if (totalInvestment === 0) return 0

  // Simplified probability calculation
  const skillValue = investment[task.requiredSkill] || 0
  const baseProbability = Math.min(skillValue / task.complexity, 1)

  return Math.round(baseProbability * 100)
}

async function submitActions() {
  if (!canSubmit.value) return

  isLoading.value = true

  try {
    const actions: PlayerActionRequest[] = []

    Object.entries(taskInvestments.value).forEach(([taskId, investment]) => {
      const totalInvestment = Object.values(investment).reduce((sum, val) => sum + (val || 0), 0)
      if (totalInvestment > 0) {
        actions.push({
          playerId: 'human-player', // This should come from game store
          taskId,
          investment: {
            enthusiasm: totalInvestment,
            ...investment
          }
        })
      }
    })

    emit('tasks-distributed', actions)

  } catch (error) {
    console.error('Error submitting actions:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="task-distribution">
    <div class="distribution-header">
      <h3 class="section-title">Распределение задач</h3>
      <div class="actions-info">
        <span class="actions-used">{{ totalActionsUsed }} / {{ maxActions }}</span>
        <span class="enthusiasm-left">Энтузиазм: {{ currentEnthusiasm }}</span>
      </div>
    </div>

    <div class="tasks-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
      >
        <div class="task-header">
          <h4 class="task-name">{{ task.name }}</h4>
          <div class="task-meta">
            <span class="task-complexity">Сложность: {{ task.complexity }}</span>
            <span class="task-deadline">Дедлайн: {{ task.deadline }} раунд</span>
          </div>
        </div>

        <p class="task-description">{{ task.description }}</p>

        <div class="task-details">
          <div class="task-skill">
            <span class="skill-label">Требуемый навык:</span>
            <span class="skill-value">{{ task.requiredSkill }}</span>
          </div>
          <div class="task-reward">
            <span class="reward-label">Награда:</span>
            <span class="reward-value">{{ task.experienceReward }} XP</span>
          </div>
        </div>

        <div class="investment-section">
          <h5 class="investment-title">Инвестиции в задачу:</h5>

          <div class="investment-controls">
            <div class="investment-item">
              <label class="investment-label">Энтузиазм:</label>
              <input
                type="number"
                :value="getInvestment(task.id, 'enthusiasm')"
                @input="updateInvestment(task.id, 'enthusiasm', parseInt(($event.target as HTMLInputElement).value) || 0)"
                min="0"
                :max="currentEnthusiasm"
                class="investment-input"
              />
            </div>

            <div class="investment-item">
              <label class="investment-label">{{ task.requiredSkill }}:</label>
              <input
                type="number"
                :value="getInvestment(task.id, task.requiredSkill)"
                @input="updateInvestment(task.id, task.requiredSkill, parseInt(($event.target as HTMLInputElement).value) || 0)"
                min="0"
                max="10"
                class="investment-input"
              />
            </div>
          </div>

          <div class="investment-summary">
            <div class="summary-item">
              <span class="summary-label">Общие инвестиции:</span>
              <span class="summary-value">{{ getTotalInvestment(task.id) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Вероятность успеха:</span>
              <span class="summary-value">{{ calculateSuccessProbability(task, taskInvestments[task.id] || {}) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="distribution-actions">
      <button
        class="button"
        @click="submitActions"
        :disabled="!canSubmit || isLoading"
      >
        {{ isLoading ? 'Отправка...' : 'Подтвердить действия' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-distribution {
  max-width: 800px;
  margin: 0 auto;
}

.distribution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions-info {
  display: flex;
  gap: var(--spacing-md);
  font-size: 14px;
}

.actions-used {
  color: var(--color-text-primary);
  font-weight: 600;
}

.enthusiasm-left {
  color: var(--color-text-secondary);
}

.tasks-list {
  display: grid;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.task-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.task-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: 12px;
  color: var(--color-text-secondary);
}

.task-complexity,
.task-deadline {
  background-color: var(--color-bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
}

.task-description {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.task-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius);
}

.task-skill,
.task-reward {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-label,
.reward-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.skill-value,
.reward-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.investment-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}

.investment-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.investment-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.investment-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.investment-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.investment-input {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 14px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.investment-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.investment-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--border-radius);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.summary-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.distribution-actions {
  text-align: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.button {
  min-width: 200px;
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 16px;
}

@media (max-width: 768px) {
  .distribution-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: flex-start;
  }

  .task-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .task-meta {
    flex-direction: row;
    gap: var(--spacing-sm);
  }

  .investment-controls {
    grid-template-columns: 1fr;
  }

  .investment-summary {
    grid-template-columns: 1fr;
  }
}
</style>
