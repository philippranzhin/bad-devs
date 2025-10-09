import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskDistribution } from '../models/TaskDistribution';
import { AIPlayer } from '../players/AIPlayer';
import { AITaskDistributor } from '../players/AITaskDistributor';

describe('AITaskDistributor - Debug Tests', () => {
  let frontendTask: Task;
  let backendTask: Task;
  let managementTask: Task;
  let fullstackTask: Task;
  let frontendPlayer: AIPlayer;
  let backendPlayer: AIPlayer;
  let managementPlayer: AIPlayer;
  let fullstackPlayer: AIPlayer;
  let allPlayers: AIPlayer[];

  beforeEach(() => {
    // Создаем задачи
    frontendTask = new Task({
      id: 'frontend-task',
      name: 'Frontend Task',
      description: 'Create React component',
      requiredSkill: 'frontend',
      complexity: 2,
      deadline: 1,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });

    backendTask = new Task({
      id: 'backend-task',
      name: 'Backend Task',
      description: 'Create API endpoint',
      requiredSkill: 'backend',
      complexity: 3,
      deadline: 2,
      experienceReward: 15,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    });

    managementTask = new Task({
      id: 'management-task',
      name: 'Management Task',
      description: 'Plan sprint',
      requiredSkill: 'management',
      complexity: 1,
      deadline: 1,
      experienceReward: 5,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    });

    fullstackTask = new Task({
      id: 'fullstack-task',
      name: 'Fullstack Task',
      description: 'Full stack feature',
      requiredSkill: 'frontend', // Требует frontend, но может быть выполнена fullstack
      complexity: 4,
      deadline: 3,
      experienceReward: 20,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });

    // Создаем игроков с разными специализациями
    const frontendPlayerData = new Player({
      name: 'FrontendDev',
      specialization: 'frontend',
      skills: { frontend: 5, backend: 1, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const backendPlayerData = new Player({
      name: 'BackendDev',
      specialization: 'backend',
      skills: { frontend: 1, backend: 5, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const managementPlayerData = new Player({
      name: 'Manager',
      specialization: 'management',
      skills: { frontend: 1, backend: 1, management: 5, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const fullstackPlayerData = new Player({
      name: 'FullstackDev',
      specialization: 'fullstack',
      skills: { frontend: 4, backend: 4, management: 2, techBase: 3, softSkills: 3 },
      enthusiasm: 10
    });

    frontendPlayer = new AIPlayer(frontendPlayerData);
    backendPlayer = new AIPlayer(backendPlayerData);
    managementPlayer = new AIPlayer(managementPlayerData);
    fullstackPlayer = new AIPlayer(fullstackPlayerData);

    allPlayers = [frontendPlayer, backendPlayer, managementPlayer, fullstackPlayer];
  });

  describe('Task Fit Score Analysis', () => {
    it('should calculate correct fit scores for all players and tasks', () => {
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');
      
      console.log('\n=== TASK FIT SCORES ===');
      
      const tasks = [frontendTask, backendTask, managementTask, fullstackTask];
      const players = [frontendPlayer, backendPlayer, managementPlayer, fullstackPlayer];
      
      tasks.forEach(task => {
        console.log(`\nTask: ${task.name} (${task.requiredSkill}, complexity: ${task.complexity})`);
        players.forEach(player => {
          const score = (distributor as any).calculateTaskFitScore(task, player);
          const playerName = player.name;
          const specialization = (player as any).player.specialization;
          console.log(`  ${playerName} (${specialization}): ${score.toFixed(2)}`);
        });
      });
    });
  });

  describe('Task Selection Analysis', () => {
    it('should show which task each bot would choose', () => {
      const availableTasks = [frontendTask, backendTask, managementTask, fullstackTask];
      
      console.log('\n=== TASK SELECTION BY BOTS ===');
      
      allPlayers.forEach(player => {
        const distributor = new AITaskDistributor(player, 'kind');
        const selectedTask = (distributor as any).selectBestTaskForPlayer(
          availableTasks,
          player.id,
          allPlayers
        );
        const playerName = player.name;
        const specialization = (player as any).player.specialization;
        console.log(`${playerName} (${specialization}) выбирает: ${selectedTask.name} (${selectedTask.requiredSkill})`);
      });
    });
  });

  describe('Kind Bot Distribution Analysis', () => {
    it('should show how kind bots distribute tasks', async () => {
      const availableTasks = [frontendTask, backendTask, managementTask, fullstackTask];
      
      console.log('\n=== KIND BOT DISTRIBUTION ===');
      
      for (const player of allPlayers) {
        const distributor = new AITaskDistributor(player, 'kind');
        const choice = await distributor.selectTaskAssignment(
          availableTasks,
          player.id,
          allPlayers,
          undefined
        );
        
        const selectedTask = availableTasks.find(t => t.id === choice.taskId);
        const assignedToPlayer = allPlayers.find(p => p.id === choice.assignedTo);
        
        console.log(`${player.name} (${(player as any).player.specialization})`);
        console.log(`  Выбирает задачу: ${selectedTask?.name} (${selectedTask?.requiredSkill})`);
        console.log(`  Назначает игроку: ${assignedToPlayer?.name} (${(assignedToPlayer as any).player.specialization})`);
        console.log('');
      }
    });
  });

  describe('Evil Bot Distribution Analysis', () => {
    it('should show how evil bots distribute tasks', async () => {
      const availableTasks = [frontendTask, backendTask, managementTask, fullstackTask];
      
      console.log('\n=== EVIL BOT DISTRIBUTION ===');
      
      for (const player of allPlayers) {
        const distributor = new AITaskDistributor(player, 'evil');
        const choice = await distributor.selectTaskAssignment(
          availableTasks,
          player.id,
          allPlayers,
          undefined
        );
        
        const selectedTask = availableTasks.find(t => t.id === choice.taskId);
        const assignedToPlayer = allPlayers.find(p => p.id === choice.assignedTo);
        
        console.log(`${player.name} (${(player as any).player.specialization})`);
        console.log(`  Выбирает задачу: ${selectedTask?.name} (${selectedTask?.requiredSkill})`);
        console.log(`  Назначает игроку: ${assignedToPlayer?.name} (${(assignedToPlayer as any).player.specialization})`);
        console.log('');
      }
    });
  });

  describe('Best/Worst Player Analysis', () => {
    it('should show who is best and worst for each task', () => {
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');
      const tasks = [frontendTask, backendTask, managementTask, fullstackTask];
      
      console.log('\n=== BEST/WORST PLAYERS FOR TASKS ===');
      
      tasks.forEach(task => {
        const bestPlayer = (distributor as any).findBestPlayerForTask(task, allPlayers);
        const worstPlayer = (distributor as any).findWorstPlayerForTask(task, allPlayers);
        
        console.log(`\nTask: ${task.name} (${task.requiredSkill})`);
        console.log(`  Лучший игрок: ${bestPlayer.name} (${(bestPlayer as any).player.specialization})`);
        console.log(`  Худший игрок: ${worstPlayer.name} (${(worstPlayer as any).player.specialization})`);
      });
    });
  });

  describe('Real Scenario Test', () => {
    it('should simulate real game scenario with human player', async () => {
      // Симулируем сценарий: человек играет за fullstack, боты за frontend, backend, management
      const humanPlayer = fullstackPlayer; // Человек играет за fullstack
      const aiPlayers = [frontendPlayer, backendPlayer, managementPlayer];
      const availableTasks = [frontendTask, backendTask, managementTask];
      
      console.log('\n=== REAL SCENARIO TEST ===');
      console.log(`Человек: ${humanPlayer.name} (${(humanPlayer as any).player.specialization})`);
      console.log('AI игроки:', aiPlayers.map(p => `${p.name} (${(p as any).player.specialization})`).join(', '));
      console.log('Доступные задачи:', availableTasks.map(t => `${t.name} (${t.requiredSkill})`).join(', '));
      console.log('');
      
      for (const aiPlayer of aiPlayers) {
        // Тестируем доброго бота
        const kindDistributor = new AITaskDistributor(aiPlayer, 'kind');
        const kindChoice = await kindDistributor.selectTaskAssignment(
          availableTasks,
          aiPlayer.id,
          [humanPlayer, ...aiPlayers],
          undefined
        );
        
        const selectedTask = availableTasks.find(t => t.id === kindChoice.taskId);
        const assignedToPlayer = [humanPlayer, ...aiPlayers].find(p => p.id === kindChoice.assignedTo);
        
        console.log(`Добрый ${aiPlayer.name} (${(aiPlayer as any).player.specialization}):`);
        console.log(`  Выбирает: ${selectedTask?.name} (${selectedTask?.requiredSkill})`);
        console.log(`  Назначает: ${assignedToPlayer?.name} (${(assignedToPlayer as any).player.specialization})`);
        
        // Проверяем, взял ли бот задачу себе
        if (kindChoice.assignedTo === aiPlayer.id) {
          console.log(`  ✅ Бот взял задачу себе`);
        } else {
          console.log(`  ❌ Бот НЕ взял задачу себе`);
        }
        console.log('');
      }
    });
  });

  describe('Task Limit Impact Test', () => {
    it('should show how task limits affect distribution', async () => {
      const availableTasks = [frontendTask, backendTask, managementTask];
      const taskDistribution = new TaskDistribution(1, availableTasks, 2); // Лимит 2 задачи на игрока
      
      console.log('\n=== TASK LIMIT IMPACT TEST ===');
      console.log('Лимит задач: 2 на игрока');
      console.log('');
      
      // Симулируем, что у frontendPlayer уже есть 2 задачи
      taskDistribution.assignTask(frontendTask.id, frontendPlayer.id, frontendPlayer.id);
      taskDistribution.assignTask(backendTask.id, frontendPlayer.id, frontendPlayer.id);
      
      console.log(`У ${frontendPlayer.name} уже есть 2 задачи (лимит достигнут)`);
      console.log('');
      
      for (const player of [backendPlayer, managementPlayer]) {
        const distributor = new AITaskDistributor(player, 'kind');
        const choice = await distributor.selectTaskAssignment(
          availableTasks,
          player.id,
          allPlayers,
          taskDistribution
        );
        
        const selectedTask = availableTasks.find(t => t.id === choice.taskId);
        const assignedToPlayer = allPlayers.find(p => p.id === choice.assignedTo);
        
        console.log(`${player.name} (${(player as any).player.specialization}):`);
        console.log(`  Выбирает: ${selectedTask?.name} (${selectedTask?.requiredSkill})`);
        console.log(`  Назначает: ${assignedToPlayer?.name} (${(assignedToPlayer as any).player.specialization})`);
        console.log('');
      }
    });
  });
});

