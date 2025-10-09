# Bad Devs Game Engine - Client Integration

Этот проект содержит GameEngine для игры "Bad Devs" и готов для создания клиентских приложений.

## Структура проекта

```
bad-devs/
├── GameEngine/           # Основной движок игры
│   ├── src/
│   │   ├── index.ts     # Главный файл экспорта
│   │   ├── models/      # Основные модели игры
│   │   ├── services/    # Сервисы для генерации и решения задач
│   │   ├── players/     # Реализации игроков (AI и Human)
│   │   ├── types/       # Типы и интерфейсы
│   │   └── interfaces/  # Интерфейсы для взаимодействия
│   └── package.json
├── clients/             # Директория для клиентских приложений
├── test-exports.ts      # Тест для проверки экспортов
└── package.json         # Корневой package.json
```

## Экспортируемые классы и интерфейсы

### Основные модели

- `GameSession` - Сессия игры
- `Player` - Модель игрока
- `Project` - Проект для выполнения
- `Task` - Задача
- `GameRound` - Раунд игры
- `TaskDistribution` - Распределение задач
- `GameSettings` - Настройки игры

### Сервисы

- `TaskSolver` - Решение задач
- `TaskGenerator` - Генерация задач
- `AbilityGenerator` - Генерация способностей
- `AbilityService` - Сервис способностей

### Игроки

- `AIPlayer` - AI игрок
- `HumanPlayer` - Человеческий игрок
- `AITaskDistributor` - AI распределитель задач
- `HumanTaskDistributor` - Человеческий распределитель задач

### Типы и интерфейсы

- `PlayerSpecialization` - Специализация игрока
- `SkillType` - Типы навыков
- `AbilityType` - Типы способностей
- `PlayerInterface` - Интерфейс игрока
- И множество других интерфейсов для работы с игрой

## Использование

### Импорт из GameEngine

```typescript
import {
  GameSession,
  Player,
  Project,
  Task,
  GameSettings,
  AIPlayer,
  HumanPlayer,
  PlayerSpecialization,
  SkillType,
} from "./GameEngine/src/index";
```

### Создание игровой сессии

```typescript
// Создание настроек
const settings = new GameSettings();

// Создание игроков
const player1 = new Player({
  name: "Frontend Dev",
  specialization: "frontend",
  skills: {
    frontend: 8,
    backend: 3,
    management: 2,
    techBase: 5,
    softSkills: 4,
  },
  enthusiasm: 90,
  level: 1,
  experience: 0,
  money: 1000,
  abilities: [],
});

const player2 = new Player({
  name: "Backend Dev",
  specialization: "backend",
  skills: {
    frontend: 2,
    backend: 9,
    management: 3,
    techBase: 7,
    softSkills: 5,
  },
  enthusiasm: 85,
  level: 1,
  experience: 0,
  money: 1000,
  abilities: [],
});

// Создание проекта
const project = new Project({
  id: "web-app",
  name: "Web Application",
  description: "Modern web application",
  requiredLevel: 1,
  requirements: {
    frontend: 15,
    backend: 12,
    management: 8,
  },
  rewards: {
    baseSalary: 10000,
    bonusMultiplier: 1.5,
    experienceReward: 200,
  },
});

// Создание игровых интерфейсов
const aiPlayer = new AIPlayer(player1);
const humanPlayer = new HumanPlayer(player2);

// Создание игровой сессии
const gameSession = new GameSession({
  id: "session-1",
  players: [aiPlayer, humanPlayer],
  settings,
  maxPlayers: 4,
  project,
});
```

## Тестирование экспортов

Для проверки корректности экспортов запустите:

```bash
npm run test:exports
```

Этот тест создает все основные классы и проверяет, что они работают корректно.

## Создание клиента

Для создания нового клиента:

1. Создайте директорию в `clients/`
2. Добавьте `package.json` с зависимостями
3. Импортируйте необходимые классы из `../GameEngine/src/index`
4. Реализуйте UI/логику для взаимодействия с игрой

## Доступные команды

- `npm run test:exports` - Тест экспортов
- `npm run test:engine` - Тесты GameEngine
- `npm run build:engine` - Сборка GameEngine
- `npm run dev:engine` - Разработка GameEngine
- `npm run install:all` - Установка всех зависимостей
