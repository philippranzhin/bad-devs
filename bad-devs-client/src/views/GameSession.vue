<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import type { Task, PlayerActionRequest } from 'bad-devs-gameengine'
import ProfileModal from '@/components/ProfileModal.vue'

const router = useRouter()
const gameStore = useGameStore()

// Ref для модалки профиля
const profileModal = ref<InstanceType<typeof ProfileModal> | null>(null)

// Состояние UI
const isLoading = ref(false)
const isProcessingAI = ref(false)
const aiThinking = ref<{playerName: string} | null>(null)
const aiActorName = ref<string | null>(null)
const aiPreviewRecipientName = ref<string | null>(null)
const aiPreviewTaskName = ref<string | null>(null)
const aiResult = ref<{playerName: string, taskName: string} | null>(null)
const draggedTask = ref<Task | null>(null)
// Снимок всех задач раунда на момент инициализации распределения
const allDistributionTasks = ref<Task[]>([])

// Данные для фазы решения задач
const playerInvestments = ref<Map<string, Map<string, any>>>(new Map()) // playerId -> taskId -> investment
const isWaitingForHumanAction = ref(false)

// Computed properties из GameEngine
const gameSession = computed(() => gameStore.gameSession)
const currentRound = computed(() => gameStore.currentRound)
const projectProgress = computed(() => gameStore.projectProgress)
const isProjectCompleted = computed(() => gameStore.isProjectCompleted)

// Получаем данные из GameEngine
const currentPhase = computed(() => {
  const s: any = gameSession.value
  if (!s) return 'task-distribution'
  if (typeof s.getCurrentPhase !== 'function') return 'task-distribution'
  return s.getCurrentPhase()
})

const currentTasks = computed(() => {
  if (!gameSession.value) return []
  return gameSession.value.getCurrentRoundTasks()
})

const distributionState = computed(() => {
  if (!gameSession.value) return {
    currentPlayerId: null,
    availableTasks: [],
    assignedTasks: [],
    isComplete: false
  }
  return gameSession.value.getDistributionState()
})

const allPlayers = computed(() => {
  if (!gameSession.value) return []
  return gameSession.value.playerInterfaces
})

const humanPlayerTasks = computed(() => {
  if (!gameSession.value || !gameStore.humanPlayerInterface) return []
  return gameSession.value.getPlayerTasks(gameStore.humanPlayerInterface.id)
})

onMounted(async () => {
  if (!gameSession.value) {
    router.push('/')
    return
  }

  // Инициализируем распределение задач в GameEngine
  gameSession.value.initializeTaskDistribution()

  // Если сейчас ход AI — автоматически обрабатываем его, пока не дойдем до человека или завершения
  await autoAdvanceAITurns()

  // Зафиксируем полный список задач раунда до начала распределения (он уменьшается в availableTasks)
  allDistributionTasks.value = gameSession.value.getCurrentRoundTasks()

  // Инициализируем фазу решения задач если нужно
  if (currentPhase.value === 'task-solving') {
    await initializeTaskSolvingPhase()
  }
})

// Следим за сменой текущего игрока и автоматически ходим за ИИ
watch(
  () => ({ id: distributionState.value.currentPlayerId, complete: distributionState.value.isComplete }),
  async ({ id, complete }) => {
    if (!gameSession.value || !gameStore.humanPlayerInterface) return
    if (complete) {
      // Переход к фазе решения
      gameSession.value.completeTaskDistribution()
      await initializeTaskSolvingPhase()
      return
    }
    if (id && id !== gameStore.humanPlayerInterface.id) {
      await autoAdvanceAITurns()
    }
  }
)

// Инициализация фазы решения задач
async function initializeTaskSolvingPhase() {
  if (!gameSession.value || !gameStore.humanPlayerInterface) return

  // Инициализируем инвестиции для всех задач игрока
  const tasks = humanPlayerTasks.value
  tasks.forEach(task => {
    if (!playerInvestments.value.has(gameStore.humanPlayerInterface!.id)) {
      playerInvestments.value.set(gameStore.humanPlayerInterface!.id, new Map())
    }

    const taskInvestments = playerInvestments.value.get(gameStore.humanPlayerInterface!.id)!
    if (!taskInvestments.has(task.id)) {
      taskInvestments.set(task.id, {
        frontend: 0,
        backend: 0,
        management: 0,
        enthusiasm: 0
      })
    }
  })

  isWaitingForHumanAction.value = true
}

// Назначение задачи игроку
async function assignTaskToPlayer(task: Task, playerId: string) {
  if (!gameSession.value) return

  try {
    gameSession.value.assignTask(task.id, playerId, gameStore.humanPlayerInterface!.id)

    // Проверяем, завершено ли распределение
    if (distributionState.value.isComplete) {
      gameSession.value.completeTaskDistribution()
      await initializeTaskSolvingPhase()
    } else {
      // После хода человека, если дальше очередь ИИ — автопродвижение
      await autoAdvanceAITurns()
    }
  } catch (error) {
    console.error('Error assigning task:', error)
    alert('Ошибка при назначении задачи: ' + (error as Error).message)
  }
}

// Обработка действий игрока при распределении задач
async function onTaskDistributed(task: Task, assignedTo: string) {
  await assignTaskToPlayer(task, assignedTo)
}

// Обработка двойного клика по задаче
async function onTaskDoubleClick(task: Task) {
  if (!gameStore.humanPlayerInterface) return

  const currentPlayerId = distributionState.value.currentPlayerId
  if (currentPlayerId !== gameStore.humanPlayerInterface.id) {
    alert('Не ваш ход!')
    return
  }

  await assignTaskToPlayer(task, gameStore.humanPlayerInterface.id)
}

// Автопроход ходов AI, пока не очередь человека или пока распределение не завершено
async function autoAdvanceAITurns() {
  if (!gameSession.value || !gameStore.humanPlayerInterface) return

  // Защита от гонок
  if (isProcessingAI.value) return

  try {
    isProcessingAI.value = true
    while (true) {
      const state = gameSession.value.getDistributionState()
      if (state.isComplete) break
      const currentId = state.currentPlayerId
      if (!currentId) break
      if (currentId === gameStore.humanPlayerInterface.id) break

      // 1) Предпросмотр: получаем задачу (и потенциального получателя) ДО показа текста, чтобы сразу отобразить название задачи
      const currentPlayer = allPlayers.value.find(p => p.id === currentId)
      aiActorName.value = currentPlayer?.name || 'Бот'
      aiResult.value = null
      aiPreviewRecipientName.value = null
      aiPreviewTaskName.value = null

      const preview = await (gameSession.value as any).previewCurrentAIChoice()
      const sourceForPreview = allDistributionTasks.value.length > 0 ? allDistributionTasks.value : currentTasks.value
      const previewTaskName = preview ? (sourceForPreview.find(t => t.id === preview.taskId)?.name || 'Задача') : null
      // По требованию показываем только название задачи, без получателя на этапе "распределяет"
      aiPreviewTaskName.value = previewTaskName
      // Получателя пока не показываем
      // const previewPlayerName = preview ? (allPlayers.value.find(p => p.id === preview.assignedTo)?.name || preview.assignedTo) : null
      // aiPreviewRecipientName.value = previewPlayerName || null

      // 2) Сообщение: ИмяБота распределяет задачу ТайтлЗадачи
      aiThinking.value = { playerName: aiActorName.value }
      const preDelay = 600 + Math.floor(Math.random() * 800)
      await new Promise(r => setTimeout(r, preDelay))

      // Дополнительная короткая пауза перед фактическим назначением
      await new Promise(r => setTimeout(r, 600))

      // Запоминаем состояние до хода
      const before = gameSession.value.getDistributionState().assignedTasks.length

      // 3) Назначение задачи
      await gameSession.value.processCurrentAITurn()

      // 4) Показ результата: какая задача и кому назначена
      const afterState = gameSession.value.getDistributionState()
      const after = afterState.assignedTasks.length
      if (after > before) {
        const last = afterState.assignedTasks[after - 1]
        const playerName = allPlayers.value.find(p => p.id === last.assignedTo)?.name || last.assignedTo
        const source = allDistributionTasks.value.length > 0 ? allDistributionTasks.value : currentTasks.value
        const taskName = source.find(t => t.id === last.taskId)?.name || 'Задача'
        aiThinking.value = null
        aiPreviewRecipientName.value = null
        aiPreviewTaskName.value = null
        aiResult.value = { playerName, taskName }
        // Пауза чтобы пользователь увидел результат распределения
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    // Если после автопрохода распределение завершено — стартуем фазу решения
    if (gameSession.value.getDistributionState().isComplete) {
      gameSession.value.completeTaskDistribution()
      await initializeTaskSolvingPhase()
    }
  } finally {
    isProcessingAI.value = false
    // Очистим индикаторы чуть позже
    setTimeout(() => { aiThinking.value = null; aiPreviewRecipientName.value = null; aiResult.value = null; aiActorName.value = null }, 500)
  }
}

// Ход AI игрока
// Умная логика выбора игрока для задачи
// Drag and Drop функции
function onDragStart(event: DragEvent, task: Task) {
  const currentPlayerId = distributionState.value.currentPlayerId
  if (currentPlayerId !== gameStore.humanPlayerInterface?.id) return

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

  if (!draggedTask.value) return

  const currentPlayerId = distributionState.value.currentPlayerId
  if (currentPlayerId !== gameStore.humanPlayerInterface?.id) return

  // Проверяем, может ли игрок взять еще задачи
  const playerTaskCount = distributionState.value.assignedTasks.filter(a => a.assignedTo === playerId).length
  const maxTasks = gameStore.gameSettings?.actionsPerTurn || 5

  if (playerTaskCount >= maxTasks) {
    alert(`Игрок уже получил максимальное количество задач (${maxTasks})`)
    return
  }

  // Убираем класс подсветки
  const target = event.currentTarget as HTMLElement
  target.classList.remove('player-column--drag-over')

  // Назначаем задачу
  assignTaskToPlayer(draggedTask.value, playerId)

  // Очищаем перетаскиваемую задачу
  draggedTask.value = null
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

// Функции для работы с инвестициями
function updateInvestment(playerId: string, taskId: string, skill: string, value: number) {
  const playerInvestmentsMap = playerInvestments.value.get(playerId)
  if (playerInvestmentsMap) {
    const investment = playerInvestmentsMap.get(taskId)
    if (investment) {
      investment[skill] = value
    }
  }
}

function getInvestment(playerId: string, taskId: string, skill: string): number {
  const playerInvestmentsMap = playerInvestments.value.get(playerId)
  if (playerInvestmentsMap) {
    const investment = playerInvestmentsMap.get(taskId)
    return investment?.[skill] || 0
  }
  return 0
}

function calculateSuccessProbability(task: Task, investment: any): number {
  if (!gameSession.value || !gameStore.humanPlayerInterface) return 0

  try {
    return gameSession.value.calculateTaskSuccessProbability(task, gameStore.humanPlayerInterface.id, investment)
  } catch (error) {
    console.error('Error calculating success probability:', error)
    return 0
  }
}

async function submitHumanActions() {
  if (!gameSession.value || !gameStore.humanPlayerInterface) return

  try {
    const actions: PlayerActionRequest[] = []
    const taskInvestments = playerInvestments.value.get(gameStore.humanPlayerInterface.id)

    if (taskInvestments) {
      for (const [taskId, investment] of taskInvestments) {
        // Проверяем, что есть инвестиции в задачу
        const totalInvestment = Object.values(investment).reduce((sum, val) => sum + (val || 0), 0)
        if (totalInvestment > 0) {
          actions.push({
            playerId: gameStore.humanPlayerInterface.id,
            taskId: taskId,
            investment: investment
          })
        }
      }
    }

    if (actions.length > 0) {
      await gameSession.value.submitPlayerActions(gameStore.humanPlayerInterface.id, actions)
    }

    isWaitingForHumanAction.value = false
    console.log('Actions submitted successfully')
  } catch (error) {
    console.error('Error submitting actions:', error)
    alert('Ошибка при отправке действий: ' + (error as Error).message)
  }
}

function getPlayerSpecialization(player: any): string {
  if (player === gameStore.humanPlayerInterface) {
    return gameStore.humanPlayer?.specialization || 'unknown'
  }
  return player.player?.specialization || 'unknown'
}

function getPlayerPersonality(player: any): string {
  if (player === gameStore.humanPlayerInterface) {
    return 'Человек'
  }
  return player.personalityName || 'AI'
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

// Получить текущую задачу для распределения
const currentTask = computed(() => {
  // Используем полный список задач раунда, но исключаем уже назначенные
  const assignedTaskIds = new Set(distributionState.value.assignedTasks.map(a => a.taskId))
  const source = allDistributionTasks.value.length > 0 ? allDistributionTasks.value : currentTasks.value
  const unassignedTasks = source.filter(task => !assignedTaskIds.has(task.id))
  return unassignedTasks.length > 0 ? unassignedTasks[0] : null
})

// Получить распределенные задачи
const assignedTasks = computed(() => {
  const assigned = new Map<string, Task[]>()

  allPlayers.value.forEach(player => {
    assigned.set(player.id, [])
  })

  distributionState.value.assignedTasks.forEach(assignment => {
    const source = allDistributionTasks.value.length > 0 ? allDistributionTasks.value : currentTasks.value
    const task = source.find(t => t.id === assignment.taskId)
    if (task) {
      assigned.get(assignment.assignedTo)?.push(task)
    }
  })

  return assigned
})

// Проверить, завершено ли распределение
const isDistributionComplete = computed(() => {
  return distributionState.value.isComplete
})

// Получить информацию о текущем ходе
const currentTurnInfo = computed(() => {
  if (aiResult.value) {
    return `${aiActorName.value || 'Бот'} распределил задачу ${aiResult.value.taskName} игроку ${aiResult.value.playerName}`
  }

  if (isProcessingAI.value) {
    // Если есть предпросмотр — показываем полную фразу
    if (aiActorName.value && aiPreviewTaskName.value) {
      return `${aiActorName.value} распределяет задачу ${aiPreviewTaskName.value}${aiPreviewRecipientName.value ? ' игроку ' + aiPreviewRecipientName.value : ''}`
    }
    // Иначе общее сообщение
    return `${aiActorName.value || 'Бот'} распределяет задачу...`
  }

  const currentPlayerId = distributionState.value.currentPlayerId
  if (currentPlayerId === gameStore.humanPlayerInterface?.id) {
    return 'Ваш ход! Выберите кому назначить задачу'
  }

  if (isDistributionComplete.value) {
    return 'Распределение завершено!'
  }

  return 'Ожидание хода игрока...'
})
</script>

<template>
  <div class="game-session">
    <!-- GitHub-style header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">{{ currentPhase === 'task-distribution' ? 'Распределение задач' : 'Решение задач' }}</h1>
          <p class="page-description">{{ currentPhase === 'task-distribution' ? 'Распределите задачи между игроками по очереди' : 'Инвестируйте свои ресурсы в решение назначенных задач' }} - Раунд {{ currentRound }} из {{ gameSession?.settings.rounds }}</p>
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
      <!-- Task Distribution Phase -->
      <div v-if="currentPhase === 'task-distribution'">
        <!-- Current turn info -->
        <div class="turn-status">
        <div class="turn-info">
          <div class="turn-indicator">
            <div v-if="isProcessingAI" class="spinner"></div>
            <div v-else-if="aiResult" class="success-icon">✓</div>
            <div v-else-if="distributionState.currentPlayerId === gameStore.humanPlayerInterface?.id" class="user-icon">👤</div>
            <div v-else class="wait-icon">⏳</div>
          </div>
          <div class="turn-text">
            <h3>{{ currentTurnInfo }}</h3>
            <div class="turn-details">
              <span class="task-counter">Задача {{ distributionState.assignedTasks.length + 1 }} из {{ allDistributionTasks.length || currentTasks.length }}</span>
              <span class="player-name">Текущий игрок: {{ allPlayers.find(p => p.id === distributionState.currentPlayerId)?.name || 'Ожидание...' }}</span>
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
            <div class="task-number">#{{ distributionState.assignedTasks.length + 1 }}</div>
          </div>

          <div
            class="task-card"
            :class="{ 'task-card--draggable': distributionState.currentPlayerId === gameStore.humanPlayerInterface?.id }"
            :draggable="distributionState.currentPlayerId === gameStore.humanPlayerInterface?.id"
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
            <div v-if="distributionState.currentPlayerId === gameStore.humanPlayerInterface?.id" class="player-instructions">
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
              {{ distributionState.assignedTasks.length }} / {{ currentTasks.length }} распределено
            </div>
          </div>

          <div class="players-grid">
            <div
              v-for="player in allPlayers"
              :key="player.id"
              class="player-column"
              :class="{
                'player-column--current': player.id === distributionState.currentPlayerId,
                'player-column--ai': player !== gameStore.humanPlayerInterface,
                'player-column--filled': (assignedTasks.get(player.id) || []).length >= (gameStore.gameSettings?.actionsPerTurn || 5)
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
                    <span class="player-personality" :class="`personality--${player.personality || 'unknown'}`">
                      {{ getPlayerPersonality(player) }}
                    </span>
                    <span class="player-specialization">
                      {{ getSpecializationName(getPlayerSpecialization(player)) }}
                    </span>
                  </div>
                </div>
                <div class="task-count">
                  {{ (assignedTasks.get(player.id) || []).length }} / {{ gameStore.gameSettings?.actionsPerTurn || 5 }}
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

      <!-- Task Solving Phase -->
      <div v-if="currentPhase === 'task-solving'" class="task-solving-phase">
        <div class="phase-header">
          <h2>Решение задач</h2>
          <p>Инвестируйте свои ресурсы в решение назначенных задач</p>
        </div>

        <div class="solving-layout">
          <!-- Left column: Human player tasks -->
          <div class="human-tasks-section">
            <h3>Мои задачи</h3>
            <div class="tasks-list">
              <div
                v-for="task in humanPlayerTasks"
                :key="task.id"
                class="task-card"
              >
                <div class="task-header">
                  <h4>{{ task.name }}</h4>
                  <div class="task-meta">
                    <span class="task-skill">{{ getSpecializationName(task.requiredSkill) }}</span>
                    <span class="task-complexity">Сложность: {{ task.complexity }}</span>
                    <span class="task-reward">{{ task.experienceReward }} XP</span>
                  </div>
                </div>

                <div class="investment-section">
                  <h5>Инвестиции</h5>

                  <!-- Skills investment -->
                  <div class="skills-investment">
                    <div class="skill-row">
                      <label>Frontend:</label>
                      <input
                        type="range"
                        min="0"
                        :max="gameStore.humanPlayer?.skills.frontend || 0"
                        :value="getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'frontend')"
                        @input="updateInvestment(gameStore.humanPlayerInterface!.id, task.id, 'frontend', parseInt(($event.target as HTMLInputElement).value))"
                      />
                      <span>{{ getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'frontend') }}</span>
                    </div>

                    <div class="skill-row">
                      <label>Backend:</label>
                      <input
                        type="range"
                        min="0"
                        :max="gameStore.humanPlayer?.skills.backend || 0"
                        :value="getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'backend')"
                        @input="updateInvestment(gameStore.humanPlayerInterface!.id, task.id, 'backend', parseInt(($event.target as HTMLInputElement).value))"
                      />
                      <span>{{ getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'backend') }}</span>
                    </div>

                    <div class="skill-row">
                      <label>Management:</label>
                      <input
                        type="range"
                        min="0"
                        :max="gameStore.humanPlayer?.skills.management || 0"
                        :value="getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'management')"
                        @input="updateInvestment(gameStore.humanPlayerInterface!.id, task.id, 'management', parseInt(($event.target as HTMLInputElement).value))"
                      />
                      <span>{{ getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'management') }}</span>
                    </div>
                  </div>

                  <!-- Enthusiasm investment -->
                  <div class="enthusiasm-investment">
                    <label>Энтузиазм:</label>
                    <input
                      type="range"
                      min="0"
                      :max="gameStore.humanPlayer?.enthusiasm || 0"
                      :value="getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'enthusiasm')"
                      @input="updateInvestment(gameStore.humanPlayerInterface!.id, task.id, 'enthusiasm', parseInt(($event.target as HTMLInputElement).value))"
                    />
                    <span>{{ getInvestment(gameStore.humanPlayerInterface!.id, task.id, 'enthusiasm') }}</span>
                  </div>

                  <!-- Success probability -->
                  <div class="success-probability">
                    <label>Вероятность успеха:</label>
                    <div class="probability-bar">
                      <div
                        class="probability-fill"
                        :style="{ width: `${calculateSuccessProbability(task, playerInvestments.get(gameStore.humanPlayerInterface!.id)?.get(task.id) || {}) * 100}%` }"
                      ></div>
                    </div>
                    <span>{{ Math.round(calculateSuccessProbability(task, playerInvestments.get(gameStore.humanPlayerInterface!.id)?.get(task.id) || {}) * 100) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="actions">
              <button
                class="button"
                @click="submitHumanActions"
                :disabled="!isWaitingForHumanAction"
              >
                Отправить действия
              </button>
            </div>
          </div>

          <!-- Right column: Team status -->
          <div class="team-status-section">
            <h3>Статус команды</h3>
            <div class="players-status">
              <div
                v-for="player in allPlayers"
                :key="player.id"
                class="player-status"
              >
                <div class="player-header">
                  <div class="player-name clickable" @click="showPlayerProfile(player)">
                    {{ player.name }}
                  </div>
                  <div class="player-type">
                    {{ player === gameStore.humanPlayerInterface ? 'Вы' : 'AI' }}
                  </div>
                </div>

                <div class="player-tasks">
                  <div
                    v-for="task in currentTasks.filter(t => distributedTasks.get(t.id) === player.id)"
                    :key="task.id"
                    class="player-task"
                  >
                    <span class="task-name">{{ task.name }}</span>
                    <span class="task-status">В процессе</span>
                  </div>
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

/* Task Solving Phase Styles */
.task-solving-phase {
  padding: 24px;
}

.phase-header {
  text-align: center;
  margin-bottom: 32px;
}

.phase-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.phase-header p {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.solving-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1280px;
  margin: 0 auto;
}

.human-tasks-section h3,
.team-status-section h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.task-header h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 14px;
}

.task-skill {
  background-color: var(--color-accent);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.task-complexity,
.task-reward {
  color: var(--color-text-secondary);
}

.investment-section h5 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.skills-investment {
  margin-bottom: 20px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.skill-row label {
  min-width: 80px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.skill-row input[type="range"] {
  flex: 1;
  height: 6px;
  background: var(--color-border-muted);
  border-radius: 3px;
  outline: none;
}

.skill-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
}

.skill-row span {
  min-width: 30px;
  text-align: right;
  font-weight: 600;
  color: var(--color-text-primary);
}

.enthusiasm-investment {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
}

.enthusiasm-investment label {
  min-width: 80px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.enthusiasm-investment input[type="range"] {
  flex: 1;
  height: 6px;
  background: var(--color-border-muted);
  border-radius: 3px;
  outline: none;
}

.enthusiasm-investment input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
}

.enthusiasm-investment span {
  min-width: 30px;
  text-align: right;
  font-weight: 600;
  color: var(--color-text-primary);
}

.success-probability {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-bg-tertiary);
  border-radius: 8px;
}

.success-probability label {
  min-width: 120px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.probability-bar {
  flex: 1;
  height: 8px;
  background-color: var(--color-border-muted);
  border-radius: 4px;
  overflow: hidden;
}

.probability-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.success-probability span {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions {
  margin-top: 32px;
  text-align: center;
}

.team-status-section {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.player-status {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.player-status .player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.player-status .player-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.player-status .player-type {
  font-size: 12px;
  background-color: var(--color-text-tertiary);
  color: var(--color-bg-primary);
  padding: 4px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.player-tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-task {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--color-bg-primary);
  border-radius: 6px;
  font-size: 14px;
}

.task-name {
  color: var(--color-text-primary);
}

.task-status {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.player-personality {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.personality--kind {
  color: #059669;
  background-color: #d1fae5;
}

.personality--evil {
  color: #dc2626;
  background-color: #fee2e2;
}

.personality--unknown {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
}
</style>
