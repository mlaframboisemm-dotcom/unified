import { describe, expect, it } from 'vitest';

describe('MonthlyReportModal on-demand module', () => {
  it('exposes the modal through a dynamically loadable default export', async () => {
    const module = await import('./MonthlyReportModal');

    expect(module.default).toBe(module.MonthlyReportModal);
  });
});
