<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { Player } from 'bad-devs-gameengine'

const router = useRouter()
const gameStore = useGameStore()

const project = computed(() => gameStore.currentProject)
const gameSession = computed(() => gameStore.gameSession)
const humanPlayer = computed(() => gameStore.humanPlayer)

const totalRounds = computed(() => gameSession.value?.currentRound || 1)
const isProjectCompleted = computed(() => project.value?.isCompleted || false)

const rewards = computed(() => {
  if (!project.value) return { experienceReward: 0, baseSalary: 0 }
  return {
    experienceReward: project.value.rewards.experienceReward,
    baseSalary: project.value.rewards.baseSalary
  }
})

const finalStats = computed(() => {
  if (!humanPlayer.value) return null

  return {
    level: humanPlayer.value.level,
    experience: humanPlayer.value.experience,
    money: humanPlayer.value.money
  }
})

onMounted(() => {
  if (!project.value || !gameSession.value) {
    router.push('/')
    return
  }

  // Apply rewards if project is completed
  if (isProjectCompleted.value && humanPlayer.value) {
    // Create new player with updated stats
    const updatedPlayer = new Player({
      name: humanPlayer.value.name,
      specialization: humanPlayer.value.specialization,
      skills: humanPlayer.value.skills,
      enthusiasm: humanPlayer.value.enthusiasm,
      level: humanPlayer.value.level,
      experience: humanPlayer.value.experience + rewards.value.experienceReward,
      money: humanPlayer.value.money + rewards.value.baseSalary,
      abilities: humanPlayer.value.abilities
    })

    // Check for level up
    const experienceNeeded = updatedPlayer.level * 100
    if (updatedPlayer.experience >= experienceNeeded) {
      updatedPlayer.level += 1
      updatedPlayer.experience -= experienceNeeded
    }

    // Update store with new player
    gameStore.setHumanPlayer(updatedPlayer)
  }
})

function selectNewProject() {
  gameStore.setCurrentPhase('project-selection')
  router.push('/project-selection')
}

function goToCharacterCreation() {
  gameStore.setCurrentPhase('character')
  router.push('/')
}
</script>

<template>
  <div class="project-results">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Результаты проекта: {{ project?.name }}</h2>
        <p class="card-subtitle">
          Проект {{ isProjectCompleted ? 'успешно завершен!' : 'не завершен.' }}
        </p>
      </div>

      <div class="results-summary">
        <div class="summary-item">
          <strong>Раундов сыграно:</strong> {{ totalRounds }}
        </div>
        <div class="summary-item">
          <strong>Статус проекта:</strong>
          <span :class="isProjectCompleted ? 'status-success' : 'status-fail'">
            {{ isProjectCompleted ? 'Завершен' : 'Не завершен' }}
          </span>
        </div>
      </div>

      <div v-if="isProjectCompleted" class="rewards-section">
        <h3 class="section-title">Полученные награды</h3>
        <div class="rewards-grid">
          <div class="reward-card">
            <div class="reward-icon">⭐</div>
            <div class="reward-content">
              <div class="reward-title">Опыт</div>
              <div class="reward-value">+{{ rewards.experienceReward }} XP</div>
            </div>
          </div>
          <div class="reward-card">
            <div class="reward-icon">💰</div>
            <div class="reward-content">
              <div class="reward-title">Деньги</div>
              <div class="reward-value">+${{ rewards.baseSalary }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="player-stats-section">
        <h3 class="section-title">Ваши текущие характеристики</h3>
        <div v-if="humanPlayer" class="player-stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🌟</div>
            <div class="stat-content">
              <div class="stat-title">Уровень</div>
              <div class="stat-value">{{ humanPlayer.level }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✨</div>
            <div class="stat-content">
              <div class="stat-title">Опыт</div>
              <div class="stat-value">{{ humanPlayer.experience }} XP</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💵</div>
            <div class="stat-content">
              <div class="stat-title">Деньги</div>
              <div class="stat-value">${{ humanPlayer.money }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="button" @click="selectNewProject">Выбрать новый проект</button>
        <button class="button button-secondary" @click="goToCharacterCreation">Начать новую игру</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-results {
  max-width: 800px;
  margin: 0 auto;
}

.results-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 32px;
  padding: 20px;
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.summary-item {
  text-align: center;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.summary-item strong {
  display: block;
  font-size: 18px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.status-success {
  color: var(--color-success);
  font-weight: 600;
}

.status-fail {
  color: var(--color-danger);
  font-weight: 600;
}

.section-title {
  margin-top: 32px;
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 16px;
}

.rewards-grid,
.player-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.reward-card,
.stat-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.reward-icon,
.stat-icon {
  font-size: 32px;
}

.reward-title,
.stat-title {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.reward-value,
.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}
</style>
