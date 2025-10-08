# Bad Devs - Card-Based RPG Game

A TypeScript-based card RPG game where players take on the role of developers working on projects, solving tasks, and managing resources.

## 🎮 Game Overview

"Bad Devs" is a strategic card game where players:
- Create developer characters with different specializations (Frontend, Backend, Management, Fullstack)
- Work on projects by solving tasks
- Use skills, enthusiasm, and abilities to complete tasks
- Manage resources and make strategic decisions
- Compete or collaborate to achieve project goals

## 🚀 Features

### Core Game Mechanics
- **Character Creation**: Choose specialization and distribute skills
- **Project Management**: Work on big common tasks (projects)
- **Task Solving**: Complete individual tasks using dice rolls and resource investment
- **Resource Management**: Balance skills, enthusiasm, and abilities
- **Ability System**: Use special abilities to gain advantages

### Technical Features
- **TypeScript**: Full type safety and modern JavaScript features
- **Test-Driven Development**: Comprehensive test suite with Jest
- **Modular Architecture**: Clean separation of concerns
- **Configurable Settings**: Easy game balance adjustments
- **AI Players**: Simple AI for single-player or mixed sessions

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

## 🎯 Game Flow

1. **Session Setup**: Create players and select a project
2. **Task Distribution**: Players take turns assigning tasks
3. **Round Execution**: Players select actions and invest resources
4. **Task Resolution**: Dice rolls determine success/failure
5. **Progress Update**: Successful tasks contribute to project completion
6. **Resource Management**: Players manage enthusiasm and abilities
7. **Repeat**: Continue until project completion or session end

## 🛠️ Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
git clone https://github.com/philippranzhin/bad-devs.git
cd bad-devs
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

## 📋 Game Rules

### Character Creation
- Choose specialization: Frontend, Backend, Management, or Fullstack
- Distribute skill points across: frontend, backend, management, techBase, softSkills
- Receive starting enthusiasm points
- Get abilities based on specialization

### Task Solving
- Invest skills matching the task type
- Use techBase and softSkills for any task type
- Spend enthusiasm for bonus success chance
- Use abilities for special effects
- Roll dice to determine success

### Project Completion
- Complete tasks contribute to project requirements
- Projects have frontend, backend, and management requirements
- All players work toward the same project goal
- Successful completion rewards all players

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

The game includes simple AI players that:
- Select tasks based on skill matching
- Invest resources strategically
- Use abilities when beneficial
- Adapt to game situations

## 📁 Project Structure

```
src/
├── models/           # Core game models
├── services/         # Game logic services
├── types/           # TypeScript type definitions
├── players/         # Player implementations
├── interfaces/       # Player interfaces
├── assets/          # Game data (tasks, abilities)
└── __tests__/       # Test files
```

## 🧪 Testing

The project uses Jest for testing with comprehensive coverage:
- Unit tests for all models and services
- Integration tests for game flow
- Edge case testing
- Mock implementations for external dependencies

Run tests with:
```bash
npm test
```

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Happy coding and may your dice rolls be ever in your favor!** 🎲✨
