/**
 * Простой тест для проверки экспортов из GameEngine
 * Этот файл находится вне директории GameEngine для проверки корректности экспортов
 */

import {
  AbilityGenerator,
  AbilityService,
  AbilityType,
  // Player Implementations
  AIPlayer,
  AITaskDistributor,
  // Core Models
  GameSession,
  GameSettings,
  HumanPlayer,
  HumanTaskDistributor,
  Player,
  // Interfaces
  PlayerInterface,
  // Types
  PlayerSpecialization,
  Project,
  SkillType,
  Task,
  TaskGenerator,
  // Services
  TaskSolver
} from './GameEngine/src/index';

// Тест создания основных классов
function testCoreModels() {
  console.log('Testing Core Models...');

  // Тест создания GameSettings
  const settings = new GameSettings();
  console.log('✓ GameSettings created successfully');

  // Тест создания Player
  const player = new Player({
    name: 'Test Player',
    specialization: 'frontend' as PlayerSpecialization,
    skills: {
      frontend: 5,
      backend: 3,
      management: 2,
      techBase: 4,
      softSkills: 3
    },
    enthusiasm: 80,
    level: 1,
    experience: 0,
    money: 1000,
    abilities: []
  });
  console.log('✓ Player created successfully');

  // Тест создания Project
  const project = new Project({
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    requiredLevel: 1,
    requirements: {
      frontend: 10,
      backend: 8,
      management: 5
    },
    rewards: {
      baseSalary: 5000,
      bonusMultiplier: 1.2,
      experienceReward: 100
    }
  });
  console.log('✓ Project created successfully');

  // Тест создания Task
  const task = new Task({
    id: 'task-1',
    name: 'Test Task',
    description: 'A test task',
    requiredSkill: 'frontend' as SkillType,
    complexity: 3,
    deadline: 2,
    experienceReward: 50,
    contributesToCommonGoal: true,
    commonGoalSkill: 'frontend' as SkillType
  });
  console.log('✓ Task created successfully');

  return { settings, player, project, task };
}

// Тест создания сервисов
function testServices(settings: GameSettings) {
  console.log('Testing Services...');

  const taskSolver = new TaskSolver(settings);
  console.log('✓ TaskSolver created successfully');

  const taskGenerator = new TaskGenerator(settings);
  console.log('✓ TaskGenerator created successfully');

  const abilityGenerator = new AbilityGenerator(settings);
  console.log('✓ AbilityGenerator created successfully');

  const abilityService = new AbilityService(settings);
  console.log('✓ AbilityService created successfully');

  return { taskSolver, taskGenerator, abilityGenerator, abilityService };
}

// Тест создания игроков
function testPlayers(player: Player) {
  console.log('Testing Players...');

  const aiPlayer = new AIPlayer(player);
  console.log('✓ AIPlayer created successfully');

  const humanPlayer = new HumanPlayer(player);
  console.log('✓ HumanPlayer created successfully');

  const aiDistributor = new AITaskDistributor(aiPlayer);
  console.log('✓ AITaskDistributor created successfully');

  const humanDistributor = new HumanTaskDistributor(humanPlayer);
  console.log('✓ HumanTaskDistributor created successfully');

  return { aiPlayer, humanPlayer, aiDistributor, humanDistributor };
}

// Тест создания GameSession
function testGameSession(settings: GameSettings, players: PlayerInterface[]) {
  console.log('Testing GameSession...');

  const gameSession = new GameSession({
    id: 'test-session',
    players,
    settings,
    maxPlayers: 4,
    project: new Project({
      id: 'project-1',
      name: 'Test Project',
      description: 'A test project',
      requiredLevel: 1,
      requirements: {
        frontend: 10,
        backend: 8,
        management: 5
      },
      rewards: {
        baseSalary: 5000,
        bonusMultiplier: 1.2,
        experienceReward: 100
      }
    })
  });

  console.log('✓ GameSession created successfully');
  return gameSession;
}

// Основная функция тестирования
function runExportTests() {
  console.log('🚀 Starting GameEngine Export Tests...\n');

  try {
    // Тест основных моделей
    const { settings, player, project, task } = testCoreModels();
    console.log('');

    // Тест сервисов
    const services = testServices(settings);
    console.log('');

    // Тест игроков
    const players = testPlayers(player);
    console.log('');

    // Тест GameSession
    const gameSession = testGameSession(settings, [players.aiPlayer, players.humanPlayer]);
    console.log('');

    // Проверка типов
    console.log('Testing Types...');
    const specialization: PlayerSpecialization = 'frontend';
    const skillType: SkillType = 'frontend';
    const abilityType: AbilityType = 'frontend';
    console.log('✓ Types imported successfully');
    console.log('');

    console.log('🎉 All exports working correctly!');
    console.log('\nSummary:');
    console.log('- Core Models: ✓');
    console.log('- Services: ✓');
    console.log('- Players: ✓');
    console.log('- GameSession: ✓');
    console.log('- Types & Interfaces: ✓');

  } catch (error) {
    console.error('❌ Export test failed:', error);
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  runExportTests();
}

export { runExportTests };
