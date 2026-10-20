import { describe, expect, it } from 'vitest';
import { isPaused, type PauseRule } from './plan-pauses.ts';

const household: PauseRule = {
  memberId: null,
  planId: null,
  startsOn: '2026-12-20',
  endsOn: '2026-12-28',
};
const luisOnly: PauseRule = { ...household, memberId: 'luis' };
const trashOnly: PauseRule = { ...household, planId: 'trash' };

const trash = { id: 'trash', assigneeId: 'luis' };
const dishes = { id: 'dishes', assigneeId: 'iveth' };

describe('isPaused', () => {
  it('una pausa de hogar detiene todos los planes dentro del rango, inclusive', () => {
    expect(isPaused([household], trash, '2026-12-20')).toBe(true);
    expect(isPaused([household], dishes, '2026-12-28')).toBe(true);
    expect(isPaused([household], dishes, '2026-12-19')).toBe(false);
    expect(isPaused([household], dishes, '2026-12-29')).toBe(false);
  });

  it('una pausa por persona solo detiene los planes asignados a ella', () => {
    expect(isPaused([luisOnly], trash, '2026-12-22')).toBe(true);
    expect(isPaused([luisOnly], dishes, '2026-12-22')).toBe(false);
    expect(isPaused([luisOnly], { id: 'x', assigneeId: null }, '2026-12-22')).toBe(false);
  });

  it('una pausa por plan solo detiene ese plan', () => {
    expect(isPaused([trashOnly], trash, '2026-12-22')).toBe(true);
    expect(isPaused([trashOnly], { id: 'other', assigneeId: 'luis' }, '2026-12-22')).toBe(false);
  });

  it('sin pausas nunca detiene', () => {
    expect(isPaused([], trash, '2026-12-22')).toBe(false);
  });
});
