import type {
    AIPlayer,
    GameSession,
    GameSettings,
    HumanPlayer,
    Player,
    Project,
    RoundResult
} from 'bad-devs-gameengine'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  // Game state
  const gameSettings = ref<GameSettings | null>(null)
  const humanPlayer = ref<Player | null>(null)
  const currentProject = ref<Project | null>(null)
  const gameSession = ref<GameSession | null>(null)
  const currentPhase = ref<'character' | 'project-selection' | 'game-session' | 'round-results' | 'project-results'>('character')
  const roundResult = ref<RoundResult | null>(null)

  // Player interfaces
  const humanPlayerInterface = ref<HumanPlayer | null>(null)
  const aiPlayers = ref<AIPlayer[]>([])

  // Computed
  const isGameActive = computed(() => gameSession.value?.isActive ?? false)
  const currentRound = computed(() => gameSession.value?.currentRound ?? 1)
  const projectProgress = computed(() => currentProject.value?.currentProgress ?? { frontend: 0, backend: 0, management: 0 })
  const isProjectCompleted = computed(() => currentProject.value?.isCompleted ?? false)

  // Actions
  function setGameSettings(settings: GameSettings) {
    gameSettings.value = settings
  }

  function setHumanPlayer(player: Player) {
    humanPlayer.value = player
  }

  function setCurrentProject(project: Project) {
    currentProject.value = project
  }

  function setGameSession(session: GameSession) {
    gameSession.value = session
  }

  function setCurrentPhase(phase: typeof currentPhase.value) {
    currentPhase.value = phase
  }

  function setHumanPlayerInterface(interface_: HumanPlayer) {
    humanPlayerInterface.value = interface_
  }

  function setAIPlayers(players: AIPlayer[]) {
    aiPlayers.value = players
  }

  function setRoundResult(result: RoundResult) {
    roundResult.value = result
  }

  function resetGame() {
    gameSettings.value = null
    humanPlayer.value = null
    currentProject.value = null
    gameSession.value = null
    currentPhase.value = 'character'
    humanPlayerInterface.value = null
    aiPlayers.value = []
    roundResult.value = null
  }

  return {
    // State
    gameSettings,
    humanPlayer,
    currentProject,
    gameSession,
    currentPhase,
    humanPlayerInterface,
    aiPlayers,
    roundResult,

    // Computed
    isGameActive,
    currentRound,
    projectProgress,
    isProjectCompleted,

    // Actions
    setGameSettings,
    setHumanPlayer,
    setCurrentProject,
    setGameSession,
    setCurrentPhase,
    setHumanPlayerInterface,
    setAIPlayers,
    setRoundResult,
    resetGame
  }
})
