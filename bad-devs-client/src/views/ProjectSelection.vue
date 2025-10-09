<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { Project, GameSession, AIPlayer, Player } from 'bad-devs-gameengine'

const router = useRouter()
const gameStore = useGameStore()

const projects = ref<any[]>([])
const isLoading = ref(false)
const selectedProject = ref<any | null>(null)

// Mock projects data - в реальном приложении это будет загружаться из GameEngine
const mockProjects = [
  {
    id: 'project-1',
    name: 'Разработка социальной сети',
    description: 'Создание новой социальной сети с уникальными функциями и современным дизайном',
    requiredLevel: 1,
    requirements: {
      frontend: 15,
      backend: 20,
      management: 10
    },
    rewards: {
      baseSalary: 2000,
      bonusMultiplier: 1.5,
      experienceReward: 500
    }
  },
  {
    id: 'project-2',
    name: 'Система управления задачами',
    description: 'Корпоративная система для управления проектами и задачами команды',
    requiredLevel: 2,
    requirements: {
      frontend: 12,
      backend: 15,
      management: 18
    },
    rewards: {
      baseSalary: 1500,
      bonusMultiplier: 1.3,
      experienceReward: 400
    }
  },
  {
    id: 'project-3',
    name: 'Мобильное приложение',
    description: 'Кроссплатформенное мобильное приложение для iOS и Android',
    requiredLevel: 3,
    requirements: {
      frontend: 25,
      backend: 15,
      management: 8
    },
    rewards: {
      baseSalary: 3000,
      bonusMultiplier: 1.8,
      experienceReward: 600
    }
  },
  {
    id: 'project-4',
    name: 'Аналитическая система',
    description: 'Система сбора и анализа больших данных с визуализацией',
    requiredLevel: 4,
    requirements: {
      frontend: 20,
      backend: 30,
      management: 12
    },
    rewards: {
      baseSalary: 4000,
      bonusMultiplier: 2.0,
      experienceReward: 800
    }
  }
]

onMounted(() => {
  // Инициализируем реальные Project из GameEngine
  projects.value = mockProjects.map(p => new Project({
    id: p.id,
    name: p.name,
    description: p.description,
    requiredLevel: p.requiredLevel,
    requirements: p.requirements,
    rewards: p.rewards
  }))
})

function selectProject(project: any) {
  selectedProject.value = project
}

async function startGame(project: any) {
  if (!project || !gameStore.gameSettings || !gameStore.humanPlayer) {
    alert('Ошибка: не все данные готовы для начала игры')
    return
  }

  isLoading.value = true

  try {
    // Create AI players
    const aiPlayers = createAIPlayers()

    // Создаем настоящую сессию GameEngine
    const gameSession = new GameSession({
      id: `session-${Date.now()}`,
      project: project as Project,
      players: [gameStore.humanPlayerInterface!, ...aiPlayers],
      settings: gameStore.gameSettings!,
      maxPlayers: 4
    })

    // Store in game store
    gameStore.setCurrentProject(project)
    gameStore.setGameSession(gameSession)
    gameStore.setAIPlayers(aiPlayers)
    gameStore.setCurrentPhase('game-session')

    // Navigate to game session
    router.push('/game-session')

  } catch (error) {
    console.error('Error starting game:', error)
    alert('Ошибка при запуске игры. Попробуйте еще раз.')
  } finally {
    isLoading.value = false
  }
}

function createAIPlayers(): any[] {
  const aiNames = ['Алексей', 'Мария', 'Дмитрий']
  const personalities = ['kind', 'evil'] // Добавляем личности

  // Получаем специализацию человека, чтобы избежать дублирования
  const humanSpecialization = gameStore.humanPlayer?.specialization || 'frontend'

  // Создаем список доступных специализаций (исключаем специализацию человека)
  const availableSpecializations: Array<'frontend' | 'backend' | 'management' | 'fullstack'> =
    ['frontend', 'backend', 'management', 'fullstack'].filter(spec => spec !== humanSpecialization)

  // Перемешиваем специализации для случайного распределения
  const shuffledSpecializations = [...availableSpecializations].sort(() => Math.random() - 0.5)

  return aiNames.map((name, index) => {
    // Берем специализацию по кругу, чтобы обеспечить равное распределение
    const specialization = shuffledSpecializations[index % shuffledSpecializations.length]
    const personality = personalities[Math.floor(Math.random() * personalities.length)]

    const enginePlayer = new Player({
      name,
      specialization: specialization as any,
      skills: {
        frontend: specialization === 'frontend' ? 4 : 1,
        backend: specialization === 'backend' ? 4 : 1,
        management: specialization === 'management' ? 4 : 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: gameStore.gameSettings!.enthusiasmPoints,
      level: 1,
      experience: 0,
      money: 0,
      abilities: []
    })

    // Wrap with engine AIPlayer interface so GameSession can extract original Player
    const aiPlayer = new AIPlayer(enginePlayer)

    // Добавляем информацию о личности для отображения
    return {
      ...aiPlayer,
      personality,
      personalityName: personality === 'kind' ? 'Добрый' : 'Злой'
    }
  })
}

function canSelectProject(project: any): boolean {
  if (!gameStore.humanPlayer) return false
  return gameStore.humanPlayer.level >= project.requiredLevel
}
</script>

<template>
  <div class="project-selection">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Выбор проекта</h2>
        <p class="card-subtitle">Выберите проект, над которым будет работать ваша команда.</p>
      </div>

      <div class="project-list">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          :class="{ 'project-card--disabled': !canSelectProject(project) }"
        >
          <div class="project-header">
            <h3 class="project-name">{{ project.name }}</h3>
            <span class="project-level">Уровень {{ project.requiredLevel }}</span>
          </div>

          <p class="project-description">{{ project.description }}</p>

          <div class="project-details">
            <div class="project-requirements">
              <h4 class="requirements-title">Требования:</h4>
              <div class="requirements-list">
                <div class="requirement-item">
                  <span class="requirement-icon">💻</span>
                  <span class="requirement-text">Frontend: {{ project.requirements.frontend }}</span>
                </div>
                <div class="requirement-item">
                  <span class="requirement-icon">⚙️</span>
                  <span class="requirement-text">Backend: {{ project.requirements.backend }}</span>
                </div>
                <div class="requirement-item">
                  <span class="requirement-icon">📊</span>
                  <span class="requirement-text">Management: {{ project.requirements.management }}</span>
                </div>
              </div>
            </div>

            <div class="project-rewards">
              <h4 class="rewards-title">Награды:</h4>
              <div class="rewards-list">
                <div class="reward-item">
                  <span class="reward-icon">⭐</span>
                  <span class="reward-text">{{ project.rewards.experienceReward }} XP</span>
                </div>
                <div class="reward-item">
                  <span class="reward-icon">💰</span>
                  <span class="reward-text">${{ project.rewards.baseSalary }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="project-status" v-if="!canSelectProject(project)">
            <span class="status-text">Недостаточный уровень</span>
          </div>

          <div class="project-actions">
            <button
              class="button"
              @click="startGame(project)"
              :disabled="!canSelectProject(project) || isLoading"
            >
              {{ isLoading ? 'Запуск игры...' : 'Начать проект' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-selection {
  max-width: 1280px;
  margin: 0 auto;
}

.project-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.project-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 400px;
}

.project-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.project-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.project-card--disabled .project-actions button {
  pointer-events: none;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.project-level {
  background-color: var(--color-accent);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.project-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  flex-grow: 1;
  line-height: 1.5;
}

.project-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.requirements-title,
.rewards-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.requirements-list,
.rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.requirement-item,
.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--color-bg-tertiary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.project-status {
  margin-bottom: 16px;
  text-align: center;
}

.status-text {
  color: var(--color-danger);
  font-weight: 500;
}

.project-actions {
  margin-top: auto;
  text-align: center;
}

.project-actions .button {
  width: 100%;
}
</style>
