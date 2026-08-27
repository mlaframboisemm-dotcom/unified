export interface SingleFlightGate {
  tryAcquire: () => boolean;
  release: () => void;
  isActive: () => boolean;
}

/** Prevents overlapping refreshes while allowing a completed request to be retried. */
export function createSingleFlightGate(): SingleFlightGate {
  let active = false;

  return {
    tryAcquire: () => {
      if (active) return false;
      active = true;
      return true;
    },
    release: () => {
      active = false;
    },
    isActive: () => active
  };
}
