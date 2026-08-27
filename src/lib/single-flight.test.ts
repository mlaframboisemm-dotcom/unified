import { describe, expect, it } from 'vitest';
import { createSingleFlightGate } from './single-flight';

describe('createSingleFlightGate', () => {
  it('allows one request at a time and permits a retry after release', () => {
    const gate = createSingleFlightGate();

    expect(gate.isActive()).toBe(false);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.isActive()).toBe(true);
    expect(gate.tryAcquire()).toBe(false);
    gate.release();
    expect(gate.isActive()).toBe(false);
    expect(gate.tryAcquire()).toBe(true);
  });
});
