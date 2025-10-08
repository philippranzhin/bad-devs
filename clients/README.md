# Bad Devs Clients

This directory contains client applications that provide different interfaces for the Bad Devs RPG game.

## 🎯 Overview

Clients connect to the Game Engine to provide user interfaces for:
- Playing the game
- Managing game sessions
- Viewing game state
- Interacting with other players

## 🖥️ Planned Clients

### Web Client (`web/`)
- **Technology**: React/Vue + TypeScript
- **Features**: 
  - Browser-based game interface
  - Real-time multiplayer support
  - Responsive design
  - Modern UI/UX

### CLI Client (`cli/`)
- **Technology**: Node.js + Commander.js
- **Features**:
  - Terminal-based interface
  - Quick game setup
  - Text-based game state display
  - Scriptable gameplay

### Desktop Client (`desktop/`)
- **Technology**: Electron or Tauri
- **Features**:
  - Native desktop application
  - Rich UI with animations
  - Offline gameplay support
  - System integration

### Mobile Client (`mobile/`)
- **Technology**: React Native or Flutter
- **Features**:
  - Mobile-optimized interface
  - Touch-friendly controls
  - Push notifications
  - Cross-platform support

## 🚀 Getting Started

### Creating a New Client

1. **Create client directory**:
   ```bash
   mkdir clients/my-client
   cd clients/my-client
   ```

2. **Initialize package**:
   ```bash
   npm init -y
   ```

3. **Install Game Engine**:
   ```bash
   npm install ../GameEngine
   ```

4. **Create basic structure**:
   ```
   my-client/
   ├── src/
   │   ├── index.ts
   │   ├── components/
   │   └── utils/
   ├── package.json
   └── README.md
   ```

### Basic Client Template

```typescript
// src/index.ts
import { GameSession, GameSettings, AIPlayer, HumanPlayer } from 'bad-devs-engine';

class MyClient {
  private gameSession: GameSession;

  constructor() {
    const settings = new GameSettings();
    const players = [
      new AIPlayer(/* player config */),
      new HumanPlayer(/* player config */)
    ];
    
    this.gameSession = new GameSession({
      id: 'session-1',
      project: /* project config */,
      players,
      settings,
      maxPlayers: 4
    });
  }

  async startGame() {
    // Client-specific game loop
    while (this.gameSession.isActive) {
      const result = await this.gameSession.executeRound();
      this.displayRoundResult(result);
    }
  }

  private displayRoundResult(result: any) {
    // Client-specific display logic
    console.log('Round completed:', result);
  }
}

// Start the client
const client = new MyClient();
client.startGame();
```

## 🔧 Client Architecture

### Common Patterns

All clients should follow these patterns:

1. **Engine Integration**: Import and use Game Engine classes
2. **Event Handling**: Listen to game events and update UI
3. **State Management**: Manage client-specific state
4. **User Input**: Handle user interactions and convert to game actions
5. **Display Logic**: Present game state in client-appropriate format

### Event Handling

```typescript
// Example event handling
player.onRoundStart((roundNumber, tasks) => {
  // Update UI with new round info
});

player.onRoundEnd((roundNumber, results) => {
  // Display round results
});

player.onProjectProgress((progress) => {
  // Update project progress display
});
```

### State Synchronization

```typescript
// Keep client state in sync with game state
class ClientState {
  private gameSession: GameSession;
  private uiState: UIState;

  constructor(gameSession: GameSession) {
    this.gameSession = gameSession;
    this.uiState = this.extractUIState();
  }

  private extractUIState(): UIState {
    return {
      currentRound: this.gameSession.currentRound,
      players: this.gameSession.players,
      project: this.gameSession.project,
      // ... other UI-relevant state
    };
  }

  updateUI() {
    const newState = this.extractUIState();
    this.renderUI(newState);
  }
}
```

## 📋 Development Guidelines

### Code Organization
- Separate UI logic from game logic
- Use TypeScript for type safety
- Follow the engine's patterns and conventions
- Implement proper error handling

### Testing
- Unit tests for client-specific logic
- Integration tests with the game engine
- UI tests for user interactions
- Performance tests for responsiveness

### Documentation
- Clear README for each client
- API documentation for client-specific APIs
- User guides for end users
- Developer guides for contributors

## 🛠️ Tools and Libraries

### Recommended Stack

**Web Client**:
- React/Vue + TypeScript
- Vite/Webpack for bundling
- Jest/Vitest for testing
- Tailwind CSS for styling

**CLI Client**:
- Commander.js for CLI interface
- Inquirer.js for interactive prompts
- Chalk for colored output
- Jest for testing

**Desktop Client**:
- Electron or Tauri
- React/Vue for UI
- Native APIs for system integration
- Jest for testing

**Mobile Client**:
- React Native or Flutter
- Platform-specific APIs
- Native performance optimization
- Platform testing tools

## 📦 Publishing

Each client can be published as a separate npm package:

```bash
# In client directory
npm publish
```

Or installed locally for development:

```bash
npm install ./clients/my-client
```

## 🔗 Integration

Clients integrate with the Game Engine through:

1. **Direct Import**: Import engine classes and use directly
2. **Event System**: Listen to game events for UI updates
3. **State Management**: Sync client state with game state
4. **User Input**: Convert user actions to game actions

## 📞 Contributing

1. Choose a client type to work on
2. Follow the client's specific README
3. Implement features following the architecture patterns
4. Add tests for new functionality
5. Submit pull requests for review

---

**Ready to build amazing game clients!** 🎮✨
