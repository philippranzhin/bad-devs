import { PlayerAction, PlayerActionRequest, PlayerInterface } from '../interfaces/PlayerInterface';
import { Player } from '../models/Player';
import { ProjectProgress } from '../models/Project';
import { Task } from '../models/Task';

export class HumanPlayer implements PlayerInterface {
  public readonly id: string;
  public readonly name: string;
  private readonly player: Player;
  private actionResolver?: (actions: PlayerActionRequest[]) => void;

  constructor(player: Player) {
    this.player = player;
    this.id = player.name;
    this.name = player.name;
  }

  async selectActions(
    availableTasks: Task[],
    maxActions: number,
    currentEnthusiasm: number
  ): Promise<PlayerActionRequest[]> {
    return new Promise((resolve) => {
      this.actionResolver = resolve;

      // Здесь будет UI запрос к игроку
      // Пока что просто логируем
      console.log(`Human Player ${this.name} needs to select ${maxActions} actions from ${availableTasks.length} tasks`);
      console.log(`Available tasks:`, availableTasks.map(t => `${t.name} (${t.requiredSkill})`));

      // Для тестирования автоматически возвращаем пустой массив через небольшую задержку
      setTimeout(() => {
        if (this.actionResolver) {
          this.actionResolver([]);
          this.actionResolver = undefined;
        }
      }, 100);
    });
  }

  // Метод для UI чтобы передать действия игрока
  public submitActions(actions: PlayerActionRequest[]): void {
    if (this.actionResolver) {
      this.actionResolver(actions);
      this.actionResolver = undefined;
    }
  }

  onRoundStart(roundNumber: number, tasks: Task[]): void {
    // Уведомляем UI о начале раунда
    console.log(`Human Player ${this.name} starting round ${roundNumber} with ${tasks.length} tasks`);
  }

  onRoundEnd(roundNumber: number, results: PlayerAction[]): void {
    // Показываем результаты раунда
    const successfulActions = results.filter(r => r.success).length;
    console.log(`Human Player ${this.name} completed round ${roundNumber}: ${successfulActions}/${results.length} successful`);
  }

  onProjectProgress(progress: ProjectProgress): void {
    // Обновляем прогресс в UI
    console.log(`Human Player ${this.name} sees project progress:`, progress);
  }
}
