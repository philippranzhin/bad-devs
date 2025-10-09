import { PlayerInterface } from '../interfaces/PlayerInterface';
import { Task } from './Task';

export interface TaskAssignment {
  taskId: string;
  assignedTo: string; // playerId
  assignedBy: string; // playerId who made the decision
}

export interface TaskDistributionChoice {
  taskId: string;
  assignedTo: string; // playerId
}

export interface TaskDistributionInterface {
  readonly id: string;
  readonly name: string;

  // Игрок выбирает кому достанется задача
  selectTaskAssignment(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[],
    taskDistribution?: TaskDistribution // Добавляем опциональный параметр для доступа к информации о назначениях
  ): Promise<TaskDistributionChoice>;
}

export class TaskDistribution {
  public readonly roundNumber: number;
  public readonly taskPool: Task[];
  public readonly assignments: TaskAssignment[] = [];
  public readonly maxTasksPerPlayer: number;
  public isCompleted: boolean = false;

  private currentPlayerIndex: number = 0;
  public remainingTasks: Task[] = []; // Сделаем публичным для тестов

  constructor(roundNumber: number, taskPool: Task[], maxTasksPerPlayer: number) {
    this.roundNumber = roundNumber;
    this.taskPool = [...taskPool];
    this.maxTasksPerPlayer = maxTasksPerPlayer;
    this.remainingTasks = [...taskPool];
  }

  public getCurrentPlayerId(playerInterfaces: PlayerInterface[]): string | null {
    if (this.isCompleted || playerInterfaces.length === 0) {
      return null;
    }
    // Используем модуль для циклического распределения
    const actualIndex = this.currentPlayerIndex % playerInterfaces.length;
    return playerInterfaces[actualIndex].id;
  }

  public getAvailableTasks(): Task[] {
    return [...this.remainingTasks];
  }

  public getPlayerTasks(playerId: string): Task[] {
    const assignedTaskIds = this.assignments
      .filter(a => a.assignedTo === playerId)
      .map(a => a.taskId);

    return this.taskPool.filter(task => assignedTaskIds.includes(task.id));
  }

  public getPlayerTaskCount(playerId: string): number {
    return this.assignments.filter(a => a.assignedTo === playerId).length;
  }

  public canAssignTask(playerId: string): boolean {
    return this.getPlayerTaskCount(playerId) < this.maxTasksPerPlayer;
  }

  public assignTask(taskId: string, assignedTo: string, assignedBy: string): void {
    if (this.isCompleted) {
      throw new Error('Cannot assign tasks to completed distribution');
    }

    // Проверяем что задача еще доступна
    const task = this.remainingTasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} is not available for assignment`);
    }

    // Проверяем что у игрока еще есть место для задач
    if (!this.canAssignTask(assignedTo)) {
      throw new Error(`Player ${assignedTo} has reached task limit`);
    }

    // Добавляем назначение
    this.assignments.push({
      taskId,
      assignedTo,
      assignedBy
    });

    // Убираем задачу из доступных
    const taskIndex = this.remainingTasks.findIndex(t => t.id === taskId);
    this.remainingTasks.splice(taskIndex, 1);

    // Переходим к следующему игроку
    this.currentPlayerIndex++;
  }

  public isDistributionComplete(playerInterfaces: PlayerInterface[]): boolean {
    // Проверяем что все игроки получили максимальное количество задач
    for (const player of playerInterfaces) {
      if (this.getPlayerTaskCount(player.id) < this.maxTasksPerPlayer) {
        return false;
      }
    }
    return true;
  }

  public completeDistribution(): void {
    this.isCompleted = true;
  }

  public getDistributionSummary(): Record<string, Task[]> {
    const summary: Record<string, Task[]> = {};

    for (const assignment of this.assignments) {
      if (!summary[assignment.assignedTo]) {
        summary[assignment.assignedTo] = [];
      }

      const task = this.taskPool.find(t => t.id === assignment.taskId);
      if (task) {
        summary[assignment.assignedTo].push(task);
      }
    }

    return summary;
  }
}
