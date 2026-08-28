import { describe, expect, it } from 'vitest';

describe('optional dashboard modules', () => {
  it('exposes deferred dashboard hubs through default exports', async () => {
    const modules = await Promise.all([
      import('../pages/DeploymentDashboard'),
      import('./SovereignIntelligenceView'),
      import('./GooglePayAndPassHub'),
      import('./WiseCardDashboard')
    ]);

    modules.forEach((module) => expect(module.default).toBeTypeOf('function'));
  });
});
