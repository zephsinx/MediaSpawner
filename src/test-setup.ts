import "@testing-library/jest-dom";

// Polyfill ResizeObserver for Headless UI components in JSDOM
class ResizeObserverPolyfill {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverPolyfill;
