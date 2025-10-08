# Bad Devs Game Engine

The core game engine for the Bad Devs RPG card game. This engine contains all the game logic, models, services, and AI implementations.

## 🎮 Overview

The Game Engine provides:
- Complete game logic implementation
- Player management (AI and Human)
- Task and project systems
- Ability system with effects
- Configurable game settings
- Comprehensive test suite

## 🏗️ Architecture

### Core Models
- `Player`: Character with skills, abilities, and resources
- `Project`: Main objective with requirements and rewards
- `Task`: Individual work items with complexity and deadlines
- `GameSession`: Orchestrates the entire game flow
- `GameSettings`: Configurable game parameters

### Services
- `TaskSolver`: Calculates success probability for tasks
- `TaskGenerator`: Creates tasks from templates
- `AbilityGenerator`: Generates abilities based on specialization
- `AbilityService`: Manages ability usage and effects

### Player Interfaces
- `PlayerInterface`: Abstraction for different player types
- `AIPlayer`: AI-controlled players with basic strategy
- `HumanPlayer`: Human players with async input handling

## 🚀 Usage

### Installation
```bash
npm install
```

### Running Tests
```bash
npm test
```

### Building
```bash
npm run build
```

## 📋 Game Flow

1. **Session Setup**: Create players and select a project
2. **Task Distribution**: Players take turns assigning tasks
3. **Round Execution**: Players select actions and invest resources
4. **Task Resolution**: Dice rolls determine success/failure
5. **Progress Update**: Successful tasks contribute to project completion
6. **Resource Management**: Players manage enthusiasm and abilities
7. **Repeat**: Continue until project completion or session end

## ⚙️ Configuration

The game is highly configurable through `GameSettings`:

```typescript
const settings = new GameSettings({
  rounds: 5,                    // Number of rounds
  startingSkills: 10,           // Starting skill points
  enthusiasmPoints: 10,         // Starting enthusiasm
  actionsPerTurn: 5,            // Actions per player per turn
  difficultyLevel: 5,           // Game difficulty (0-10)
  abilitySettings: {
    maxAbilitiesPerPlayer: 5,   // Max abilities per player
    abilitiesPerSession: 3,     // Abilities given at start
    abilityCostMultiplier: 1.0, // Cost multiplier for abilities
    allowMultipleAbilitiesPerTask: true, // Multiple abilities per task
    abilityRefreshPerRound: 0  // Abilities restored per round
  }
});
```

## 🎲 Game Mechanics

### Success Probability
Success is calculated based on:
- Base probability (affected by difficulty)
- Invested skills (matching task type)
- Tech base and soft skills
- Enthusiasm investment
- Ability effects

### Abilities
Abilities provide various effects:
- **reduce_complexity**: Lower task difficulty
- **bonus_enthusiasm**: Gain extra enthusiasm
- **double_experience**: Double experience rewards
- **extend_deadline**: Increase task deadline
- **skill_conversion**: Convert techBase to target skill
- And many more!

## 🤖 AI Players

The engine includes simple AI players that:
- Select tasks based on skill matching
- Invest resources strategically
- Use abilities when beneficial
- Adapt to game situations

## 📁 File Structure

```
src/
├── models/           # Core game models
│   ├── GameSession.ts
│   ├── Player.ts
│   ├── Project.ts
│   ├── Task.ts
│   ├── GameRound.ts
│   ├── TaskDistribution.ts
│   └── GameSettings.ts
├── services/         # Game logic services
│   ├── TaskSolver.ts
│   ├── TaskGenerator.ts
│   ├── AbilityGenerator.ts
│   └── AbilityService.ts
├── types/           # TypeScript type definitions
│   ├── SkillType.ts
│   └── AbilityType.ts
├── players/         # Player implementations
│   ├── AIPlayer.ts
│   ├── HumanPlayer.ts
│   ├── AITaskDistributor.ts
│   └── HumanTaskDistributor.ts
├── interfaces/       # Player interfaces
│   └── PlayerInterface.ts
├── assets/          # Game data
│   ├── tasks.json
│   └── abilities.json
└── __tests__/       # Test files
    ├── *.test.ts
    └── ...
```

## 🧪 Testing

The engine has comprehensive test coverage:
- **181 tests** covering all functionality
- Unit tests for all models and services
- Integration tests for game flow
- Edge case testing
- Mock implementations for external dependencies

Run tests with:
```bash
npm test
```

## 📦 Export Interface

The engine exports the following main classes and interfaces:

```typescript
// Core Models
export { GameSession } from './models/GameSession';
export { Player } from './models/Player';
export { Project } from './models/Project';
export { Task } from './models/Task';
export { GameSettings } from './models/GameSettings';

// Services
export { TaskSolver } from './services/TaskSolver';
export { TaskGenerator } from './services/TaskGenerator';
export { AbilityGenerator } from './services/AbilityGenerator';
export { AbilityService } from './services/AbilityService';

// Player Implementations
export { AIPlayer } from './players/AIPlayer';
export { HumanPlayer } from './players/HumanPlayer';

// Types
export * from './types/SkillType';
export * from './types/AbilityType';
export * from './interfaces/PlayerInterface';
```

## 🔧 Development

### Adding New Features
1. Create tests first (TDD approach)
2. Implement the feature
3. Ensure all tests pass
4. Update documentation

### Code Style
- TypeScript with strict mode
- Comprehensive type definitions
- Clear separation of concerns
- Extensive error handling
- Detailed comments and documentation

---

**The engine is ready for client integration!** 🚀
