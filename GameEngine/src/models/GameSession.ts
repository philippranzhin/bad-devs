import { PlayerAction, PlayerActionRequest, PlayerInterface } from '../interfaces/PlayerInterface';
import { AITaskDistributor } from '../players/AITaskDistributor';
import { HumanPlayer } from '../players/HumanPlayer';
import { TaskGenerator } from '../services/TaskGenerator';
import { TaskSolver } from '../services/TaskSolver';
import { BotPersonality } from '../types/BotPersonality';
import { GameRound } from './GameRound';
import { GameSettings } from './GameSettings';
import { Player } from './Player';
import { Project, ProjectProgress } from './Project';
import { Task } from './Task';
import { TaskDistribution, TaskDistributionInterface } from './TaskDistribution';

export interface RoundResult {
  roundNumber: number;
  playerActions: PlayerAction[];
  projectProgress: ProjectProgress;
  isProjectCompleted: boolean;
  nextRoundTasks: Task[];
  currentRoundTasks: Task[]; // Добавляем задачи текущего раунда
}

export class GameSession {
  public readonly id: string;
  public readonly project: Project;
  public readonly players: Player[]; // Оригинальные Player объекты для расчетов
  public readonly playerInterfaces: PlayerInterface[]; // Интерфейсы для взаимодействия
  public readonly settings: GameSettings;
  public currentRound: number;
  public isActive: boolean;
  public readonly maxPlayers: number;

  private rounds: GameRound[] = [];
  private currentRoundObj: GameRound | null = null;
  private taskGenerator: TaskGenerator;
  private playerEnthusiasm: Map<string, number> = new Map();
  private taskDistributors: TaskDistributionInterface[] = [];
  private currentTaskDistribution: TaskDistribution | null = null;
  private unresolvedTasks: Task[] = []; // Невыполненные задачи из предыдущих раундов
  private playerUnresolvedTasks: Map<string, Task[]> = new Map(); // Невыполненные задачи по игрокам
  private unresolvedTaskActions: Map<string, PlayerAction[]> = new Map(); // Действия по невыполненным задачам

  constructor(config: {
    id: string;
    project: Project;
    players: PlayerInterface[];
    settings: GameSettings;
    maxPlayers: number;
  }) {
    this.id = config.id;
    this.project = config.project;
    this.settings = config.settings;
    this.maxPlayers = config.maxPlayers;
    this.currentRound = 1;
    this.isActive = true;
    this.taskGenerator = new TaskGenerator(this.settings);

    // Валидация игроков
    this.validatePlayers(config.players);
    this.playerInterfaces = [...config.players];

    // Извлекаем оригинальные Player объекты из интерфейсов
    this.players = this.extractOriginalPlayers(config.players);

    // Создаем распределители задач для каждого игрока
    this.taskDistributors = this.createTaskDistributors(config.players);

    this.initializePlayerEnthusiasm();
  }

  private validatePlayers(players: PlayerInterface[]): void {
    if (players.length === 0) {
      throw new Error('Game session must have at least one player');
    }
    if (players.length > this.maxPlayers) {
      throw new Error(`Cannot have more than ${this.maxPlayers} players`);
    }

    // Проверяем уровень игроков
    const originalPlayers = this.extractOriginalPlayers(players);
    for (const player of originalPlayers) {
      if (player.getLevel() < this.project.requiredLevel) {
        throw new Error(`Player ${player.name} level ${player.getLevel()} is too low for project requiring level ${this.project.requiredLevel}`);
      }
    }
  }

  private extractOriginalPlayers(playerInterfaces: PlayerInterface[]): Player[] {
    const players: Player[] = [];

    for (const playerInterface of playerInterfaces) {
      // Для AI игроков извлекаем оригинальный Player
      if ('player' in playerInterface) {
        players.push((playerInterface as any).player);
      } else {
        // Для Human игроков тоже извлекаем оригинальный Player
        players.push((playerInterface as any).player);
      }
    }

    return players;
  }

  private createTaskDistributors(playerInterfaces: PlayerInterface[]): TaskDistributionInterface[] {
    // Создаем распределители с случайными личностями для AI игроков
    const personalities: BotPersonality[] = ['kind', 'evil'];

    return playerInterfaces.map(player => {
      // Для AI игроков создаем распределители с случайной личностью
      if ('player' in player) {
        const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
        return new AITaskDistributor(player, randomPersonality);
      } else {
        // Для Human игроков используем добрую личность по умолчанию
        return new AITaskDistributor(player, 'kind');
      }
    });
  }

  private initializePlayerEnthusiasm(): void {
    this.playerInterfaces.forEach(player => {
      this.playerEnthusiasm.set(player.id, this.settings.enthusiasmPoints);
    });
  }

  // 🎮 Основной метод управления раундом
  public async executeRound(): Promise<RoundResult> {
    // 1. Создаем фазу распределения задач
    const taskDistribution = await this.executeTaskDistribution();

    // 2. Создаем раунд с назначенными задачами
    const round = this.startNewRound(taskDistribution);

    // 3. Уведомляем всех игроков о начале раунда
    this.notifyPlayersRoundStart(round);

    // 4. Запрашиваем действия у всех игроков
    const playerActions = await this.collectPlayerActions(round);

    // 5. Выполняем все действия
    const results = this.executePlayerActions(playerActions);

    // 6. Обновляем прогресс проекта
    const projectProgress = this.updateProjectProgress(results);

    // 7. Уведомляем игроков о результатах
    this.notifyPlayersRoundEnd(round, results);
    this.notifyPlayersProjectProgress(projectProgress);

    // 8. Завершаем раунд
    this.completeCurrentRound();

    // 9. Увеличиваем номер раунда
    this.currentRound++;

    return {
      roundNumber: round.roundNumber,
      playerActions: results,
      projectProgress,
      isProjectCompleted: this.project.isProjectCompleted(),
      nextRoundTasks: this.getUnresolvedTasks(),
      currentRoundTasks: [...round.tasks]
    };
  }

  // 🎯 Получение результатов текущего раунда (для UI)
  public getCurrentRoundResult(): RoundResult | null {
    if (!this.currentRoundObj || !this.currentRoundObj.isCompleted) {
      return null;
    }

    const results = this.currentRoundObj.actions;
    const projectProgress = this.updateProjectProgress(results);

    return {
      roundNumber: this.currentRoundObj.roundNumber,
      playerActions: results,
      projectProgress,
      isProjectCompleted: this.project.isProjectCompleted(),
      nextRoundTasks: this.getUnresolvedTasks(),
      currentRoundTasks: [...this.currentRoundObj.tasks]
    };
  }

  // 🎯 Выполнение фазы распределения задач
  private async executeTaskDistribution(): Promise<TaskDistribution> {
    // Генерируем только новые задачи для раунда
    const newTasks = this.taskGenerator.generateTasksForRound(
      this.currentRound,
      this.playerInterfaces.length
    );

    // Создаем фазу распределения только с новыми задачами
    const distribution = new TaskDistribution(
      this.currentRound,
      newTasks,
      this.settings.actionsPerTurn
    );

    // Сохраняем текущее распределение для клиента
    this.currentTaskDistribution = distribution;

    // Выполняем распределение по очереди
    while (!distribution.isDistributionComplete(this.playerInterfaces)) {
      const currentPlayerId = distribution.getCurrentPlayerId(this.playerInterfaces);
      if (!currentPlayerId) break;

      const availableTasks = distribution.getAvailableTasks();
      if (availableTasks.length === 0) break;

      // Находим распределителя для текущего игрока
      const distributor = this.taskDistributors.find(d => d.id === currentPlayerId);
      if (!distributor) {
        throw new Error(`No task distributor found for player ${currentPlayerId}`);
      }

      // Получаем выбор игрока
      const choice = await distributor.selectTaskAssignment(
        availableTasks,
        currentPlayerId,
        this.playerInterfaces,
        this.currentTaskDistribution
      );

      // Назначаем задачу
      distribution.assignTask(choice.taskId, choice.assignedTo, currentPlayerId);
    }

    distribution.completeDistribution();
    return distribution;
  }

  // 📢 Уведомление игроков о начале раунда
  private notifyPlayersRoundStart(round: GameRound): void {
    this.playerInterfaces.forEach(player => {
      player.onRoundStart(round.roundNumber, round.tasks);
    });
  }

  // 📢 Уведомление игроков о результатах раунда
  private notifyPlayersRoundEnd(round: GameRound, results: PlayerAction[]): void {
    this.playerInterfaces.forEach(player => {
      const playerResults = results.filter(r => r.playerId === player.id);
      player.onRoundEnd(round.roundNumber, playerResults);
    });
  }

  // 📢 Уведомление игроков о прогрессе проекта
  private notifyPlayersProjectProgress(progress: ProjectProgress): void {
    this.playerInterfaces.forEach(player => {
      player.onProjectProgress(progress);
    });
  }

  // 🤝 Сбор действий от всех игроков
  private async collectPlayerActions(round: GameRound): Promise<PlayerActionRequest[]> {
    const allActions: PlayerActionRequest[] = [];

    for (const player of this.playerInterfaces) {
      const currentEnthusiasm = this.playerEnthusiasm.get(player.id) || 0;

      // Получаем только задачи этого игрока
      const playerTasks = this.getPlayerTasksForRound(player.id, round);

      const playerActions = await player.selectActions(
        playerTasks, // Только задачи этого игрока
        this.settings.actionsPerTurn,
        currentEnthusiasm
      );
      allActions.push(...playerActions);
    }

    return allActions;
  }

  // Получение задач конкретного игрока для раунда
  private getPlayerTasksForRound(playerId: string, round: GameRound): Task[] {
    // Пока что возвращаем все задачи раунда
    // В будущем здесь будет логика фильтрации по назначенным задачам
    return round.tasks;
  }

  // ⚡ Выполнение всех действий
  private executePlayerActions(actions: PlayerActionRequest[]): PlayerAction[] {
    const results: PlayerAction[] = [];

    for (const action of actions) {
      const result = this.executeSingleAction(action);
      results.push(result);
    }

    return results;
  }

  // 🎯 Выполнение одного действия
  private executeSingleAction(action: PlayerActionRequest): PlayerAction {
    const playerInterface = this.playerInterfaces.find(p => p.id === action.playerId);

    // Сначала ищем в задачах текущего раунда
    let task = this.currentRoundObj?.tasks.find((t: Task) => t.id === action.taskId);

    // Если не найдена, ищем в невыполненных задачах игрока
    if (!task) {
      const unresolvedTasks = this.playerUnresolvedTasks.get(action.playerId) || [];
      task = unresolvedTasks.find((t: Task) => t.id === action.taskId);
    }

    if (!playerInterface || !task) {
      throw new Error('Player or task not found');
    }

    // Находим оригинального Player для расчетов
    const originalPlayer = this.players.find(p => p.name === action.playerId);
    if (!originalPlayer) {
      throw new Error('Original player not found');
    }

    // Рассчитываем успех
    const taskSolver = new TaskSolver(this.settings);
    const successProbability = taskSolver.calculateSuccessProbability(task, originalPlayer, action.investment);
    const success = Math.random() < successProbability;

    // Создаем результат
    const result: PlayerAction = {
      playerId: action.playerId,
      taskId: action.taskId,
      investment: action.investment,
      success,
      pointsEarned: success ? task.complexity : 0,
      enthusiasmSpent: action.investment.enthusiasm || 0
    };

    // Обновляем энтузиазм игрока
    if (result.enthusiasmSpent > 0) {
      const currentEnthusiasm = this.playerEnthusiasm.get(action.playerId) || 0;
      this.playerEnthusiasm.set(action.playerId, currentEnthusiasm - result.enthusiasmSpent);
    }

    return result;
  }

  // 🎯 Создание нового раунда с назначенными задачами
  private startNewRound(taskDistribution: TaskDistribution): GameRound {
    // Получаем все назначенные задачи
    const allAssignedTasks: Task[] = [];
    const summary = taskDistribution.getDistributionSummary();

    for (const playerId in summary) {
      allAssignedTasks.push(...summary[playerId]);
    }

    const round = new GameRound(
      this.currentRound,
      allAssignedTasks,
      this.settings.actionsPerTurn
    );

    this.currentRoundObj = round;
    this.rounds.push(round);

    return round;
  }

  // ✅ Завершение текущего раунда
  private completeCurrentRound(): void {
    if (this.currentRoundObj) {
      this.currentRoundObj.completeRound();
      this.currentRoundObj = null;
    }
  }

  // 📊 Обновление прогресса проекта
  private updateProjectProgress(results: PlayerAction[]): ProjectProgress {
    const progress: ProjectProgress = {
      frontend: 0,
      backend: 0,
      management: 0
    };

    for (const result of results) {
      if (result.success) {
        const task = this.currentRoundObj?.tasks.find((t: Task) => t.id === result.taskId);
        if (task && task.contributesToCommonGoal && task.commonGoalSkill) {
          const skillType = task.commonGoalSkill as 'frontend' | 'backend' | 'management';
          progress[skillType] += result.pointsEarned;
        }
      }
    }

    // Обновляем проект только если он еще не завершен
    if (!this.project.isCompleted) {
      this.project.addProgress('frontend', progress.frontend);
      this.project.addProgress('backend', progress.backend);
      this.project.addProgress('management', progress.management);
    }

    return progress;
  }

  // 🔍 Получение нерешенных задач
  private getUnresolvedTasks(): Task[] {
    if (!this.currentRoundObj) return [];

    const resolvedTaskIds = this.currentRoundObj.actions
      .filter((action: PlayerAction) => action.success)
      .map((action: PlayerAction) => action.taskId);

    const unresolvedTasks = this.currentRoundObj.tasks.filter((task: Task) =>
      !resolvedTaskIds.includes(task.id)
    );

    console.log('🔍 getUnresolvedTasks:');
    console.log('  Total tasks in round:', this.currentRoundObj.tasks.length);
    console.log('  Resolved task IDs:', resolvedTaskIds);
    console.log('  Unresolved tasks:', unresolvedTasks.length);
    console.log('  Unresolved task IDs:', unresolvedTasks.map(t => t.id));

    // Распределяем невыполненные задачи по игрокам
    this.distributeUnresolvedTasksToPlayers(unresolvedTasks);

    // Обновляем общий список невыполненных задач для следующего раунда
    this.unresolvedTasks = unresolvedTasks;

    return unresolvedTasks;
  }

  // Распределение невыполненных задач по игрокам
  private distributeUnresolvedTasksToPlayers(unresolvedTasks: Task[]): void {
    // Очищаем предыдущие невыполненные задачи
    this.playerUnresolvedTasks.clear();

    // Получаем назначения задач из текущего раунда
    const taskAssignments = new Map<string, Task[]>();

    if (this.currentRoundObj) {
      // Создаем карту назначений задач по игрокам
      for (const action of this.currentRoundObj.actions) {
        const task = this.currentRoundObj.tasks.find(t => t.id === action.taskId);
        if (task) {
          if (!taskAssignments.has(action.playerId)) {
            taskAssignments.set(action.playerId, []);
          }
          taskAssignments.get(action.playerId)!.push(task);
        }
      }
    }

    // Распределяем невыполненные задачи по игрокам
    for (const unresolvedTask of unresolvedTasks) {
      // Находим игрока, которому была назначена эта задача
      for (const [playerId, playerTasks] of taskAssignments) {
        if (playerTasks.some(task => task.id === unresolvedTask.id)) {
          if (!this.playerUnresolvedTasks.has(playerId)) {
            this.playerUnresolvedTasks.set(playerId, []);
          }
          this.playerUnresolvedTasks.get(playerId)!.push(unresolvedTask);
          break;
        }
      }
    }

    console.log('📋 distributeUnresolvedTasksToPlayers:');
    for (const [playerId, tasks] of this.playerUnresolvedTasks) {
      console.log(`  ${playerId}: ${tasks.length} unresolved tasks`);
    }
  }

  public isSessionFull(): boolean {
    return this.playerInterfaces.length >= this.maxPlayers;
  }

  public canStart(): boolean {
    return this.playerInterfaces.length >= 1 && this.isActive;
  }

  public endSession(): void {
    this.isActive = false;
  }

  // 🎮 Методы для управления фазами игры (для клиента)

  // Получение текущей фазы игры
  public getCurrentPhase(): 'task-distribution' | 'task-solving' | 'round-complete' {
    // Если нет активного распределения - фаза распределения
    if (!this.currentTaskDistribution) {
      return 'task-distribution';
    }

    // Если распределение не завершено - фаза распределения
    if (!this.currentTaskDistribution.isCompleted) {
      return 'task-distribution';
    }

    // Если есть активный раунд но не все действия выполнены - фаза решения
    if (this.currentRoundObj && this.currentRoundObj.actions.length < this.getTotalPossibleActions()) {
      return 'task-solving';
    }

    return 'round-complete';
  }

  // Получение задач для текущего раунда
  public getCurrentRoundTasks(): Task[] {
    if (this.currentTaskDistribution) {
      return this.currentTaskDistribution.getAvailableTasks();
    }

    // Генерируем задачи для нового раунда
    const taskPool = this.taskGenerator.generateTasksForRound(
      this.currentRound,
      this.playerInterfaces.length
    );
    return taskPool;
  }

  // Получение задач, назначенных конкретному игроку
  public getPlayerTasks(playerId: string): Task[] {
    const assignedTasks: Task[] = [];

    // Получаем задачи, назначенные в текущем раунде
    if (this.currentTaskDistribution) {
      assignedTasks.push(...this.currentTaskDistribution.getPlayerTasks(playerId));
    }

    // Добавляем невыполненные задачи из предыдущих раундов
    const unresolvedTasks = this.playerUnresolvedTasks.get(playerId) || [];
    assignedTasks.push(...unresolvedTasks);

    console.log(`🎯 getPlayerTasks(${playerId}):`);
    console.log(`  Assigned tasks: ${this.currentTaskDistribution?.getPlayerTasks(playerId).length || 0}`);
    console.log(`  Unresolved tasks: ${unresolvedTasks.length}`);
    console.log(`  Total tasks: ${assignedTasks.length}`);

    return assignedTasks;
  }

  // Получение всех задач раунда (включая невыполненные)
  public getAllRoundTasks(): Task[] {
    const allTasks: Task[] = [];

    // Добавляем задачи текущего раунда
    if (this.currentRoundObj) {
      allTasks.push(...this.currentRoundObj.tasks);
    }

    // Добавляем невыполненные задачи всех игроков
    for (const unresolvedTasks of this.playerUnresolvedTasks.values()) {
      allTasks.push(...unresolvedTasks);
    }

    // Убираем дубликаты (если невыполненная задача уже есть в текущем раунде)
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );

    console.log('🎯 getAllRoundTasks:');
    console.log('  Current round tasks:', this.currentRoundObj?.tasks.length || 0);
    console.log('  Unresolved tasks by players:', Array.from(this.playerUnresolvedTasks.values()).flat().length);
    console.log('  Total unique tasks:', uniqueTasks.length);
    console.log('  Task IDs:', uniqueTasks.map(t => t.id));

    return uniqueTasks;
  }

  // Расчет вероятности успеха для задачи
  public calculateTaskSuccessProbability(task: Task, playerId: string, investment: any): number {
    const player = this.players.find(p => p.name === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    const taskSolver = new TaskSolver(this.settings);
    return taskSolver.calculateSuccessProbability(task, player, investment);
  }

  // Отправка действий игрока
  public async submitPlayerActions(playerId: string, actions: PlayerActionRequest[]): Promise<void> {
    if (!this.currentRoundObj) {
      throw new Error('No active round');
    }

    // Валидация действий
    this.validatePlayerActions(playerId, actions);

    // Выполняем действия
    const results = this.executePlayerActions(actions);

    // Разделяем действия на текущие и невыполненные задачи
    const currentRoundActions: PlayerAction[] = [];
    const unresolvedActions: PlayerAction[] = [];

    results.forEach(action => {
      // Проверяем, является ли задача частью текущего раунда
      const isCurrentRoundTask = this.currentRoundObj!.tasks.some(task => task.id === action.taskId);

      if (isCurrentRoundTask) {
        currentRoundActions.push(action);
      } else {
        unresolvedActions.push(action);
      }
    });

    // Добавляем действия текущего раунда в раунд
    currentRoundActions.forEach(action => {
      this.currentRoundObj!.addPlayerAction(action);
    });

    // Сохраняем действия по невыполненным задачам отдельно
    if (unresolvedActions.length > 0) {
      const existingActions = this.unresolvedTaskActions.get(playerId) || [];
      this.unresolvedTaskActions.set(playerId, [...existingActions, ...unresolvedActions]);
    }
  }

  // Завершение раунда и получение результатов
  public async completeRound(): Promise<RoundResult> {
    if (!this.currentRoundObj) {
      throw new Error('No active round');
    }

    // Завершаем раунд
    this.currentRoundObj.completeRound();

    // Получаем все действия раунда
    const allActions = this.currentRoundObj.actions;

    // Добавляем действия по невыполненным задачам
    const allUnresolvedActions: PlayerAction[] = [];
    for (const actions of this.unresolvedTaskActions.values()) {
      allUnresolvedActions.push(...actions);
    }

    // Объединяем все действия для расчета прогресса
    const allActionsForProgress = [...allActions, ...allUnresolvedActions];

    // Обновляем прогресс проекта
    const projectProgress = this.updateProjectProgress(allActionsForProgress);

    // Уведомляем игроков о результатах
    this.notifyPlayersRoundEnd(this.currentRoundObj, allActions);
    this.notifyPlayersProjectProgress(projectProgress);

    // Получаем все задачи раунда ПЕРЕД получением невыполненных задач
    const allRoundTasks = this.getAllRoundTasks();
    
    // Создаем результат раунда
    const roundResult: RoundResult = {
      roundNumber: this.currentRoundObj.roundNumber,
      playerActions: allActions,
      projectProgress,
      isProjectCompleted: this.project.isProjectCompleted(),
      nextRoundTasks: this.getUnresolvedTasks(),
      currentRoundTasks: allRoundTasks // Сохраняем все задачи раунда (включая невыполненные)
    };

    // Переходим к следующему раунду
    this.currentRound++;

    return roundResult;
  }

  // Подготовка к следующему раунду
  public prepareNextRound(): void {
    // Сбрасываем состояние текущего раунда
    this.currentRoundObj = null;
    this.currentTaskDistribution = null;

    // Очищаем действия по невыполненным задачам (они уже учтены в прогрессе)
    this.unresolvedTaskActions.clear();

    // НЕ очищаем unresolvedTasks - они будут использованы в следующем раунде
  }

  // Проверка готовности раунда к завершению
  public isRoundReadyToComplete(): boolean {
    if (!this.currentRoundObj) return false;

    // Проверяем, что все игроки отправили свои действия
    for (const player of this.playerInterfaces) {
      const playerActions = this.currentRoundObj.getPlayerActions(player.id);
      if (playerActions.length === 0) {
        return false; // Игрок еще не отправил действия
      }
    }

    return true;
  }

  // Автоматическая отправка действий для AI игроков
  public async submitAIPlayerActions(): Promise<void> {
    if (!this.currentRoundObj) return;

    console.log('submitAIPlayerActions: Starting for', this.playerInterfaces.length, 'players');

    for (const playerInterface of this.playerInterfaces) {
      // Пропускаем человеческого игрока
      if (playerInterface instanceof HumanPlayer) {
        console.log('Skipping human player:', playerInterface.id);
        continue;
      }

      console.log('Processing AI player:', playerInterface.id);

      // Проверяем, не отправил ли уже AI игрок свои действия
      const existingActions = this.currentRoundObj.getPlayerActions(playerInterface.id);
      if (existingActions.length > 0) {
        console.log('Player', playerInterface.id, 'already has', existingActions.length, 'actions');
        continue;
      }

      // Получаем задачи игрока
      const playerTasks = this.getPlayerTasks(playerInterface.id);
      console.log('Player', playerInterface.id, 'has', playerTasks.length, 'tasks');
      if (playerTasks.length === 0) {
        console.log('Player', playerInterface.id, 'has no tasks, skipping');
        continue;
      }

      // Получаем текущий энтузиазм игрока
      const currentEnthusiasm = this.playerEnthusiasm.get(playerInterface.id) || 0;
      console.log('Player', playerInterface.id, 'enthusiasm:', currentEnthusiasm);

      try {
        // Запрашиваем действия у AI игрока
        console.log('Calling selectActions for', playerInterface.id);
        const actions = await playerInterface.selectActions(
          playerTasks,
          this.settings.actionsPerTurn,
          currentEnthusiasm
        );
        console.log('Player', playerInterface.id, 'selected', actions.length, 'actions');

        // Отправляем действия
        if (actions.length > 0) {
          console.log('Submitting', actions.length, 'actions for', playerInterface.id);
          await this.submitPlayerActions(playerInterface.id, actions);
          console.log('Actions submitted for', playerInterface.id);
        } else {
          console.log('No actions to submit for', playerInterface.id);
        }
      } catch (error) {
        console.error('Error processing AI player', playerInterface.id, ':', error);
      }
    }

    console.log('submitAIPlayerActions: Completed');
  }

  // Валидация действий игрока
  private validatePlayerActions(playerId: string, actions: PlayerActionRequest[]): void {
    if (!this.currentRoundObj) return;

    const playerActions = this.currentRoundObj.getPlayerActions(playerId);
    const remainingActions = this.currentRoundObj.getRemainingActions(playerId);

    // Проверяем ограничение по количеству действий только если allowUnlimitedActions = false
    if (!this.settings.allowUnlimitedActions && actions.length > remainingActions) {
      throw new Error(`Player ${playerId} can only perform ${remainingActions} more actions`);
    }

    // Проверяем, что все задачи существуют
    actions.forEach(action => {
      // Сначала ищем в задачах текущего раунда
      let task = this.currentRoundObj!.tasks.find(t => t.id === action.taskId);

      // Если не найдена, ищем в невыполненных задачах игрока
      if (!task) {
        const unresolvedTasks = this.playerUnresolvedTasks.get(playerId) || [];
        task = unresolvedTasks.find(t => t.id === action.taskId);
      }

      if (!task) {
        throw new Error(`Task ${action.taskId} not found`);
      }
    });
  }

  // Получение текущего энтузиазма игрока
  public getPlayerEnthusiasm(playerId: string): number {
    return this.playerEnthusiasm.get(playerId) || 0;
  }

  // Получение информации о текущем состоянии распределения
  public getDistributionState(): {
    currentPlayerId: string | null;
    availableTasks: Task[];
    assignedTasks: Array<{taskId: string, assignedTo: string, assignedBy: string}>;
    isComplete: boolean;
  } {
    if (!this.currentTaskDistribution) {
      return {
        currentPlayerId: null,
        availableTasks: [],
        assignedTasks: [],
        isComplete: false
      };
    }

    return {
      currentPlayerId: this.currentTaskDistribution.getCurrentPlayerId(this.playerInterfaces),
      availableTasks: this.currentTaskDistribution.getAvailableTasks(),
      assignedTasks: this.currentTaskDistribution.assignments,
      isComplete: this.currentTaskDistribution.isCompleted
    };
  }

  // Назначение задачи игроку
  public assignTask(taskId: string, assignedTo: string, assignedBy: string): void {
    if (!this.currentTaskDistribution) {
      throw new Error('No active task distribution');
    }

    this.currentTaskDistribution.assignTask(taskId, assignedTo, assignedBy);
  }

  // Выполнить ход текущего AI-игрока (для клиента)
  public async processCurrentAITurn(): Promise<void> {
    if (!this.currentTaskDistribution) {
      throw new Error('No active task distribution');
    }

    const currentPlayerId = this.currentTaskDistribution.getCurrentPlayerId(this.playerInterfaces);
    if (!currentPlayerId) return;

    const availableTasks = this.currentTaskDistribution.getAvailableTasks();
    if (availableTasks.length === 0) return;

    const distributor = this.taskDistributors.find(d => d.id === currentPlayerId);
    if (!distributor) {
      throw new Error(`No task distributor found for player ${currentPlayerId}`);
    }

    const choice = await distributor.selectTaskAssignment(
      availableTasks,
      currentPlayerId,
      this.playerInterfaces,
      this.currentTaskDistribution
    );

    this.currentTaskDistribution.assignTask(choice.taskId, choice.assignedTo, currentPlayerId);

    if (this.currentTaskDistribution.isDistributionComplete(this.playerInterfaces)) {
      this.currentTaskDistribution.completeDistribution();
    }
  }

  // Предпросмотр выбора текущего AI без назначения (для клиентской анимации)
  public async previewCurrentAIChoice(): Promise<{ taskId: string; assignedTo: string; assignedBy: string } | null> {
    if (!this.currentTaskDistribution) {
      throw new Error('No active task distribution');
    }

    const currentPlayerId = this.currentTaskDistribution.getCurrentPlayerId(this.playerInterfaces);
    if (!currentPlayerId) return null;

    const availableTasks = this.currentTaskDistribution.getAvailableTasks();
    if (availableTasks.length === 0) return null;

    const distributor = this.taskDistributors.find(d => d.id === currentPlayerId);
    if (!distributor) {
      throw new Error(`No task distributor found for player ${currentPlayerId}`);
    }

    const choice = await distributor.selectTaskAssignment(
      availableTasks,
      currentPlayerId,
      this.playerInterfaces,
      this.currentTaskDistribution
    );

    return { taskId: choice.taskId, assignedTo: choice.assignedTo, assignedBy: currentPlayerId };
  }

  // Завершение распределения задач
  public completeTaskDistribution(): void {
    if (!this.currentTaskDistribution) {
      throw new Error('No active task distribution');
    }

    this.currentTaskDistribution.completeDistribution();

    // Создаем новый раунд с распределенными задачами
    this.createRoundFromDistribution();
  }

  // Создание раунда из распределения
  private createRoundFromDistribution(): void {
    if (!this.currentTaskDistribution) return;

    const distributedTasks = this.currentTaskDistribution.taskPool.filter(task =>
      this.currentTaskDistribution!.assignments.some(a => a.taskId === task.id)
    );

    this.currentRoundObj = new GameRound(
      this.currentRound,
      distributedTasks,
      this.settings.actionsPerTurn
    );
  }

  // Получение общего количества возможных действий
  private getTotalPossibleActions(): number {
    return this.playerInterfaces.length * this.settings.actionsPerTurn;
  }

  // Инициализация распределения задач для клиента
  public initializeTaskDistribution(): void {
    if (this.currentTaskDistribution) {
      return; // Уже инициализировано
    }

    // Генерируем только новые задачи для раунда
    const newTasks = this.taskGenerator.generateTasksForRound(
      this.currentRound,
      this.playerInterfaces.length
    );

    console.log('🎯 initializeTaskDistribution:');
    console.log('  Current round:', this.currentRound);
    console.log('  New tasks generated:', newTasks.length);
    console.log('  New task IDs:', newTasks.map(t => t.id));
    console.log('  Note: Unresolved tasks will be added to players during task solving phase');

    // Создаем фазу распределения только с новыми задачами
    this.currentTaskDistribution = new TaskDistribution(
      this.currentRound,
      newTasks,
      this.settings.actionsPerTurn
    );
  }
}
