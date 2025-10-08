import { Project } from '../models/Project';

describe('Project', () => {
  describe('creation', () => {
    it('should create project with all properties', () => {
      // Arrange & Act
      const project = new Project({
        id: 'proj-1',
        name: 'E-commerce Platform',
        description: 'Build a modern e-commerce platform',
        requiredLevel: 3,
        requirements: {
          frontend: 50,
          backend: 40,
          management: 20
        },
        rewards: {
          baseSalary: 1000,
          bonusMultiplier: 1.5,
          experienceReward: 100
        }
      });

      // Assert
      expect(project.id).toBe('proj-1');
      expect(project.name).toBe('E-commerce Platform');
      expect(project.description).toBe('Build a modern e-commerce platform');
      expect(project.requiredLevel).toBe(3);
      expect(project.requirements.frontend).toBe(50);
      expect(project.requirements.backend).toBe(40);
      expect(project.requirements.management).toBe(20);
      expect(project.rewards.baseSalary).toBe(1000);
      expect(project.rewards.bonusMultiplier).toBe(1.5);
      expect(project.rewards.experienceReward).toBe(100);
      expect(project.isCompleted).toBe(false);
      expect(project.currentProgress.frontend).toBe(0);
      expect(project.currentProgress.backend).toBe(0);
      expect(project.currentProgress.management).toBe(0);
    });
  });

  describe('progress tracking', () => {
    it('should add progress correctly', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act
      project.addProgress('frontend', 5);
      project.addProgress('backend', 3);

      // Assert
      expect(project.currentProgress.frontend).toBe(5);
      expect(project.currentProgress.backend).toBe(3);
      expect(project.currentProgress.management).toBe(0);
      expect(project.isCompleted).toBe(false);
    });

    it('should complete project when all requirements met', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act
      project.addProgress('frontend', 10);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Assert
      expect(project.isCompleted).toBe(true);
      expect(project.isProjectCompleted()).toBe(true);
    });

    it('should throw error when adding progress to completed project', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act - завершаем проект
      project.addProgress('frontend', 10);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Assert - пытаемся добавить прогресс в завершенный проект
      expect(() => {
        project.addProgress('frontend', 1);
      }).toThrow('Cannot add progress to completed project');
    });
  });

  describe('completion percentage', () => {
    it('should calculate completion percentage correctly', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 20, backend: 10, management: 10 }, // всего 40
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act
      project.addProgress('frontend', 10); // 10 из 40 = 25%
      project.addProgress('backend', 5);  // 15 из 40 = 37.5%

      // Assert
      expect(project.getCompletionPercentage()).toBeCloseTo(37.5, 1);
    });

    it('should cap completion percentage at 100%', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act - добавляем больше чем нужно
      project.addProgress('frontend', 15);
      project.addProgress('backend', 10);
      project.addProgress('management', 5);

      // Assert
      expect(project.getCompletionPercentage()).toBe(100);
    });
  });

  describe('validation', () => {
    it('should throw error for empty project ID', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: '',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project ID cannot be empty');
    });

    it('should throw error for whitespace-only project ID', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: '   ',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project ID cannot be empty');
    });

    it('should throw error for empty project name', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: '',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project name cannot be empty');
    });

    it('should throw error for whitespace-only project name', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: '   ',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project name cannot be empty');
    });

    it('should throw error for required level less than 1', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 0,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project required level must be at least 1');
    });

    it('should throw error for negative requirements', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: -1, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project requirements cannot be negative');
    });

    it('should throw error for all zero requirements', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 0, backend: 0, management: 0 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project must have at least one non-zero requirement');
    });

    it('should throw error for negative base salary', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: -100, bonusMultiplier: 1, experienceReward: 10 }
        });
      }).toThrow('Project base salary and experience reward cannot be negative');
    });

    it('should throw error for negative experience reward', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: -10 }
        });
      }).toThrow('Project base salary and experience reward cannot be negative');
    });

    it('should throw error for bonus multiplier less than 1', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 1,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 0.5, experienceReward: 10 }
        });
      }).toThrow('Project bonus multiplier must be at least 1');
    });

    it('should allow valid project configuration', () => {
      // Arrange & Act & Assert - не должно быть ошибки
      expect(() => {
        new Project({
          id: 'proj-1',
          name: 'Test Project',
          description: 'Test',
          requiredLevel: 5,
          requirements: { frontend: 10, backend: 5, management: 3 },
          rewards: { baseSalary: 100, bonusMultiplier: 2.5, experienceReward: 10 }
        });
      }).not.toThrow();
    });
  });

  describe('progress validation', () => {
    it('should throw error for negative progress', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act & Assert
      expect(() => {
        project.addProgress('frontend', -5);
      }).toThrow('Cannot add negative progress');
    });

    it('should allow zero progress', () => {
      // Arrange
      const project = new Project({
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test',
        requiredLevel: 1,
        requirements: { frontend: 10, backend: 5, management: 3 },
        rewards: { baseSalary: 100, bonusMultiplier: 1, experienceReward: 10 }
      });

      // Act & Assert - не должно быть ошибки
      expect(() => {
        project.addProgress('frontend', 0);
      }).not.toThrow();
    });
  });
});
