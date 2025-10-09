import { PlayerAction, PlayerActionRequest, PlayerInterface } from '../interfaces/PlayerInterface';
import { AITaskDistributor } from '../players/AITaskDistributor';
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
      nextRoundTasks: this.getUnresolvedTasks()
    };
  }

  // 🎯 Выполнение фазы распределения задач
  private async executeTaskDistribution(): Promise<TaskDistribution> {
    // Генерируем пул задач для раунда
    const taskPool = this.taskGenerator.generateTasksForRound(
      this.currentRound,
      this.playerInterfaces.length
    );

    // Создаем фазу распределения
    const distribution = new TaskDistribution(
      this.currentRound,
      taskPool,
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
    const task = this.currentRoundObj?.tasks.find((t: Task) => t.id === action.taskId);

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

    // Обновляем проект
    this.project.addProgress('frontend', progress.frontend);
    this.project.addProgress('backend', progress.backend);
    this.project.addProgress('management', progress.management);

    return progress;
  }

  // 🔍 Получение нерешенных задач
  private getUnresolvedTasks(): Task[] {
    if (!this.currentRoundObj) return [];

    const resolvedTaskIds = this.currentRoundObj.actions
      .filter((action: PlayerAction) => action.success)
      .map((action: PlayerAction) => action.taskId);

    return this.currentRoundObj.tasks.filter((task: Task) =>
      !resolvedTaskIds.includes(task.id)
    );
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
    if (this.currentTaskDistribution) {
      return this.currentTaskDistribution.getPlayerTasks(playerId);
    }
    return [];
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

    // Добавляем результаты в раунд
    results.forEach(action => {
      this.currentRoundObj!.addPlayerAction(action);
    });
  }

  // Валидация действий игрока
  private validatePlayerActions(playerId: string, actions: PlayerActionRequest[]): void {
    if (!this.currentRoundObj) return;

    const playerActions = this.currentRoundObj.getPlayerActions(playerId);
    const remainingActions = this.currentRoundObj.getRemainingActions(playerId);

    if (actions.length > remainingActions) {
      throw new Error(`Player ${playerId} can only perform ${remainingActions} more actions`);
    }

    // Проверяем, что все задачи существуют
    actions.forEach(action => {
      const task = this.currentRoundObj!.tasks.find(t => t.id === action.taskId);
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

    // Генерируем пул задач для раунда
    const taskPool = this.taskGenerator.generateTasksForRound(
      this.currentRound,
      this.playerInterfaces.length
    );

    // Создаем фазу распределения
    this.currentTaskDistribution = new TaskDistribution(
      this.currentRound,
      taskPool,
      this.settings.actionsPerTurn
    );
  }
}
