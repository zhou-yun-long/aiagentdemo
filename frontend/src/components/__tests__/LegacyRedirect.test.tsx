/**
 * LegacyRedirect 单元测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LegacyRedirect from '../LegacyRedirect';

/**
 * 辅助函数：在 MemoryRouter 中渲染 LegacyRedirect，验证重定向目标。
 *
 * LegacyRedirect 内部使用 <Navigate to="..." replace />，
 * 当重定向发生时，匹配的 Route 会渲染目标内容。
 */
function renderWithRouter(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<LegacyRedirect />} />
        <Route path="/cases" element={<LegacyRedirect />} />
        <Route
          path="/projects/:projectId/cases"
          element={<div data-testid="project-cases">Project Cases</div>}
        />
        <Route
          path="/projects"
          element={<div data-testid="projects-list">Projects List</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('LegacyRedirect', () => {
  it('/?projectId=1 -> /projects/1/cases', () => {
    renderWithRouter('/?projectId=1');
    expect(screen.getByTestId('project-cases')).toBeInTheDocument();
  });

  it('/cases?projectId=2 -> /projects/2/cases', () => {
    renderWithRouter('/cases?projectId=2');
    expect(screen.getByTestId('project-cases')).toBeInTheDocument();
  });

  it('/?projectId=abc (non-numeric) -> /projects', () => {
    renderWithRouter('/?projectId=abc');
    expect(screen.getByTestId('projects-list')).toBeInTheDocument();
  });

  it('/ (no query) -> /projects', () => {
    renderWithRouter('/');
    expect(screen.getByTestId('projects-list')).toBeInTheDocument();
  });

  it('/cases (no query) -> /projects', () => {
    renderWithRouter('/cases');
    expect(screen.getByTestId('projects-list')).toBeInTheDocument();
  });
});
