import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom no implementa matchMedia ni los métodos modales de <dialog>.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn<(query: string) => Partial<MediaQueryList>>((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
    dispatchEvent: vi.fn<() => boolean>(),
  })),
});

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
