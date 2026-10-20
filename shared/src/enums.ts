export const ROLES = ['ADMIN', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const TASK_STATUSES = ['PENDING', 'DONE', 'SKIPPED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_ORIGINS = ['MANUAL', 'PLAN'] as const;
export type TaskOrigin = (typeof TASK_ORIGINS)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const GOAL_PERIODS = ['WEEKLY', 'MONTHLY'] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const GOAL_STATUSES = ['OK', 'WARNING', 'EXCEEDED'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
