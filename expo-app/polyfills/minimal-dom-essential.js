// Minimal essential DOM polyfills - only if not on web
if (typeof window !== 'undefined' && typeof document === 'undefined') {
  console.log('[DOM-ESSENTIAL] Adding minimal DOM polyfills for React Native');

  // Create minimal document for React Native (not web)
  global.document = {
    createElement: function(tag) {
      return {
        style: {},
        setAttribute: function() {},
        getAttribute: function() { return null; },
        appendChild: function(child) { return child; },
        removeChild: function(child) { return child; },
        addEventListener: function() {},
        removeEventListener: function() {},
        textContent: '',
        innerHTML: '',
        tagName: tag?.toUpperCase() || 'DIV',
      };
    },
    head: {
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; },
    },
    body: {
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; },
    },
    getElementsByTagName: function() { return []; },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    getElementById: function() { return null; },
    createTextNode: function(text) { return { textContent: text, nodeValue: text }; },
    addEventListener: function() {},
    removeEventListener: function() {},
  };

  // Set on window as well
  window.document = global.document;
} else if (typeof document !== 'undefined') {
  console.log('[DOM-ESSENTIAL] Web environment detected, using native DOM APIs');
}