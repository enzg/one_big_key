// Minimal DOM polyfill specifically for WalletConnect and expo-router requirements
// Only adds missing DOM methods that libraries actually use

// Force DOM polyfill to always load to ensure all methods are available
if (typeof global !== 'undefined') {
  // Create or extend the document object
  const existingDocument = global.document || {};
  global.document = {
    ...existingDocument,
    getElementsByTagName: function (tagName) {
      console.log('[DOM-POLYFILL] getElementsByTagName called for:', tagName);
      // Return empty array for any tag queries
      return [];
    },

    getElementById: function (id) {
      console.log('[DOM-POLYFILL] getElementById called for:', id);
      return null;
    },

    querySelector: function (selector) {
      console.log('[DOM-POLYFILL] querySelector called for:', selector);
      return null;
    },

    querySelectorAll: function (selector) {
      console.log('[DOM-POLYFILL] querySelectorAll called for:', selector);
      return [];
    },

    createElement: function (tagName) {
      console.log('[DOM-POLYFILL] createElement called for:', tagName);
      return {
        tagName: tagName,
        style: {},
        appendChild: function () {},
        removeChild: function () {},
        setAttribute: function () {},
        getAttribute: function () {
          return null;
        },
        addEventListener: function () {},
        removeEventListener: function () {},
      };
    },

    createTextNode: function (text) {
      console.log('[DOM-POLYFILL] createTextNode called for:', text);
      const textNode = {
        nodeType: 3, // TEXT_NODE
        nodeName: '#text',
        nodeValue: text,
        textContent: text,
        data: text,
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        ownerDocument: global.document,
        cloneNode: function() {
          return global.document.createTextNode(text);
        }
      };
      return textNode;
    },

    createTreeWalker: function (root, whatToShow, filter) {
      console.log('[DOM-POLYFILL] createTreeWalker called');
      return {
        root: root || global.document,
        whatToShow: whatToShow || 0xFFFFFFFF,
        filter: filter || null,
        currentNode: root || global.document,
        nextNode: function() { return null; },
        previousNode: function() { return null; },
        firstChild: function() { return null; },
        lastChild: function() { return null; },
        parentNode: function() { return null; },
        nextSibling: function() { return null; },
        previousSibling: function() { return null; }
      };
    },

    head: {
      appendChild: function () {},
      removeChild: function () {},
    },

    body: {
      appendChild: function () {},
      removeChild: function () {},
      insertAdjacentElement: function(position, element) {
        console.log('[DOM-POLYFILL] body.insertAdjacentElement called with position:', position);
        return element;
      },
    },

    addEventListener: function () {},
    removeEventListener: function () {},
  };

  // Add navigator with network detection
  if (typeof global.navigator === 'undefined') {
    global.navigator = {
      onLine: true, // Always report as online
      userAgent: 'React Native',
      platform: 'React Native',
      connection: {
        effectiveType: '4g',
        type: 'wifi',
      },
    };
  }

  // Mock fetch for network checks that always succeeds
  if (typeof global.fetch === 'undefined') {
    global.fetch = function() {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
        json: () => Promise.resolve({}),
      });
    };
  }

  // Add customElements for Web Components support
  if (typeof global.customElements === 'undefined') {
    global.customElements = {
      define: function(name, constructor, options) {
        console.log('[DOM-POLYFILL] customElements.define called for:', name);
      },
      get: function(name) {
        console.log('[DOM-POLYFILL] customElements.get called for:', name);
        return undefined;
      },
      whenDefined: function(name) {
        console.log('[DOM-POLYFILL] customElements.whenDefined called for:', name);
        return Promise.resolve();
      }
    };
  }

  // CSSStyleSheet polyfill for Lit framework Web Components
  if (typeof global.CSSStyleSheet === 'undefined') {
    global.CSSStyleSheet = function CSSStyleSheet() {
      this.cssRules = [];
      this.rules = this.cssRules; // IE compatibility
    };

    global.CSSStyleSheet.prototype = {
      insertRule: function(rule, index) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.insertRule called:', rule);
        if (index === undefined) index = this.cssRules.length;
        this.cssRules.splice(index, 0, { cssText: rule });
        return index;
      },
      deleteRule: function(index) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.deleteRule called:', index);
        this.cssRules.splice(index, 1);
      },
      addRule: function(selector, style, index) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.addRule called:', selector, style);
        const rule = selector + ' { ' + style + ' }';
        return this.insertRule(rule, index);
      },
      removeRule: function(index) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.removeRule called:', index);
        this.deleteRule(index);
      },
      replace: function(text) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.replace called');
        return Promise.resolve(this);
      },
      replaceSync: function(text) {
        console.log('[DOM-POLYFILL] CSSStyleSheet.replaceSync called');
        this.cssRules = [];
      }
    };
  }

  // Mock adoptedStyleSheets for shadowRoot compatibility
  if (global.document && global.document.documentElement && !global.document.documentElement.adoptedStyleSheets) {
    Object.defineProperty(global.document.documentElement, 'adoptedStyleSheets', {
      get: function() { return []; },
      set: function(value) { console.log('[DOM-POLYFILL] adoptedStyleSheets set:', value); },
      enumerable: true,
      configurable: true
    });
  }

  // Add CustomEvent for Wagmi/Web3 libraries
  if (typeof global.CustomEvent === 'undefined') {
    global.CustomEvent = function CustomEvent(type, options) {
      const event = {
        type: type,
        detail: options ? options.detail : null,
        bubbles: options ? !!options.bubbles : false,
        cancelable: options ? !!options.cancelable : false,
        composed: options ? !!options.composed : false,
        target: null,
        currentTarget: null,
        defaultPrevented: false,
        preventDefault: function() {
          this.defaultPrevented = true;
        },
        stopPropagation: function() {},
        stopImmediatePropagation: function() {}
      };
      console.log('[DOM-POLYFILL] CustomEvent created:', type, options);
      return event;
    };
  }

  // Add Event constructor
  if (typeof global.Event === 'undefined') {
    global.Event = function Event(type, options) {
      const event = {
        type: type,
        bubbles: options ? !!options.bubbles : false,
        cancelable: options ? !!options.cancelable : false,
        composed: options ? !!options.composed : false,
        target: null,
        currentTarget: null,
        defaultPrevented: false,
        preventDefault: function() {
          this.defaultPrevented = true;
        },
        stopPropagation: function() {},
        stopImmediatePropagation: function() {}
      };
      console.log('[DOM-POLYFILL] Event created:', type, options);
      return event;
    };
  }

  // Add window object for web compatibility with React Query support
  if (typeof global.window === 'undefined') {
    global.window = {
      ...global,
      document: global.document,
      navigator: global.navigator,
      customElements: global.customElements,
      CSSStyleSheet: global.CSSStyleSheet,
      CustomEvent: global.CustomEvent,
      Event: global.Event,
      addEventListener: function(event, handler) {
        console.log('[DOM-POLYFILL] addEventListener called for:', event);
        // For React Query's online/offline detection, always stay online
        if (event === 'online' && handler) {
          // Immediately call the handler to signal we're online
          setTimeout(() => handler(new Event('online')), 0);
        }
        // Never trigger offline events
      },
      removeEventListener: function(event, handler) {
        console.log('[DOM-POLYFILL] removeEventListener called for:', event);
      },
      dispatchEvent: function(event) {
        console.log('[DOM-POLYFILL] dispatchEvent called for:', event);
        // Return true to indicate event was processed
        return true;
      },
      location: {
        href: 'https://localhost:8081',
        protocol: 'https:',
        hostname: 'localhost',
        port: '8081',
      },
      // React Query specific properties
      onlineStatus: true,
      isOnline: true,
    };
  }

  // Ensure React Query always sees the app as online
  if (global.window && global.navigator) {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: false,
      configurable: false
    });

    Object.defineProperty(global.window, 'navigator', {
      value: global.navigator,
      writable: false,
      configurable: false
    });
  }

  console.log('[DOM-POLYFILL] Enhanced DOM polyfill loaded with network detection');
}
