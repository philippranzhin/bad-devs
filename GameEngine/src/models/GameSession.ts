import { PlayerAction, PlayerActionRequest, PlayerInterface } from '../interfaces/PlayerInterface';
import { TaskGenerator } from '../services/TaskGenerator';
import { TaskSolver } from '../services/TaskSolver';
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
    // Пока что создаем простых AI распределителей для всех игроков
    // В будущем можно будет определять тип по интерфейсу игрока
    return playerInterfaces.map(player => {
      // Для простоты используем AI распределителей
      // В реальной игре здесь была бы логика определения типа игрока
      const { AITaskDistributor } = require('../players/AITaskDistributor');
      return new AITaskDistributor(player);
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
        this.playerInterfaces
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
      const playerTasks = this.getPlayerTasks(player.id, round);

      const playerActions = await player.selectActions(
        playerTasks, // Только задачи этого игрока
        this.settings.actionsPerTurn,
        currentEnthusiasm
      );
      allActions.push(...playerActions);
    }

    return allActions;
  }

  // Получение задач конкретного игрока
  private getPlayerTasks(playerId: string, round: GameRound): Task[] {
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
}
