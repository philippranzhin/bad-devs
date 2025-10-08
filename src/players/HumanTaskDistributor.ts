import { PlayerInterface } from '../interfaces/PlayerInterface';
import { Task } from '../models/Task';
import { TaskDistributionChoice, TaskDistributionInterface } from '../models/TaskDistribution';

export class HumanTaskDistributor implements TaskDistributionInterface {
  public readonly id: string;
  public readonly name: string;
  private readonly player: PlayerInterface;
  private assignmentResolver?: (choice: TaskDistributionChoice) => void;

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
    return new Promise((resolve) => {
      this.assignmentResolver = resolve;

      // Здесь будет UI запрос к игроку
      console.log(`Human Player ${this.name} needs to assign a task`);
      console.log(`Available tasks:`, availableTasks.map(t => `${t.name} (${t.requiredSkill}, complexity: ${t.complexity})`));
      console.log(`Current player: ${currentPlayerId}`);

      // Для тестирования автоматически назначаем задачу текущему игроку
      setTimeout(() => {
        if (this.assignmentResolver && availableTasks.length > 0) {
          this.assignmentResolver({
            taskId: availableTasks[0].id,
            assignedTo: currentPlayerId
          });
          this.assignmentResolver = undefined;
        }
      }, 100);
    });
  }

  // Метод для UI чтобы передать выбор игрока
  public submitAssignment(choice: TaskDistributionChoice): void {
    if (this.assignmentResolver) {
      this.assignmentResolver(choice);
      this.assignmentResolver = undefined;
    }
  }
}
