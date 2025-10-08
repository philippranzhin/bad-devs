// Core Models
export { GameSession } from './src/models/GameSession';
export { Player } from './src/models/Player';
export { Project } from './src/models/Project';
export { Task } from './src/models/Task';
export { GameRound } from './src/models/GameRound';
export { TaskDistribution } from './src/models/TaskDistribution';
export { GameSettings } from './src/models/GameSettings';

// Services
export { TaskSolver } from './src/services/TaskSolver';
export { TaskGenerator } from './src/services/TaskGenerator';
export { AbilityGenerator } from './src/services/AbilityGenerator';
export { AbilityService } from './src/services/AbilityService';

// Player Implementations
export { AIPlayer } from './src/players/AIPlayer';
export { HumanPlayer } from './src/players/HumanPlayer';
export { AITaskDistributor } from './src/players/AITaskDistributor';
export { HumanTaskDistributor } from './src/players/HumanTaskDistributor';

// Types and Interfaces
export * from './src/types/SkillType';
export * from './src/types/AbilityType';
export * from './src/interfaces/PlayerInterface';

// Re-export interfaces from models
export type { RoundResult } from './src/models/GameSession';
export type { ProjectRequirements, ProjectProgress, ProjectRewards } from './src/models/Project';
export type { TaskAssignment, TaskDistributionChoice, TaskDistributionInterface } from './src/models/TaskDistribution';
export type { DefaultSkillSets, AbilitySettings } from './src/models/GameSettings';

// Re-export interfaces from services
export type { Investment } from './src/services/TaskSolver';
export type { TaskTemplate, TaskGenerationConfig } from './src/services/TaskGenerator';
export type { AbilityGenerationConfig } from './src/services/AbilityGenerator';
export type { AbilityResult } from './src/services/AbilityService';
