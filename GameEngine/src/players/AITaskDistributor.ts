import { PlayerInterface } from '../interfaces/PlayerInterface';
import { Task } from '../models/Task';
import { TaskDistributionChoice, TaskDistributionInterface } from '../models/TaskDistribution';
import { BotPersonality } from '../types/BotPersonality';

export class AITaskDistributor implements TaskDistributionInterface {
  public readonly id: string;
  public readonly name: string;
  private readonly player: PlayerInterface;
  private readonly personality: BotPersonality;

  constructor(player: PlayerInterface, personality: BotPersonality = 'kind') {
    this.player = player;
    this.personality = personality;
    this.id = player.id;
    this.name = player.name;
  }

  async selectTaskAssignment(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[],
    taskDistribution?: any
  ): Promise<TaskDistributionChoice> {
    if (availableTasks.length === 0) {
      throw new Error('No tasks available for assignment');
    }

    // Выбираем задачу для распределения
    let selectedTask: Task;

    if (this.personality === 'kind') {
      // Добрый бот: выбирает задачу, которая лучше всего подходит кому-то другому
      selectedTask = this.selectBestTaskForOthers(availableTasks, currentPlayerId, allPlayers);
    } else {
      // Злой бот: выбирает задачу, которая хуже всего подходит кому-то другому
      selectedTask = this.selectWorstTaskForOthers(availableTasks, currentPlayerId, allPlayers);
    }

    // Определяем, кому назначить задачу
    let assignedTo: string;
    if (this.personality === 'kind') {
      // Добрый бот: отдает задачу тому, кому она лучше всего подходит
      assignedTo = this.findBestAvailablePlayerForTask(selectedTask, allPlayers, taskDistribution);
    } else {
      // Злой бот: отдает задачу тому, кому она меньше всего подходит
      assignedTo = this.findWorstAvailablePlayerForTask(selectedTask, allPlayers, taskDistribution);
    }

    return {
      taskId: selectedTask.id,
      assignedTo: assignedTo
    };
  }

  private selectBestTaskForPlayer(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[]
  ): Task {
    const currentPlayer = allPlayers.find(p => p.id === currentPlayerId);
    if (!currentPlayer) {
      throw new Error(`Player ${currentPlayerId} not found`);
    }

    // Выбираем задачу, которая лучше всего подходит текущему игроку
    let bestTask = availableTasks[0];
    let bestScore = this.calculateTaskFitScore(availableTasks[0], currentPlayer);

    for (const task of availableTasks) {
      const score = this.calculateTaskFitScore(task, currentPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestTask;
  }

  private selectBestTaskForOthers(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[]
  ): Task {
    // Добрый бот выбирает задачу, которая лучше всего подходит КОМУ-ТО ДРУГОМУ
    // Исключаем текущего игрока из поиска лучшего получателя
    const otherPlayers = allPlayers.filter(p => p.id !== currentPlayerId);

    let bestTask = availableTasks[0];
    let bestScore = 0;

    for (const task of availableTasks) {
      // Находим лучшего игрока для этой задачи среди других (не себя)
      let maxScoreForTask = 0;
      for (const player of otherPlayers) {
        const score = this.calculateTaskFitScore(task, player);
        if (score > maxScoreForTask) {
          maxScoreForTask = score;
        }
      }

      // Выбираем задачу, для которой кто-то другой имеет максимальный score
      if (maxScoreForTask > bestScore) {
        bestScore = maxScoreForTask;
        bestTask = task;
      }
    }

    return bestTask;
  }

  private selectWorstTaskForOthers(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[]
  ): Task {
    // Злой бот выбирает задачу, которая хуже всего подходит КОМУ-ТО ДРУГОМУ
    // Исключаем текущего игрока из поиска
    const otherPlayers = allPlayers.filter(p => p.id !== currentPlayerId);

    let worstTask = availableTasks[0];
    let worstScore = Infinity;

    for (const task of availableTasks) {
      // Находим худшего игрока для этой задачи среди других (не себя)
      let minScoreForTask = Infinity;
      for (const player of otherPlayers) {
        const score = this.calculateTaskFitScore(task, player);
        if (score < minScoreForTask) {
          minScoreForTask = score;
        }
      }

      // Выбираем задачу, для которой кто-то другой имеет минимальный score
      if (minScoreForTask < worstScore) {
        worstScore = minScoreForTask;
        worstTask = task;
      }
    }

    return worstTask;
  }

  private findBestAvailablePlayerForTask(
    task: Task,
    allPlayers: PlayerInterface[],
    taskDistribution?: any
  ): string {
    // Фильтруем игроков, у которых есть место для задач
    const availablePlayers = allPlayers.filter(player =>
      !taskDistribution || taskDistribution.canAssignTask(player.id)
    );

    if (availablePlayers.length === 0) {
      // Если никто не может принять задачу, возвращаем первого игрока
      return allPlayers[0].id;
    }

    let bestPlayer = availablePlayers[0];
    let bestScore = this.calculateTaskFitScore(task, availablePlayers[0]);

    for (const player of availablePlayers) {
      const score = this.calculateTaskFitScore(task, player);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }

    return bestPlayer.id;
  }

  private findWorstAvailablePlayerForTask(
    task: Task,
    allPlayers: PlayerInterface[],
    taskDistribution?: any
  ): string {
    // Фильтруем игроков, у которых есть место для задач
    const availablePlayers = allPlayers.filter(player =>
      !taskDistribution || taskDistribution.canAssignTask(player.id)
    );

    if (availablePlayers.length === 0) {
      // Если никто не может принять задачу, возвращаем первого игрока
      return allPlayers[0].id;
    }

    let worstPlayer = availablePlayers[0];
    let worstScore = this.calculateTaskFitScore(task, availablePlayers[0]);

    for (const player of availablePlayers) {
      const score = this.calculateTaskFitScore(task, player);
      if (score < worstScore) {
        worstScore = score;
        worstPlayer = player;
      }
    }

    return worstPlayer.id;
  }

  private findBestPlayerForTask(task: Task, allPlayers: PlayerInterface[]): PlayerInterface {
    let bestPlayer = allPlayers[0];
    let bestScore = this.calculateTaskFitScore(task, allPlayers[0]);

    for (const player of allPlayers) {
      const score = this.calculateTaskFitScore(task, player);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }

    return bestPlayer;
  }

  private findWorstPlayerForTask(task: Task, allPlayers: PlayerInterface[]): PlayerInterface {
    let worstPlayer = allPlayers[0];
    let worstScore = this.calculateTaskFitScore(task, allPlayers[0]);

    for (const player of allPlayers) {
      const score = this.calculateTaskFitScore(task, player);
      if (score < worstScore) {
        worstScore = score;
        worstPlayer = player;
      }
    }

    return worstPlayer;
  }

  private calculateTaskFitScore(task: Task, player: PlayerInterface): number {
    // Получаем оригинальный Player объект для доступа к навыкам
    const originalPlayer = (player as any).player;
    if (!originalPlayer) {
      return 0;
    }

    const playerSkill = originalPlayer.skills[task.requiredSkill] || 0;
    let score = playerSkill;

    // Бонус за специализацию
    if (originalPlayer.specialization === task.requiredSkill) {
      score += 2;
    }

    // Штраф за сложность (чем сложнее задача, тем меньше подходит)
    score -= task.complexity * 0.5;

    // Бонус за опыт
    score += task.experienceReward * 0.1;

    return score;
  }
}
