import { describe, expect, it } from 'vitest';
import { SPEED_STATE_OPTIONS } from './SpeedPresetSelector';

describe('SPEED_STATE_OPTIONS', () => {
  it('maps the three tournament states to slow, medium, and fast', () => {
    expect(SPEED_STATE_OPTIONS).toEqual([
      { level: 'slow', label: 'STATE 1' },
      { level: 'medium', label: 'STATE 2' },
      { level: 'fast', label: 'STATE 3' },
    ]);
  });
});
