import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationStore } from '../../features/generation/generationStore';

const defaultConfig = {
  taskKind: 'cases' as const,
  businessScenarios: [],
  dimensions: [],
  granularity: 'M' as const,
  targetPlatforms: [],
  outputFormat: 'table' as const,
  customPrompt: '',
  referenceCases: [],
};

beforeEach(() => {
  // Reset the store to initial state before each test
  useGenerationStore.getState().resetTask();
});

describe('generationStore', () => {
  describe('setConfig', () => {
    it('merges patch into existing config (shallow merge)', () => {
      const { setConfig } = useGenerationStore.getState();

      setConfig({ granularity: 'L' });

      const config = useGenerationStore.getState().config;
      expect(config.granularity).toBe('L');
      // Other fields remain unchanged
      expect(config.taskKind).toBe(defaultConfig.taskKind);
      expect(config.outputFormat).toBe(defaultConfig.outputFormat);
      expect(config.customPrompt).toBe(defaultConfig.customPrompt);
    });

    it('overwrites only the specified fields', () => {
      const { setConfig } = useGenerationStore.getState();

      setConfig({ taskKind: 'points', customPrompt: 'hello' });

      const config = useGenerationStore.getState().config;
      expect(config.taskKind).toBe('points');
      expect(config.customPrompt).toBe('hello');
      expect(config.granularity).toBe(defaultConfig.granularity);
      expect(config.dimensions).toEqual(defaultConfig.dimensions);
    });

    it('can update array fields', () => {
      const { setConfig } = useGenerationStore.getState();

      setConfig({ businessScenarios: ['login', 'signup'] });

      const config = useGenerationStore.getState().config;
      expect(config.businessScenarios).toEqual(['login', 'signup']);
    });
  });

  describe('resetConfig', () => {
    it('restores config to defaults after modifications', () => {
      const { setConfig, resetConfig } = useGenerationStore.getState();

      // Modify several fields
      setConfig({
        taskKind: 'points',
        granularity: 'L',
        customPrompt: 'modified',
        businessScenarios: ['a', 'b'],
      });

      expect(useGenerationStore.getState().config.taskKind).toBe('points');

      // Reset
      resetConfig();

      const config = useGenerationStore.getState().config;
      expect(config).toEqual(defaultConfig);
    });
  });

  describe('pointsResult', () => {
    it('setPointsResult writes pointsResult and sets status to done', () => {
      const { setPointsResult } = useGenerationStore.getState();

      const result = {
        points: [
          { objectId: 'obj-1', title: 'Login', priority: 'P0' },
          { objectId: 'obj-2', title: 'Signup', priority: 'P1', dimensions: ['d1'] },
        ],
      };

      setPointsResult(result);

      const state = useGenerationStore.getState();
      expect(state.pointsResult).toEqual(result);
      expect(state.status).toBe('done');
    });

    it('pointsResult persists across multiple getState calls', () => {
      const result = {
        points: [{ objectId: 'obj-1', title: 'Test', priority: 'P0' }],
      };

      useGenerationStore.getState().setPointsResult(result);

      // Read again from the store
      expect(useGenerationStore.getState().pointsResult).toEqual(result);
      // And again
      expect(useGenerationStore.getState().pointsResult?.points).toHaveLength(1);
    });
  });

  describe('beginTask / resetTask clear pointsResult', () => {
    it('beginTask clears pointsResult', () => {
      // First set some pointsResult
      useGenerationStore.getState().setPointsResult({
        points: [{ objectId: 'obj-1', title: 'Test', priority: 'P0' }],
      });
      expect(useGenerationStore.getState().pointsResult).toBeDefined();

      // beginTask should clear it
      useGenerationStore.getState().beginTask('task-123', 'input', 'auto');

      expect(useGenerationStore.getState().pointsResult).toBeUndefined();
      expect(useGenerationStore.getState().status).toBe('running');
    });

    it('resetTask clears pointsResult', () => {
      // First set some pointsResult
      useGenerationStore.getState().setPointsResult({
        points: [{ objectId: 'obj-1', title: 'Test', priority: 'P0' }],
      });
      expect(useGenerationStore.getState().pointsResult).toBeDefined();

      // resetTask should clear it
      useGenerationStore.getState().resetTask();

      expect(useGenerationStore.getState().pointsResult).toBeUndefined();
      expect(useGenerationStore.getState().status).toBe('idle');
    });

    it('resetTask also resets config to defaults', () => {
      useGenerationStore.getState().setConfig({ taskKind: 'points', granularity: 'L' });
      useGenerationStore.getState().resetTask();

      expect(useGenerationStore.getState().config).toEqual(defaultConfig);
    });
  });
});
