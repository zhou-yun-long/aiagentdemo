import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectNavStore } from '../../features/navigation/projectNavStore';

const STORAGE_KEY = 'testing-platform.sidebar.collapsed';

// Mock localStorage for jsdom environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
  get length() { return Object.keys(storage).length; },
  key: vi.fn((_i: number) => null),
};

beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k]);
  Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
  useProjectNavStore.setState({ sidebarCollapsed: false });
});

describe('projectNavStore', () => {
  describe('sidebar collapse toggle', () => {
    it('toggleSidebar flips sidebarCollapsed from false to true', () => {
      useProjectNavStore.setState({ sidebarCollapsed: false });

      useProjectNavStore.getState().toggleSidebar();

      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(true);
    });

    it('toggleSidebar flips sidebarCollapsed from true to false', () => {
      useProjectNavStore.setState({ sidebarCollapsed: true });

      useProjectNavStore.getState().toggleSidebar();

      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(false);
    });

    it('multiple toggles cycle correctly', () => {
      useProjectNavStore.setState({ sidebarCollapsed: false });

      useProjectNavStore.getState().toggleSidebar();
      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(true);

      useProjectNavStore.getState().toggleSidebar();
      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(false);

      useProjectNavStore.getState().toggleSidebar();
      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(true);
    });

    it('setSidebarCollapsed sets the value directly', () => {
      useProjectNavStore.getState().setSidebarCollapsed(true);
      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(true);

      useProjectNavStore.getState().setSidebarCollapsed(false);
      expect(useProjectNavStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('toggleSidebar writes "true" to localStorage when expanding', () => {
      useProjectNavStore.setState({ sidebarCollapsed: false });

      useProjectNavStore.getState().toggleSidebar();

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('toggleSidebar writes "false" to localStorage when collapsing', () => {
      useProjectNavStore.setState({ sidebarCollapsed: true });

      useProjectNavStore.getState().toggleSidebar();

      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('setSidebarCollapsed writes to localStorage', () => {
      useProjectNavStore.getState().setSidebarCollapsed(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      useProjectNavStore.getState().setSidebarCollapsed(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('round-trip: set value persists in localStorage and can be read back', () => {
      useProjectNavStore.getState().setSidebarCollapsed(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      // Simulate page reload by reading from localStorage directly
      const storedValue = localStorage.getItem(STORAGE_KEY);
      expect(storedValue).toBe('true');
      expect(storedValue === 'true').toBe(true);
    });

    it('round-trip: toggle writes correct value and it persists', () => {
      useProjectNavStore.setState({ sidebarCollapsed: false });
      useProjectNavStore.getState().toggleSidebar();

      // Verify localStorage was written
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      // Toggle back
      useProjectNavStore.getState().toggleSidebar();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });
});
