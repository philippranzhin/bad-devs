# Bad Devs - Multi-Client RPG Game

A comprehensive card-based RPG game with multiple client interfaces and a robust game engine.

## 🏗️ Project Structure

```
bad-devs/
├── GameEngine/          # Core game logic and engine
│   ├── src/            # Game engine source code
│   ├── package.json    # Engine dependencies
│   └── tsconfig.json   # Engine TypeScript config
├── clients/            # Client applications
│   ├── web/           # Web-based client (future)
│   ├── cli/           # Command-line client (future)
│   └── desktop/       # Desktop client (future)
├── package.json       # Root package configuration
└── README.md          # This file
```

## 🎮 Game Engine

The `GameEngine` contains the core game logic:
- **Models**: Player, Project, Task, GameSession
- **Services**: TaskSolver, TaskGenerator, AbilityService
- **Types**: SkillType, AbilityType, PlayerInterface
- **Players**: AI and Human player implementations
- **Assets**: Task and ability templates

### Features
- ✅ Complete TypeScript implementation
- ✅ 181 comprehensive tests
- ✅ TDD development approach
- ✅ Modular architecture
- ✅ Configurable game settings
- ✅ AI and Human player support
- ✅ Ability system with effects
- ✅ Task distribution and execution

## 🖥️ Clients

The `clients` directory will contain different interfaces for the game:

### Planned Clients
- **Web Client**: Browser-based interface with React/Vue
- **CLI Client**: Command-line interface for terminal users
- **Desktop Client**: Native desktop application
- **Mobile Client**: Mobile app interface

## 🚀 Quick Start

### Install Dependencies
```bash
npm run install:all
```

### Run Tests
```bash
npm test
```

### Build Engine
```bash
npm run build
```

### Development
```bash
npm run dev
```

## 📋 Development Workflow

1. **Game Engine**: Core logic development in `GameEngine/`
2. **Client Development**: Interface development in `clients/`
3. **Testing**: Run tests for both engine and clients
4. **Integration**: Connect clients to game engine

## 🛠️ Technology Stack

### Game Engine
- **TypeScript**: Type-safe development
- **Jest**: Testing framework
- **Node.js**: Runtime environment

### Future Clients
- **Web**: React/Vue + TypeScript
- **CLI**: Node.js + Commander.js
- **Desktop**: Electron or Tauri
- **Mobile**: React Native or Flutter

## 📁 Directory Details

### GameEngine/
Contains the complete game engine implementation with:
- Core game models and logic
- Player management system
- Task and project handling
- Ability system
- AI player implementations
- Comprehensive test suite

### clients/
Will contain client applications that interface with the game engine:
- Each client will be a separate npm package
- Clients will import and use the game engine
- Different UI/UX approaches for different platforms

## 🔧 Configuration

The project uses npm workspaces for managing multiple packages:
- Root `package.json` manages workspace configuration
- Each subdirectory can have its own `package.json`
- Shared dependencies are managed at the root level

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in the appropriate directory
4. Run tests: `npm test`
5. Submit a pull request

## 📞 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Ready to build amazing game clients!** 🎮✨