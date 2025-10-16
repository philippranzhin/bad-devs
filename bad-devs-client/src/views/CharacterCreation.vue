<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import {
    GameSettings,
    HumanPlayer,
    Player
} from 'bad-devs-gameengine'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const gameStore = useGameStore()

// Character creation form
const characterForm = reactive({
  name: '',
  specialization: 'frontend' as 'frontend' | 'backend' | 'management' | 'fullstack'
})

// Game settings form
const settingsForm = reactive({
  rounds: 5,
  startingSkills: 10,
  enthusiasmPoints: 10,
  actionsPerTurn: 5,
  difficultyLevel: 5,
  allowUnlimitedActions: false
})

function createCharacterAndStartGame() {
  if (!characterForm.name) {
    alert('Пожалуйста, введите имя персонажа.')
    return
  }

  // Create GameSettings
  const gameSettings = new GameSettings({
    rounds: settingsForm.rounds,
    startingSkills: settingsForm.startingSkills,
    enthusiasmPoints: settingsForm.enthusiasmPoints,
    actionsPerTurn: settingsForm.actionsPerTurn,
    difficultyLevel: settingsForm.difficultyLevel,
    allowUnlimitedActions: settingsForm.allowUnlimitedActions
  })

  // Create Player
  const player = new Player({
    name: characterForm.name,
    specialization: characterForm.specialization,
    skills: gameSettings.getDefaultSkillsForSpecialization(characterForm.specialization),
    enthusiasm: gameSettings.enthusiasmPoints,
    level: 1,
    experience: 0,
    money: 0,
    abilities: []
  })

  // Create human player interface
  const humanPlayerInterface = new HumanPlayer(player)

  // Store in game store
  gameStore.setGameSettings(gameSettings)
  gameStore.setHumanPlayer(player)
  gameStore.setHumanPlayerInterface(humanPlayerInterface)
  gameStore.setCurrentPhase('project-selection')

  // Navigate to project selection
  router.push('/project-selection')
}

function getSpecializationName(specialization: string): string {
  const names: Record<string, string> = {
    frontend: 'Frontend-разработчик',
    backend: 'Backend-разработчик',
    management: 'Менеджер проекта',
    fullstack: 'Fullstack-разработчик'
  }
  return names[specialization] || specialization
}

function getSkillValue(skill: string): number {
  // Простая логика для предварительного просмотра
  const specialization = characterForm.specialization
  if (skill === specialization) return 4
  if (specialization === 'fullstack') return 3
  return 1
}

function getDifficultyText(level: number): string {
  if (level <= 2) return 'Легкая'
  if (level <= 5) return 'Средняя'
  if (level <= 8) return 'Сложная'
  return 'Экстремальная'
}
</script>

<template>
  <div class="character-creation">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Создание персонажа</h2>
        <p class="card-subtitle">Начните свое приключение в мире IT!</p>
      </div>

      <form @submit.prevent="createCharacterAndStartGame">
        <div class="form-layout">
          <!-- Левая колонка: персонаж -->
          <div class="character-section">
            <h3 class="section-title">Информация о персонаже</h3>

            <div class="form-group">
              <label for="characterName" class="form-label">Имя персонажа</label>
              <input
                type="text"
                id="characterName"
                v-model="characterForm.name"
                class="form-input"
                placeholder="Введите имя"
                required
              />
            </div>

            <div class="form-group">
              <label for="specialization" class="form-label">Специализация</label>
              <select id="specialization" v-model="characterForm.specialization" class="form-select">
                <option value="frontend">Frontend-разработчик</option>
                <option value="backend">Backend-разработчик</option>
                <option value="management">Менеджер проекта</option>
                <option value="fullstack">Fullstack-разработчик</option>
              </select>
            </div>

            <!-- Предварительный просмотр персонажа -->
            <div class="character-preview">
              <h4>Предварительный просмотр</h4>
              <div class="preview-card">
                <div class="preview-name">{{ characterForm.name || 'Имя персонажа' }}</div>
                <div class="preview-specialization">{{ getSpecializationName(characterForm.specialization) }}</div>
                <div class="preview-skills">
                  <div class="skill-preview">
                    <span>Frontend:</span>
                    <span>{{ getSkillValue('frontend') }}</span>
                  </div>
                  <div class="skill-preview">
                    <span>Backend:</span>
                    <span>{{ getSkillValue('backend') }}</span>
                  </div>
                  <div class="skill-preview">
                    <span>Management:</span>
                    <span>{{ getSkillValue('management') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Правая колонка: настройки -->
          <div class="settings-section">
            <h3 class="section-title">Настройки игры</h3>

            <div class="settings-grid">
              <div class="settings-column">
                <div class="form-group">
                  <label for="rounds" class="form-label">Количество раундов: {{ settingsForm.rounds }}</label>
                  <input
                    type="range"
                    id="rounds"
                    v-model.number="settingsForm.rounds"
                    min="1"
                    max="10"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="startingSkills" class="form-label">Начальные очки навыков: {{ settingsForm.startingSkills }}</label>
                  <input
                    type="range"
                    id="startingSkills"
                    v-model.number="settingsForm.startingSkills"
                    min="5"
                    max="20"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="enthusiasmPoints" class="form-label">Очки энтузиазма за раунд: {{ settingsForm.enthusiasmPoints }}</label>
                  <input
                    type="range"
                    id="enthusiasmPoints"
                    v-model.number="settingsForm.enthusiasmPoints"
                    min="5"
                    max="20"
                    class="form-input"
                  />
                </div>
              </div>

              <div class="settings-column">
                <div class="form-group">
                  <label for="actionsPerTurn" class="form-label">Действий за ход: {{ settingsForm.actionsPerTurn }}</label>
                  <input
                    type="range"
                    id="actionsPerTurn"
                    v-model.number="settingsForm.actionsPerTurn"
                    min="1"
                    max="10"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="difficultyLevel" class="form-label">Уровень сложности: {{ settingsForm.difficultyLevel }}</label>
                  <input
                    type="range"
                    id="difficultyLevel"
                    v-model.number="settingsForm.difficultyLevel"
                    min="0"
                    max="10"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="settingsForm.allowUnlimitedActions"
                      class="checkbox-input"
                    />
                    <span class="checkbox-text">Разрешить неограниченные действия</span>
                  </label>
                  <p class="setting-description">
                    Позволяет инвестировать навыки во все задачи игрока, игнорируя ограничение по количеству действий за ход
                  </p>
                </div>
              </div>
            </div>

            <!-- Краткое описание настроек -->
            <div class="settings-summary">
              <h4>Краткое описание</h4>
              <div class="summary-item">
                <span>Длительность игры:</span>
                <span>{{ settingsForm.rounds }} раундов</span>
              </div>
              <div class="summary-item">
                <span>Сложность:</span>
                <span>{{ getDifficultyText(settingsForm.difficultyLevel) }}</span>
              </div>
              <div class="summary-item">
                <span>Действий за ход:</span>
                <span>{{ settingsForm.actionsPerTurn }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button type="submit" class="button">Начать игру</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.character-creation {
  max-width: 1280px;
  margin: 0 auto;
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.character-section,
.settings-section {
  display: flex;
  flex-direction: column;
}

.section-title {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 16px;
}

.character-preview {
  margin-top: 24px;
}

.character-preview h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.preview-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
}

.preview-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.preview-specialization {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.preview-skills {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.skill-preview span:first-child {
  color: var(--color-text-secondary);
}

.skill-preview span:last-child {
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.settings-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-summary {
  margin-top: 24px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
}

.settings-summary h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.summary-item span:first-child {
  color: var(--color-text-secondary);
}

.summary-item span:last-child {
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions {
  margin-top: 32px;
  text-align: center;
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-primary);
}

.checkbox-input {
  margin: 0;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.checkbox-text {
  font-weight: 500;
  line-height: 1.4;
}

.setting-description {
  margin: 8px 0 0 30px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}
</style>
