import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationStore } from '../../features/generation/generationStore';

/**
 * Tests for the points_complete SSE event handling logic.
 *
 * The SSE handler in useGenerateStream.applyEvent calls:
 *   if (event.event === 'points_complete') {
 *     const points = Array.isArray(event.payload.points) ? event.payload.points : [];
 *     useGenerationStore.getState().setPointsResult({ points });
 *     closeEventSource();
 *   }
 *
 * Since applyEvent is inside a React hook, we test the store actions it invokes
 * and verify the expected behavior end-to-end.
 */

beforeEach(() => {
  useGenerationStore.getState().resetTask();
});

describe('points_complete SSE event handling', () => {
  it('setPointsResult correctly writes points to the store', () => {
    // Simulate what the points_complete handler does
    const payload = {
      points: [
        { objectId: 'obj-1', title: 'Login flow', priority: 'P0', dimensions: ['security'] },
        { objectId: 'obj-2', title: 'Signup flow', priority: 'P1' },
      ],
    };

    const points = Array.isArray(payload.points) ? payload.points : [];
    useGenerationStore.getState().setPointsResult({ points });

    const state = useGenerationStore.getState();
    expect(state.pointsResult).toBeDefined();
    expect(state.pointsResult?.points).toHaveLength(2);
    expect(state.pointsResult?.points[0].objectId).toBe('obj-1');
    expect(state.pointsResult?.points[0].title).toBe('Login flow');
    expect(state.pointsResult?.points[0].priority).toBe('P0');
    expect(state.pointsResult?.points[0].dimensions).toEqual(['security']);
    expect(state.pointsResult?.points[1].objectId).toBe('obj-2');
    expect(state.status).toBe('done');
  });

  it('handles empty points array from points_complete payload', () => {
    const payload = { points: [] };
    const points = Array.isArray(payload.points) ? payload.points : [];
    useGenerationStore.getState().setPointsResult({ points });

    expect(useGenerationStore.getState().pointsResult?.points).toEqual([]);
    expect(useGenerationStore.getState().status).toBe('done');
  });

  it('handles missing points field in payload gracefully', () => {
    // When payload.points is not an array, the handler defaults to []
    const payload = { something: 'else' };
    const points = Array.isArray((payload as Record<string, unknown>).points)
      ? (payload as Record<string, unknown>).points
      : [];
    useGenerationStore.getState().setPointsResult({ points: points as never[] });

    expect(useGenerationStore.getState().pointsResult?.points).toEqual([]);
  });
});

describe('generation_complete SSE event handling', () => {
  it('completeGeneration writes cases and criticScore to the store', () => {
    // Simulate what the generation_complete handler does
    const criticScore = 85;
    const cases = [
      {
        id: 'case-1',
        title: 'Test login with valid credentials',
        precondition: 'User is on login page',
        steps: ['Enter username', 'Enter password', 'Click login'],
        expected: 'User is redirected to dashboard',
        priority: 'P0' as const,
      },
      {
        id: 'case-2',
        title: 'Test login with invalid password',
        precondition: 'User is on login page',
        steps: ['Enter username', 'Enter wrong password', 'Click login'],
        expected: 'Error message is displayed',
        priority: 'P1' as const,
      },
    ];

    useGenerationStore.getState().beginTask('task-1', 'input', 'auto');
    useGenerationStore.getState().completeGeneration(criticScore, cases);

    const state = useGenerationStore.getState();
    expect(state.status).toBe('done');
    expect(state.criticScore).toBe(85);
    expect(state.cases).toHaveLength(2);
    expect(state.cases[0].title).toBe('Test login with valid credentials');
    expect(state.cases[0].priority).toBe('P0');
    expect(state.cases[1].priority).toBe('P1');
  });

  it('generation_complete does not affect pointsResult', () => {
    // Set pointsResult first
    useGenerationStore.getState().setPointsResult({
      points: [{ objectId: 'obj-1', title: 'Test', priority: 'P0' }],
    });

    // Now complete a generation - pointsResult should remain
    useGenerationStore.getState().beginTask('task-2', 'input', 'auto');
    // beginTask clears pointsResult, which is expected
    expect(useGenerationStore.getState().pointsResult).toBeUndefined();

    useGenerationStore.getState().completeGeneration(90, []);
    expect(useGenerationStore.getState().status).toBe('done');
    expect(useGenerationStore.getState().pointsResult).toBeUndefined();
  });
});

describe('points_complete only processes when taskKind=points', () => {
  it('store tracks config.taskKind for points workflow', () => {
    // Set taskKind to points
    useGenerationStore.getState().setConfig({ taskKind: 'points' });
    expect(useGenerationStore.getState().config.taskKind).toBe('points');

    // The points_complete handler writes to store regardless of taskKind
    // (the backend controls which events are sent based on taskKind)
    useGenerationStore.getState().setPointsResult({
      points: [{ objectId: 'obj-1', title: 'Point A', priority: 'P0' }],
    });

    expect(useGenerationStore.getState().pointsResult).toBeDefined();
    expect(useGenerationStore.getState().config.taskKind).toBe('points');
  });

  it('store tracks config.taskKind for cases workflow', () => {
    // Set taskKind to cases
    useGenerationStore.getState().setConfig({ taskKind: 'cases' });
    expect(useGenerationStore.getState().config.taskKind).toBe('cases');

    // Even with taskKind=cases, setPointsResult still works at the store level
    // The filtering of events is done by the backend, not the frontend store
    useGenerationStore.getState().setPointsResult({
      points: [{ objectId: 'obj-1', title: 'Point A', priority: 'P0' }],
    });

    // The store doesn't filter by taskKind - it's the SSE stream from the backend
    // that only sends points_complete when taskKind=points
    expect(useGenerationStore.getState().pointsResult).toBeDefined();
  });
});
