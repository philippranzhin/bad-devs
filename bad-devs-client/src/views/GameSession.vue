<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import type { Task, PlayerActionRequest } from 'bad-devs-gameengine'
import ProfileModal from '@/components/ProfileModal.vue'

const router = useRouter()
const gameStore = useGameStore()

// Ref для модалки профиля
const profileModal = ref<InstanceType<typeof ProfileModal> | null>(null)

const currentPhase = ref<'task-distribution'>('task-distribution')
const currentTasks = ref<Task[]>([])
const distributedTasks = ref<Map<string, string>>(new Map()) // taskId -> playerId
const isLoading = ref(false)
const currentPlayerIndex = ref(0)
const allPlayers = ref<any[]>([])
const isWaitingForPlayer = ref(false)
const tasksPerPlayer = ref<Map<string, number>>(new Map()) // playerId -> количество выбранных задач
const currentTaskIndex = ref(0) // Индекс текущей задачи для распределения
const isProcessingAI = ref(false) // Флаг для показа AI действий
const aiResult = ref<{playerName: string, taskName: string} | null>(null) // Результат AI действия
const draggedTask = ref<Task | null>(null) // Задача, которую перетаскивают

const gameSession = computed(() => gameStore.gameSession)
const currentRound = computed(() => gameStore.currentRound)
const projectProgress = computed(() => gameStore.projectProgress)
const isProjectCompleted = computed(() => gameStore.isProjectCompleted)

onMounted(async () => {
  if (!gameSession.value) {
    router.push('/')
    return
  }

  // Инициализируем игроков - человек всегда первый
  allPlayers.value = [
    gameStore.humanPlayerInterface!,
    ...gameStore.aiPlayers!
  ]

  await startRound()
})

async function startRound() {
  if (!gameSession.value) return

  isLoading.value = true
  currentPhase.value = 'task-distribution'
  currentPlayerIndex.value = 0
  currentTaskIndex.value = 0
  distributedTasks.value.clear()
  tasksPerPlayer.value.clear()
  isWaitingForPlayer.value = false
  isProcessingAI.value = false
  aiResult.value = null

  try {
    // Generate tasks for current round
    currentTasks.value = generateTasksForRound()

    // Инициализируем счетчики задач для каждого игрока
    allPlayers.value.forEach(player => {
      tasksPerPlayer.value.set(player.id, 0)
    })

    // Start with first player (человек)
    await nextPlayerTurn()

  } catch (error) {
    console.error('Error starting round:', error)
  } finally {
    isLoading.value = false
  }
}

// Следующий ход игрока
async function nextPlayerTurn() {
  // Проверяем, все ли задачи распределены
  if (currentTaskIndex.value >= currentTasks.value.length) {
    console.log('Распределение завершено!')
    return
  }

  const currentPlayer = allPlayers.value[currentPlayerIndex.value]

  if (currentPlayer === gameStore.humanPlayerInterface) {
    // Ход человека - ждем его действий
    isWaitingForPlayer.value = true
  } else {
    // Ход AI - автоматически выбираем задачу
    await aiPlayerTurn(currentPlayer)
  }
}

// Ход AI игрока
async function aiPlayerTurn(player: any) {
  const currentTask = currentTasks.value[currentTaskIndex.value]

  if (currentTask) {
    // Первая часть: показываем "распределяет"
    isProcessingAI.value = true
    aiResult.value = null

    // Задержка для показа процесса
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Умная логика выбора игрока для задачи
    const targetPlayerId = selectBestPlayerForTask(currentTask, player)

    // Выполняем распределение
    distributedTasks.value.set(currentTask.id, targetPlayerId)

    // Обновляем счетчик задач для игрока
    const playerTasks = tasksPerPlayer.value.get(targetPlayerId) || 0
    tasksPerPlayer.value.set(targetPlayerId, playerTasks + 1)

    // Вторая часть: показываем результат
    isProcessingAI.value = false
    const targetPlayer = allPlayers.value.find(p => p.id === targetPlayerId)
    aiResult.value = {
      playerName: targetPlayer?.name || 'Unknown',
      taskName: currentTask.name
    }

    // Задержка для показа результата
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Очищаем результат и переходим к следующей задаче
    aiResult.value = null
    currentTaskIndex.value++
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % allPlayers.value.length

    await nextPlayerTurn()
  }
}

// Умная логика выбора игрока для задачи
function selectBestPlayerForTask(task: Task, currentAIPlayer: any): string {
  const playerSpecialization = getPlayerSpecialization(currentAIPlayer)
  const maxTasks = gameStore.gameSettings?.actionsPerTurn || 5

  // Проверяем, может ли AI игрок взять еще задачи
  const currentAITasks = tasksPerPlayer.value.get(currentAIPlayer.id) || 0
  const canAITakeMore = currentAITasks < maxTasks

  // Если задача подходит AI игроку по специализации И у него есть место - берем себе
  if (task.requiredSkill === playerSpecialization && canAITakeMore) {
    return currentAIPlayer.id
  }

  // Если задача не подходит или у AI нет места - ищем кому её дать
  const availablePlayers = allPlayers.value.filter(p => {
    const playerTasks = tasksPerPlayer.value.get(p.id) || 0
    return playerTasks < maxTasks
  })

  if (availablePlayers.length === 0) {
    // Если все заполнены, но AI может взять - берем себе
    if (canAITakeMore) {
      return currentAIPlayer.id
    }
    // Если даже AI заполнен - берем себе (это не должно происходить в нормальной игре)
    return currentAIPlayer.id
  }

  // Находим игрока, которому эта задача будет максимально невыгодна
  let worstPlayer = availablePlayers[0]
  let worstScore = calculateTaskDisadvantage(task, availablePlayers[0])

  for (const player of availablePlayers) {
    const disadvantage = calculateTaskDisadvantage(task, player)
    if (disadvantage > worstScore) {
      worstScore = disadvantage
      worstPlayer = player
    }
  }

  return worstPlayer.id
}

// Рассчитывает насколько невыгодна задача для игрока
function calculateTaskDisadvantage(task: Task, player: any): number {
  const playerSpecialization = getPlayerSpecialization(player)

  // Базовый штраф за несоответствие специализации
  let disadvantage = 0

  if (task.requiredSkill !== playerSpecialization) {
    disadvantage += 10 // Штраф за несоответствие специализации
  }

  // Дополнительный штраф за сложность задачи
  disadvantage += task.complexity * 2

  // Штраф за срочность (дедлайн)
  if (task.deadline <= 2) {
    disadvantage += 5 // Срочные задачи еще хуже
  }

  // Бонус за то, что игрок уже перегружен
  const playerTasks = tasksPerPlayer.value.get(player.id) || 0
  const maxTasks = gameStore.gameSettings?.actionsPerTurn || 5
  const overloadRatio = playerTasks / maxTasks
  disadvantage += overloadRatio * 15 // Чем больше перегружен, тем хуже

  // Если это человек - небольшой штраф (AI предпочитает назначать другим AI)
  if (player === gameStore.humanPlayerInterface) {
    disadvantage += 5 // Уменьшили штраф с 20 до 5
  }

  // Если это другой AI - небольшой бонус (AI предпочитает назначать другим AI)
  if (player !== gameStore.humanPlayerInterface) {
    disadvantage -= 3 // Небольшой бонус для других AI
  }

  return disadvantage
}

function generateTasksForRound(): Task[] {
  const actionsPerTurn = gameStore.gameSettings?.actionsPerTurn || 5
  const playerCount = allPlayers.value.length
  const totalTasks = actionsPerTurn * playerCount

  // Генерируем больше задач для выбора
  const taskTemplates = [
    {
      name: 'Исправить баг с авторизацией',
      description: 'Пользователи не могут войти в систему на мобильных устройствах',
      requiredSkill: 'frontend',
      complexity: 3,
      deadline: 2,
      experienceReward: 50,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    },
    {
      name: 'Оптимизировать API запросы',
      description: 'Добавить кэширование и оптимизировать производительность API',
      requiredSkill: 'backend',
      complexity: 4,
      deadline: 3,
      experienceReward: 75,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    },
    {
      name: 'Планирование спринта',
      description: 'Организовать задачи на следующий спринт и распределить нагрузку',
      requiredSkill: 'management',
      complexity: 2,
      deadline: 1,
      experienceReward: 40,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    },
    {
      name: 'Написать unit тесты',
      description: 'Покрыть тестами критически важные функции системы',
      requiredSkill: 'backend',
      complexity: 3,
      deadline: 2,
      experienceReward: 60,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    },
    {
      name: 'Улучшить UX интерфейса',
      description: 'Переработать пользовательский интерфейс для лучшего опыта',
      requiredSkill: 'frontend',
      complexity: 4,
      deadline: 3,
      experienceReward: 80,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    },
    {
      name: 'Провести код-ревью',
      description: 'Проверить качество кода и предложить улучшения',
      requiredSkill: 'management',
      complexity: 2,
      deadline: 1,
      experienceReward: 35,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    },
    {
      name: 'Настроить CI/CD',
      description: 'Автоматизировать процесс развертывания приложения',
      requiredSkill: 'backend',
      complexity: 5,
      deadline: 4,
      experienceReward: 100,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    },
    {
      name: 'Создать мобильную версию',
      description: 'Адаптировать интерфейс для мобильных устройств',
      requiredSkill: 'frontend',
      complexity: 4,
      deadline: 3,
      experienceReward: 90,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    },
    {
      name: 'Оптимизировать базу данных',
      description: 'Улучшить производительность запросов к БД',
      requiredSkill: 'backend',
      complexity: 4,
      deadline: 3,
      experienceReward: 85,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    },
    {
      name: 'Провести ретроспективу',
      description: 'Проанализировать работу команды и найти точки роста',
      requiredSkill: 'management',
      complexity: 3,
      deadline: 2,
      experienceReward: 55,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    }
  ]

  // Генерируем задачи на основе шаблонов
  const tasks: Task[] = []
  for (let i = 0; i < totalTasks; i++) {
    const template = taskTemplates[i % taskTemplates.length]
    tasks.push({
      id: `task-${Date.now()}-${i}`,
      name: `${template.name} ${i + 1}`,
      description: template.description,
      requiredSkill: template.requiredSkill,
      complexity: template.complexity,
      deadline: template.deadline,
      experienceReward: template.experienceReward,
      contributesToCommonGoal: template.contributesToCommonGoal,
      commonGoalSkill: template.commonGoalSkill
    })
  }

  return tasks
}

// Drag and Drop функции
function onDragStart(event: DragEvent, task: Task) {
  if (!isWaitingForPlayer.value) return

  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  // Добавляем класс для подсветки
  const target = event.currentTarget as HTMLElement
  target.classList.add('player-column--drag-over')
}

function onDragLeave(event: DragEvent) {
  const target = event.currentTarget as HTMLElement
  target.classList.remove('player-column--drag-over')
}

function onDrop(event: DragEvent, playerId: string) {
  event.preventDefault()

  if (!draggedTask.value || !isWaitingForPlayer.value) return

  // Проверяем, может ли игрок взять еще задачи
  const playerTasks = tasksPerPlayer.value.get(playerId) || 0
  const maxTasks = gameStore.gameSettings?.actionsPerTurn || 5

  if (playerTasks >= maxTasks) {
    // Игрок уже заполнен, не можем назначить задачу
    alert(`Игрок уже получил максимальное количество задач (${maxTasks})`)
    return
  }

  // Убираем класс подсветки
  const target = event.currentTarget as HTMLElement
  target.classList.remove('player-column--drag-over')

  // Назначаем задачу игроку
  distributedTasks.value.set(draggedTask.value.id, playerId)

  // Обновляем счетчик задач для игрока
  tasksPerPlayer.value.set(playerId, playerTasks + 1)

  // Переходим к следующей задаче и игроку
  currentTaskIndex.value++
  currentPlayerIndex.value = (currentPlayerIndex.value + 1) % allPlayers.value.length
  isWaitingForPlayer.value = false

  draggedTask.value = null

  nextPlayerTurn()
}

// Двойной клик для назначения себе
function onTaskDoubleClick(task: Task) {
  if (!isWaitingForPlayer.value) return

  const humanPlayerId = gameStore.humanPlayerInterface!.id

  // Проверяем, может ли человек взять еще задачи
  const playerTasks = tasksPerPlayer.value.get(humanPlayerId) || 0
  const maxTasks = gameStore.gameSettings?.actionsPerTurn || 5

  if (playerTasks >= maxTasks) {
    // Человек уже заполнен, не можем назначить задачу
    alert(`Вы уже получили максимальное количество задач (${maxTasks})`)
    return
  }

  distributedTasks.value.set(task.id, humanPlayerId)

  // Обновляем счетчик задач для игрока
  tasksPerPlayer.value.set(humanPlayerId, playerTasks + 1)

  // Переходим к следующей задаче и игроку
  currentTaskIndex.value++
  currentPlayerIndex.value = (currentPlayerIndex.value + 1) % allPlayers.value.length
  isWaitingForPlayer.value = false

  nextPlayerTurn()
}

function getPhaseTitle(): string {
  return 'Распределение задач'
}

function getPhaseDescription(): string {
  return 'Распределите задачи между игроками по очереди'
}

// Показать профиль игрока
function showPlayerProfile(player: any) {
  console.log('showPlayerProfile called with:', player)

  // Получаем данные игрока из правильного источника
  let playerData: any = null

  if (player === gameStore.humanPlayerInterface) {
    // Для человека берем данные из humanPlayer
    playerData = gameStore.humanPlayer
    console.log('Human player data:', playerData)
  } else {
    // Для AI берем данные из player.player
    playerData = player.player
    console.log('AI player data:', playerData)
  }

  console.log('Calling profileModal.show with:', playerData)
  profileModal.value?.show(playerData)
}

function getPlayerSpecialization(player: any): string {
  if (player === gameStore.humanPlayerInterface) {
    return gameStore.humanPlayer?.specialization || 'unknown'
  }
  return player.player?.specialization || 'unknown'
}

function getProjectProgressPercentage(): number {
  if (!gameSession.value?.project) return 0

  const project = gameSession.value.project
  const totalRequired = project.requirements.frontend + project.requirements.backend + project.requirements.management
  const totalProgress = project.currentProgress.frontend + project.currentProgress.backend + project.currentProgress.management

  return totalRequired > 0 ? Math.round((totalProgress / totalRequired) * 100) : 0
}

function getSpecializationName(specialization: string): string {
  const names: Record<string, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    management: 'Management',
    fullstack: 'Fullstack'
  }
  return names[specialization] || specialization
}

// Получить текущего игрока для распределения задач
const currentPlayer = computed(() => {
  return allPlayers.value[currentPlayerIndex.value]
})

// Получить текущую задачу для распределения
const currentTask = computed(() => {
  return currentTasks.value[currentTaskIndex.value]
})

// Получить распределенные задачи
const assignedTasks = computed(() => {
  const assigned = new Map<string, Task[]>()

  allPlayers.value.forEach(player => {
    assigned.set(player.id, [])
  })

  distributedTasks.value.forEach((playerId, taskId) => {
    const task = currentTasks.value.find(t => t.id === taskId)
    if (task) {
      assigned.get(playerId)?.push(task)
    }
  })

  return assigned
})

// Проверить, завершено ли распределение
const isDistributionComplete = computed(() => {
  return currentTaskIndex.value >= currentTasks.value.length
})

// Получить информацию о текущем ходе
const currentTurnInfo = computed(() => {
  if (aiResult.value) {
    const currentAIPlayer = allPlayers.value[currentPlayerIndex.value]
    const targetPlayer = allPlayers.value.find(p => p.name === aiResult.value?.playerName)

    if (targetPlayer === currentAIPlayer) {
      return `${aiResult.value.playerName} назначил задачу "${aiResult.value.taskName}" себе!`
    } else {
      return `${currentAIPlayer.name} назначил задачу "${aiResult.value.taskName}" игроку ${aiResult.value.playerName}!`
    }
  } else if (isProcessingAI.value) {
    const player = allPlayers.value[currentPlayerIndex.value]
    return `${player.name} распределяет задачу...`
  } else if (isWaitingForPlayer.value) {
    return `Ваш ход! Перетащите задачу к игроку или дважды кликните для назначения себе`
  } else if (isDistributionComplete.value) {
    return `Распределение завершено!`
  } else {
    return `Ожидание...`
  }
})
</script>

<template>
  <div class="game-session">
    <!-- GitHub-style header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">Распределение задач</h1>
          <p class="page-description">Раунд {{ currentRound }} из {{ gameSession?.settings.rounds }}</p>
        </div>
        <div class="page-actions">
          <div class="project-info">
            <span class="project-name">{{ gameSession?.project?.name }}</span>
            <div class="progress-indicator">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${getProjectProgressPercentage()}%` }"></div>
              </div>
              <span class="progress-text">{{ getProjectProgressPercentage() }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="page-content">
      <!-- Current turn info -->
      <div class="turn-status">
        <div class="turn-info">
          <div class="turn-indicator">
            <div v-if="isProcessingAI" class="spinner"></div>
            <div v-else-if="aiResult" class="success-icon">✓</div>
            <div v-else-if="isWaitingForPlayer" class="user-icon">👤</div>
            <div v-else class="wait-icon">⏳</div>
          </div>
          <div class="turn-text">
            <h3>{{ currentTurnInfo }}</h3>
            <div class="turn-details">
              <span class="task-counter">Задача {{ currentTaskIndex + 1 }} из {{ currentTasks.length }}</span>
              <span class="player-name">Текущий игрок: {{ allPlayers[currentPlayerIndex]?.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Task distribution area -->
      <div class="distribution-area">
        <!-- Current task -->
        <div v-if="currentTask && !isDistributionComplete" class="current-task-section">
          <div class="section-header">
            <h2>Текущая задача</h2>
            <div class="task-number">#{{ currentTaskIndex + 1 }}</div>
          </div>

          <div
            class="task-card"
            :class="{ 'task-card--draggable': isWaitingForPlayer }"
            :draggable="isWaitingForPlayer"
            @dragstart="onDragStart($event, currentTask)"
            @dblclick="onTaskDoubleClick(currentTask)"
          >
            <div class="task-header">
              <div class="task-title">
                <h3>{{ currentTask.name }}</h3>
                <div class="task-labels">
                  <span class="label label--skill" :class="`label--${currentTask.requiredSkill}`">
                    {{ currentTask.requiredSkill }}
                  </span>
                  <span class="label label--complexity">
                    Сложность {{ currentTask.complexity }}
                  </span>
                </div>
              </div>
              <div class="task-meta">
                <div class="meta-item">
                  <span class="meta-label">Дедлайн:</span>
                  <span class="meta-value">{{ currentTask.deadline }} раунд</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Награда:</span>
                  <span class="meta-value">{{ currentTask.experienceReward }} XP</span>
                </div>
              </div>
            </div>

            <div class="task-body">
              <p class="task-description">{{ currentTask.description }}</p>
            </div>


            <!-- Player instructions -->
            <div v-if="isWaitingForPlayer" class="player-instructions">
              <div class="instruction-text">
                <strong>Ваш ход!</strong> Перетащите задачу к игроку или дважды кликните для назначения себе
              </div>
            </div>
          </div>
        </div>

        <!-- Players columns -->
        <div class="players-section">
          <div class="section-header">
            <h2>Распределенные задачи</h2>
            <div class="distribution-progress">
              {{ currentTaskIndex }} / {{ currentTasks.length }} распределено
            </div>
          </div>

          <div class="players-grid">
            <div
              v-for="player in allPlayers"
              :key="player.id"
              class="player-column"
              :class="{
                'player-column--current': player === currentPlayer && isWaitingForPlayer,
                'player-column--ai': player !== gameStore.humanPlayerInterface,
                'player-column--filled': (tasksPerPlayer.get(player.id) || 0) >= (gameStore.gameSettings?.actionsPerTurn || 5)
              }"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop($event, player.id)"
            >
              <div class="player-header">
                <div class="player-info">
                  <div class="player-name clickable" @click="showPlayerProfile(player)">
                    {{ player.name }}
                  </div>
                  <div class="player-details">
                    <span class="player-type">
                      {{ player === gameStore.humanPlayerInterface ? 'Вы' : 'AI' }}
                    </span>
                    <span class="player-specialization">
                      {{ getSpecializationName(getPlayerSpecialization(player)) }}
                    </span>
                  </div>
                </div>
                <div class="task-count">
                  {{ tasksPerPlayer.get(player.id) || 0 }} / {{ gameStore.gameSettings?.actionsPerTurn || 5 }}
                </div>
              </div>

              <div class="tasks-list">
                <div
                  v-for="task in assignedTasks.get(player.id) || []"
                  :key="task.id"
                  class="assigned-task"
                >
                  <div class="task-title">{{ task.name }}</div>
                  <div class="task-meta">
                    <span class="task-skill">{{ task.requiredSkill }}</span>
                    <span class="task-reward">{{ task.experienceReward }} XP</span>
                  </div>
                </div>

                <!-- Empty state -->
                <div v-if="(assignedTasks.get(player.id) || []).length === 0" class="empty-state">
                  <div class="empty-icon">📋</div>
                  <div class="empty-text">Нет задач</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Загрузка...</p>
      </div>
    </div>
  </div>

  <!-- Profile Modal -->
  <ProfileModal ref="profileModal" />
</template>

<style scoped>
.game-session {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

/* GitHub-style page header */
.page-header {
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 24px 0;
}

.page-header-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-description {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.project-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.project-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  width: 120px;
  height: 8px;
  background-color: var(--color-border-muted);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-accent);
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Main content */
.page-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Turn status */
.turn-status {
  margin-bottom: 32px;
}

.turn-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.turn-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-bg-tertiary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.success-icon {
  color: var(--color-success);
  font-size: 20px;
  font-weight: bold;
}

.user-icon {
  font-size: 20px;
}

.wait-icon {
  font-size: 20px;
  color: var(--color-text-tertiary);
}

.turn-text h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.turn-details {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.task-counter {
  font-weight: 500;
}

.player-name {
  color: var(--color-text-tertiary);
}

/* Distribution area */
.distribution-area {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 32px;
  min-height: 600px;
}

/* Section headers */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-number {
  background-color: var(--color-accent);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.distribution-progress {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Current task */
.current-task-section {
  display: flex;
  flex-direction: column;
}

.task-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
}

.task-card--draggable {
  cursor: grab;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.task-card--draggable:active {
  cursor: grabbing;
}

.task-header {
  margin-bottom: 16px;
}

.task-title h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-labels {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.label {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.label--skill {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.label--frontend {
  background-color: #e3f2fd;
  color: #1976d2;
}

.label--backend {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.label--management {
  background-color: #e8f5e8;
  color: #388e3c;
}

.label--complexity {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.task-meta {
  display: flex;
  gap: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.task-body {
  margin-bottom: 20px;
}

.task-description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* AI status */
.ai-status {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
}

.ai-processing {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-accent);
  font-weight: 500;
}

.ai-result {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-success);
  font-weight: 500;
}

/* Player instructions */
.player-instructions {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--color-bg-secondary);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
}

.instruction-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* Players section */
.players-section {
  display: flex;
  flex-direction: column;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.player-column {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  min-height: 300px;
}

.player-column--current {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.player-column--ai {
  background-color: var(--color-bg-secondary);
}

.player-column--drag-over {
  border-color: var(--color-accent);
  background-color: var(--color-bg-tertiary);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.player-column--filled {
  opacity: 0.6;
  background-color: var(--color-bg-tertiary);
}

.player-column--filled .player-header {
  border-bottom-color: var(--color-border-muted);
}

.player-column--filled .task-count {
  background-color: var(--color-text-tertiary);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.player-name.clickable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.player-name.clickable:hover {
  color: var(--color-accent);
}

.player-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.player-type {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.player-specialization {
  background-color: var(--color-accent);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.task-count {
  background-color: var(--color-accent);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}

.assigned-task {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
}

.assigned-task .task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.assigned-task .task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assigned-task .task-skill {
  background-color: var(--color-accent);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.assigned-task .task-reward {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--color-text-tertiary);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-content {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-content .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-accent);
}

.loading-content p {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
