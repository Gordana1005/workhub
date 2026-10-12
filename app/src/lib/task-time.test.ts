import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, parseDuration, sumDurationsByTask, timeProgress, type DurationTranslate } from './task-time'

const t: DurationTranslate = (key, values = {}) => {
  switch (key) {
    case 'durationHM':
      return `${values.hours}h ${values.minutes}m`
    case 'durationH':
      return `${values.hours}h`
    case 'durationM':
      return `${values.minutes}m`
    default:
      return '<1m'
  }
}

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(4800, t)).toBe('1h 20m')
    expect(formatDuration(7200, t)).toBe('2h')
    expect(formatDuration(2700, t)).toBe('45m')
  })
  it('handles zero and sub-minute values', () => {
    expect(formatDuration(0, t)).toBe('0m')
    expect(formatDuration(10, t)).toBe('<1m')
    expect(formatDuration(-5, t)).toBe('0m')
  })
  it('rounds to the nearest minute (59m40s -> 1h)', () => {
    expect(formatDuration(59 * 60 + 40, t)).toBe('1h')
  })
})

describe('formatClock', () => {
  it('pads hh:mm:ss', () => {
    expect(formatClock(3725)).toBe('01:02:05')
    expect(formatClock(-3)).toBe('00:00:00')
  })
})

describe('parseDuration', () => {
  it('parses unit forms', () => {
    expect(parseDuration('1h 20m')).toBe(4800)
    expect(parseDuration('1h20m')).toBe(4800)
    expect(parseDuration('45m')).toBe(2700)
    expect(parseDuration('2h')).toBe(7200)
    expect(parseDuration('1.5h')).toBe(5400)
    expect(parseDuration('1,5 h')).toBe(5400)
  })
  it('parses clock and bare minutes', () => {
    expect(parseDuration('1:30')).toBe(5400)
    expect(parseDuration('0:05')).toBe(300)
    expect(parseDuration('90')).toBe(5400)
  })
  it('parses Macedonian units', () => {
    expect(parseDuration('1 ч 20 мин')).toBe(4800)
    expect(parseDuration('30 мин')).toBe(1800)
  })
  it('rejects junk, zero and absurd values', () => {
    for (const bad of ['', 'abc', '0', '0m', '1:75', '1h 20', '25h', '-5', '1x']) {
      expect(parseDuration(bad)).toBeNull()
    }
  })
})

describe('timeProgress', () => {
  it('reports percent, remaining and overrun', () => {
    expect(timeProgress(3600, 2)).toMatchObject({ percent: 50, over: false, hasEstimate: true, remaining: 3600 })
    expect(timeProgress(10800, 2)).toMatchObject({ percent: 100, over: true, overBy: 3600, remaining: 0 })
  })
  it('has no estimate for empty / zero estimates', () => {
    expect(timeProgress(100, null).hasEstimate).toBe(false)
    expect(timeProgress(100, 0).hasEstimate).toBe(false)
  })
})

describe('sumDurationsByTask', () => {
  it('sums per task and skips rows without task or duration', () => {
    expect(
      sumDurationsByTask([
        { task_id: 'a', duration: 60 },
        { task_id: 'a', duration: 30 },
        { task_id: 'b', duration: 0 },
        { task_id: null, duration: 99 },
        { task_id: 'c', duration: null },
      ])
    ).toEqual({ a: 90 })
  })
})
