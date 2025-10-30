/**
 * flash_unified — Core utilities for reading and rendering embedded flash messages.
 *
 * See README.md for full usage examples and integration notes.
 *
 * @module flash_unified
 */

/**
 * Custom renderer function set by user. When null, defaultRenderer is used.
 * @type {Function|null}
 */
let customRenderer = null;

/**
 * Set a custom renderer function to replace the default DOM-based rendering.
 * Pass `null` to reset to default behavior.
 *
 * @param {Function|null} fn - A function that receives an array of message objects: [{type, message}, ...]
 * @returns {void}
 * @throws {TypeError} If fn is neither a function nor null
 *
 * @example
 * import { setFlashMessageRenderer } from 'flash_unified';
 * // Use toastr for notifications
 * setFlashMessageRenderer((messages) => {
 *   messages.forEach(({ type, message }) => {
 *     toastr[type === 'alert' ? 'error' : 'info'](message);
 *   });
 * });
 */
function setFlashMessageRenderer(fn) {
  if (fn !== null && typeof fn !== 'function') {
    throw new TypeError('Renderer must be a function or null');
  }
  customRenderer = fn;
}

/**
 * Return whether an element is visible (basic heuristic).
 * Considers display/visibility and DOM connection; does not use IntersectionObserver.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isVisible(el) {
  if (!el || !el.isConnected) return false;
  const style = window.getComputedStyle(el);
  return style && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
}

/**
 * Collect flash message containers with optional filtering/sorting.
 * By default, returns all elements matching `[data-flash-message-container]`.
 * This function is intended for custom renderers to choose target containers.
 *
 * Options:
 * - primaryOnly?: boolean — If true, only include elements with `data-flash-primary` present or set to "true".
 * - visibleOnly?: boolean — If true, include only elements considered visible.
 * - sortByPriority?: boolean — If true, sort by numeric `data-flash-message-container-priority` ascending (missing treated as Infinity).
 * - firstOnly?: boolean — If true, return at most one element after filtering/sorting.
 * - filter?: (el: Element) => boolean — Additional predicate to include elements.
 *
 * @param {Object} [options]
 * @returns {Element[]} Array of container elements
 */
function getFlashMessageContainers(options = {}) {
  const {
    primaryOnly = false,
    visibleOnly = false,
    sortByPriority = false,
    firstOnly = false,
    filter
  } = options;

  // Fixed selector by gem convention
  let list = Array.from(document.querySelectorAll('[data-flash-message-container]'));

  if (primaryOnly) {
    list = list.filter(el => el.hasAttribute('data-flash-primary') && (el.getAttribute('data-flash-primary') !== 'false'));
  }
  if (visibleOnly) {
    list = list.filter(isVisible);
  }
  if (typeof filter === 'function') {
    list = list.filter(filter);
  }
  if (sortByPriority) {
    list.sort((a, b) => {
      const pa = Number(a.getAttribute('data-flash-message-container-priority'));
      const pb = Number(b.getAttribute('data-flash-message-container-priority'));
      const va = Number.isFinite(pa) ? pa : Number.POSITIVE_INFINITY;
      const vb = Number.isFinite(pb) ? pb : Number.POSITIVE_INFINITY;
      return va - vb;
    });
  }
  if (firstOnly) {
    return list.length > 0 ? [list[0]] : [];
  }
  return list;
}

/**
 * Read default container selection options from <html> data-attributes.
 * Supported attributes (all optional):
 * - data-flash-unified-container-primary-only
 * - data-flash-unified-container-visible-only
 * - data-flash-unified-container-sort-by-priority
 * - data-flash-unified-container-first-only
 *
 * Each attribute accepts:
 * - presence with no value → true
 * - "true"/"1" → true
 * - "false"/"0" → false
 * Missing attribute yields undefined (does not override defaults).
 *
 * @returns {{ primaryOnly?: boolean, visibleOnly?: boolean, sortByPriority?: boolean, firstOnly?: boolean }}
 */
function getHtmlContainerOptions() {
  const root = document.documentElement;
  const parse = (name) => {
    const val = root.getAttribute(name);
    if (val === null) return undefined;
    if (val === '' || val.toLowerCase() === 'true' || val === '1') return true;
    if (val.toLowerCase() === 'false' || val === '0') return false;
    // Any other non-empty value: treat as true for convenience
    return true;
  };
  return {
    primaryOnly: parse('data-flash-unified-container-primary-only'),
    visibleOnly: parse('data-flash-unified-container-visible-only'),
    sortByPriority: parse('data-flash-unified-container-sort-by-priority'),
    firstOnly: parse('data-flash-unified-container-first-only')
  };
}

/**
 * Default renderer: renders messages into DOM containers using templates.
 *
 * @param {{type: string, message: string}[]} messages - Array of message objects
 * @returns {void}
 */
function defaultRenderer(messages) {
  // Allow page-wide defaults via <html> data-attributes
  const containers = getFlashMessageContainers(getHtmlContainerOptions());
  containers.forEach(container => {
    messages.forEach(({ type, message }) => {
      if (message) container.appendChild(createFlashMessageNode(type, message));
    });
  });
}

/**
 * Install a one-time listener that calls `renderFlashMessages()` on initial page load.
 *
 * @example
 * import { installInitialRenderListener } from 'flash_unified';
 * installInitialRenderListener();
 *
 * @returns {void}
 */
function installInitialRenderListener() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { renderFlashMessages(); }, { once: true });
  } else {
    renderFlashMessages();
  }
}

/**
 * Render messages found in storages into message containers.
 * Delegates message collection to `consumeFlashMessages(false)`, which removes the storage elements.
 * Uses custom renderer if set, otherwise uses default DOM-based rendering.
 *
 * @example
 * import { renderFlashMessages } from 'flash_unified';
 * renderFlashMessages();
 *
 * @returns {void}
 */
function renderFlashMessages() {
  const messages = consumeFlashMessages(false);

  if (typeof customRenderer === 'function') {
    customRenderer(messages);
  } else {
    defaultRenderer(messages);
  }
}

/**
 * Collect messages from all `[data-flash-storage]` elements.
 * By default, removes each storage after reading; pass `keep = true` to preserve them.
 *
 * Notes about deduplication using object_id:
 * - Each storage may include a `data-object-id` attribute populated server-side
 *   (the Rails `flash.object_id` in `_storage.html.erb`). This value is used to
 *   deduplicate storages that originate from the same FlashHash instance.
 * - This is useful for the common case where the same `flash` object is rendered
 *   both in the layout and inside a Turbo Frame during a single full-page render:
 *   those storages will share the same `data-object-id` and only one will be processed.
 * - `flash.object_id` is scoped to the Ruby object instance for the current request.
 *   Storages coming from separate requests will have different object ids and
 *   therefore will not be deduplicated (this is intentional — separate requests
 *   should be allowed to show their messages).
 * - If a storage does not provide `data-object-id`, it is treated as independent.
 *   Consumers may want to ensure the server partial emits `data-object-id` when
 *   appropriate to enable robust deduplication.
 *
 * @param {boolean} [keep=false] - When true, do not remove storage elements after reading.
 * @returns {{type: string, message: string}[]} Array of message objects.
 *
 * @example
 * const msgs = consumeFlashMessages(true);
 */
function consumeFlashMessages(keep = false) {
  const storages = document.querySelectorAll('[data-flash-storage]');
  const seen = new Set();
  const messages = [];
  storages.forEach(storage => {
    const objectId = storage.getAttribute('data-object-id');
    if (objectId && seen.has(objectId)) {
      if (!keep) storage.remove();
      return; // skip duplicate
    }
    if (objectId) seen.add(objectId);

    const ul = storage.querySelector('ul');
    if (ul && ul.children.length > 0) {
      ul.querySelectorAll('li').forEach(li => {
        messages.push({ type: li.dataset.type || 'notice', message: li.textContent.trim() });
      });
    }
    if (!keep) storage.remove();
  });
  return messages;
}

/**
 * Return messages without removing the storage elements.
 * Thin wrapper over `consumeFlashMessages(true)`.
 *
 * @returns {{type: string, message: string}[]}
 *
 * @example
 * const msgs = aggregateFlashMessages();
 */
function aggregateFlashMessages() {
  return consumeFlashMessages(true);
}

/**
 * Append a message to the global storage element (`#flash-storage`).
 *
 * @param {string} message - The message text to append.
 * @param {string} [type='notice'] - The flash type (e.g. 'notice', 'alert').
 * @returns {void}
 *
 * @example
 * appendMessageToStorage('Saved', 'notice');
 */
function appendMessageToStorage(message, type = 'notice') {
  const storageContainer = document.getElementById("flash-storage");
  if (!storageContainer) {
    console.error('[FlashUnified] #flash-storage not found. Define <div id="flash-storage" style="display:none"></div> in layout.');
    return;
  }

  let storage = storageContainer.querySelector('[data-flash-storage]');
  if (!storage) {
    storage = document.createElement('div');
    storage.setAttribute('data-flash-storage', 'true');
    storage.style.display = 'none';
    storageContainer.appendChild(storage);
  }

  let ul = storage.querySelector('ul');
  if (!ul) {
    ul = document.createElement('ul');
    storage.appendChild(ul);
  }

  const li = document.createElement('li');
  li.dataset.type = type;
  li.textContent = message;
  ul.appendChild(li);
}

/**
 * Install a listener for `flash-unified:messages` CustomEvent and process its payload.
 * The event's `detail` should be either an array of message objects or an object with a `messages` array.
 *
 * @example
 * document.dispatchEvent(new CustomEvent('flash-unified:messages', {
 *   detail: [{ type: 'notice', message: 'Hi' }]
 * }));
 *
 * @returns {void}
 */
function installCustomEventListener() {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-custom-listener')) return; // idempotent
  root.setAttribute('data-flash-unified-custom-listener', 'true');

  document.addEventListener('flash-unified:messages', function(event) {
    try {
      processMessagePayload(event.detail);
    } catch (e) {
      console.error('[FlashUnified] Failed to handle custom payload', e);
    }
  });
}

/**
 * Clear rendered flash messages from message containers.
 * If `message` is provided, only remove elements whose text exactly matches it.
 *
 * @param {string} [message] - Exact message text to remove (optional).
 * @returns {void}
 */
function clearFlashMessages(message) {
  document.querySelectorAll('[data-flash-message-container]').forEach(container => {
    if (typeof message === 'undefined') {
      container.querySelectorAll('[data-flash-message]')?.forEach(n => n.remove());
      return;
    }

    container.querySelectorAll('[data-flash-message]')?.forEach(n => {
      const text = n.querySelector('.flash-message-text');
      if (text && text.textContent.trim() === message) n.remove();
    });
  });
}

/**
 * Create a DOM node for a flash message using the `flash-message-template-<type>` template.
 * Falls back to a minimal element when the template is missing.
 *
 * @param {string} type
 * @param {string} message
 * @returns {Element}
 */
function createFlashMessageNode(type, message) {
  const templateId = `flash-message-template-${type}`;
  const template = document.getElementById(templateId);
  if (template && template.content) {
    const base = template.content.firstElementChild;
    if (!base) {
      console.error(`[FlashUnified] Template #${templateId} has no root element`);
      const node = document.createElement('div');
      node.setAttribute('role', 'alert');
      node.setAttribute('data-flash-message', 'true');
      node.textContent = message;
      return node;
    }
    const root = base.cloneNode(true);
    root.setAttribute('data-flash-message', 'true');
    const span = root.querySelector('.flash-message-text');
    if (span) span.textContent = message;
    return root;
  } else {
    console.error(`[FlashUnified] No template found for type: ${type}`);
    // Fallback element when template is missing
    const node = document.createElement('div');
    node.setAttribute('role', 'alert');
    node.setAttribute('data-flash-message', 'true');
    const span = document.createElement('span');
    span.className = 'flash-message-text';
    span.textContent = message;
    node.appendChild(span);
    return node;
  }
}

/**
 * Return true if any `[data-flash-storage]` contains at least one `<li>`.
 *
 * @returns {boolean}
 */
function storageHasMessages() {
  const storages = document.querySelectorAll('[data-flash-storage]');
  for (const storage of storages) {
    const ul = storage.querySelector('ul');
    if (ul && ul.children.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Accept either:
 *   - an array of message objects [{ type, message }, ...], or
 *   - an object { messages: [...] } where messages is such an array.
 * Append each message to storage and trigger rendering.
 *
 * @param {Array|Object} payload
 * @returns {void}
 */
function processMessagePayload(payload) {
  if (!payload) return;
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload.messages) ? payload.messages : []);
  if (list.length === 0) return;
  list.forEach(({ type, message }) => {
    if (!message) return;
    appendMessageToStorage(String(message), type);
  });
  renderFlashMessages();
}

/**
 * Enable a MutationObserver that watches for dynamically inserted storages, templates,
 * or message containers and triggers rendering. Useful when server responses cannot dispatch events.
 *
 * @returns {void}
 */
function startMutationObserver() {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-observer-enabled')) return;
  root.setAttribute('data-flash-unified-observer-enabled', 'true');

  const observer = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('[data-flash-storage], [data-flash-message-container], template[id^="flash-message-template-"]')) {
            shouldRender = true;
          }
          if (node.querySelector && node.querySelector('[data-flash-storage]')) {
            shouldRender = true;
          }
        });
      }
    }
    if (shouldRender) {
      renderFlashMessages();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

export {
  renderFlashMessages,
  setFlashMessageRenderer,
  getFlashMessageContainers,
  getHtmlContainerOptions,
  appendMessageToStorage,
  clearFlashMessages,
  processMessagePayload,
  startMutationObserver,
  installCustomEventListener,
  installInitialRenderListener,
  storageHasMessages,
  consumeFlashMessages,
  aggregateFlashMessages
};
