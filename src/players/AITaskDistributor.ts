import { PlayerInterface } from '../interfaces/PlayerInterface';
import { Task } from '../models/Task';
import { TaskDistributionChoice, TaskDistributionInterface } from '../models/TaskDistribution';

export class AITaskDistributor implements TaskDistributionInterface {
  public readonly id: string;
  public readonly name: string;
  private readonly player: PlayerInterface;

  constructor(player: PlayerInterface) {
    this.player = player;
    this.id = player.id;
    this.name = player.name;
  }

  async selectTaskAssignment(
    availableTasks: Task[],
    currentPlayerId: string,
    allPlayers: PlayerInterface[]
  ): Promise<TaskDistributionChoice> {
    if (availableTasks.length === 0) {
      throw new Error('No tasks available for assignment');
    }

    // Простая AI логика: выбираем задачу которая лучше всего подходит текущему игроку
    const bestTask = this.selectBestTaskForPlayer(availableTasks, currentPlayerId, allPlayers);

    return {
      taskId: bestTask.id,
      assignedTo: currentPlayerId // AI всегда назначает задачу себе
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

    // Для AI логики нам нужен доступ к оригинальному Player объекту
    // Пока что используем простую логику - выбираем первую доступную задачу
    // В реальной реализации здесь была бы сложная логика оценки задач

    return availableTasks.sort((a, b) => {
      // Простая сортировка по сложности (меньше = лучше)
      return a.complexity - b.complexity;
    })[0];
  }
}
