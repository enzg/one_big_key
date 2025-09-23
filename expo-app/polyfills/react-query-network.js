// React Query network detection polyfill for React Native
// This ensures React Query/TanStack Query always sees network as available

if (typeof global !== 'undefined') {
  // Mock the online status APIs that React Query uses
  const mockOnlineStatus = () => true;

  // Override any existing network detection
  if (global.navigator) {
    // Force navigator.onLine to always return true
    Object.defineProperty(global.navigator, 'onLine', {
      get: mockOnlineStatus,
      configurable: true,
      enumerable: true
    });
  }

  // Mock network information API that some query libraries use
  if (global.navigator && !global.navigator.connection) {
    global.navigator.connection = {
      effectiveType: '4g',
      type: 'wifi',
      onLine: true,
      addEventListener: function() {},
      removeEventListener: function() {}
    };
  }

  // Intercept and mock network-related event listeners
  const originalAddEventListener = global.addEventListener;
  const originalRemoveEventListener = global.removeEventListener;

  if (typeof global.addEventListener === 'function') {
    global.addEventListener = function(type, listener, options) {
      console.log('[REACT-QUERY-POLYFILL] addEventListener intercepted for:', type);

      if (type === 'online') {
        // Immediately trigger online event
        setTimeout(() => {
          if (typeof listener === 'function') {
            listener(new Event('online'));
          }
        }, 0);
        return;
      }

      if (type === 'offline') {
        // Never trigger offline events
        return;
      }

      // For other events, use original implementation if available
      if (originalAddEventListener) {
        return originalAddEventListener.call(this, type, listener, options);
      }
    };
  }

  // Mock window.addEventListener if it exists
  if (global.window && typeof global.window.addEventListener === 'function') {
    const originalWindowAddEventListener = global.window.addEventListener;

    global.window.addEventListener = function(type, listener, options) {
      console.log('[REACT-QUERY-POLYFILL] window.addEventListener intercepted for:', type);

      if (type === 'online') {
        // Immediately trigger online event
        setTimeout(() => {
          if (typeof listener === 'function') {
            listener(new Event('online'));
          }
        }, 0);
        return;
      }

      if (type === 'offline') {
        // Never trigger offline events
        return;
      }

      // For other events, use original implementation
      return originalWindowAddEventListener.call(this, type, listener, options);
    };
  }

  console.log('[REACT-QUERY-POLYFILL] React Query network polyfill loaded');
}