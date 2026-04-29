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

// Migration compatibility: during the alpha period we support both canonical
// (flash-unified-*) and legacy markers so existing hand-written integrations
// continue to work while docs/examples promote canonical names.
const STORAGE_SELECTOR = '[data-flash-unified-storage], [data-flash-storage]';
const CONTAINER_SELECTOR = '[data-flash-unified-container], [data-flash-message-container]';
const MESSAGE_SELECTOR = '[data-flash-unified-message], [data-flash-message]';

function findByIdWithLegacy(canonicalId, legacyId) {
  return document.getElementById(canonicalId) || document.getElementById(legacyId);
}

function messageTemplateIdCandidates(type) {
  return [`flash-unified-template-${type}`, `flash-message-template-${type}`];
}

function getContainerPrimaryAttr(el) {
  return el.getAttribute('data-flash-unified-container-primary') || el.getAttribute('data-flash-primary');
}

function getContainerPriorityAttr(el) {
  return el.getAttribute('data-flash-unified-container-priority') || el.getAttribute('data-flash-message-container-priority');
}

function getStorageDedupeKey(storage) {
  return storage.getAttribute('data-flash-unified-storage-dedupe-key') || storage.getAttribute('data-object-id');
}

function getMessageTypeFromLi(li) {
  return li.getAttribute('data-flash-unified-message-type') || li.getAttribute('data-type') || 'notice';
}

function setMessageTypeOnLi(li, type) {
  li.setAttribute('data-flash-unified-message-type', type);
  li.setAttribute('data-type', type);
}

function markMessageNode(node) {
  node.setAttribute('data-flash-unified-message', 'true');
  node.setAttribute('data-flash-message', 'true');
}

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
 * By default, returns all elements matching container markers.
 * This function is intended for custom renderers to choose target containers.
 *
 * Options:
 * - primaryOnly?: boolean — If true, only include elements with container primary marker present or set to "true".
 * - visibleOnly?: boolean — If true, include only elements considered visible.
 * - sortByPriority?: boolean — If true, sort by numeric container priority marker ascending (missing treated as Infinity).
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

  let list = Array.from(document.querySelectorAll(CONTAINER_SELECTOR));

  if (primaryOnly) {
    list = list.filter(el => {
      const val = getContainerPrimaryAttr(el);
      return val !== null && val !== 'false';
    });
  }
  if (visibleOnly) {
    list = list.filter(isVisible);
  }
  if (typeof filter === 'function') {
    list = list.filter(filter);
  }
  if (sortByPriority) {
    list.sort((a, b) => {
      const rawPa = getContainerPriorityAttr(a);
      const rawPb = getContainerPriorityAttr(b);
      const pa = rawPa === null || rawPa === '' ? Number.NaN : Number(rawPa);
      const pb = rawPb === null || rawPb === '' ? Number.NaN : Number(rawPb);
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
 * Collect messages from all storage elements.
 * By default, removes each storage after reading; pass `keep = true` to preserve them.
 *
 * Notes about deduplication key:
 * - Each storage may include a `data-flash-unified-storage-dedupe-key` attribute populated server-side
 *   (legacy attribute `data-object-id` is also supported during migration).
 *   (the Rails `flash.object_id` in `_storage.html.erb`). This value is used to
 *   deduplicate storages that originate from the same FlashHash instance.
 * - This is useful for the common case where the same `flash` object is rendered
 *   both in the layout and inside a Turbo Frame during a single full-page render:
 *   those storages will share the same dedupe key and only one will be processed.
 * - `flash.object_id` is scoped to the Ruby object instance for the current request.
 *   Storages coming from separate requests will have different object ids and
 *   therefore will not be deduplicated (this is intentional — separate requests
 *   should be allowed to show their messages).
 * - If a storage does not provide a dedupe key, it is treated as independent.
 *   Consumers may want to ensure the server partial emits a dedupe key when
 *   appropriate to enable robust deduplication.
 *
 * @param {boolean} [keep=false] - When true, do not remove storage elements after reading.
 * @returns {{type: string, message: string}[]} Array of message objects.
 *
 * @example
 * const msgs = consumeFlashMessages(true);
 */
function consumeFlashMessages(keep = false) {
  const storages = document.querySelectorAll(STORAGE_SELECTOR);
  const seen = new Set();
  const messages = [];
  storages.forEach(storage => {
    const objectId = getStorageDedupeKey(storage);
    if (objectId && seen.has(objectId)) {
      if (!keep) storage.remove();
      return; // skip duplicate
    }
    if (objectId) seen.add(objectId);

    const ul = storage.querySelector('ul');
    if (ul && ul.children.length > 0) {
      ul.querySelectorAll('li').forEach(li => {
        messages.push({ type: getMessageTypeFromLi(li), message: li.textContent.trim() });
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
 * Append a message to the global storage element.
 *
 * @param {string} message - The message text to append.
 * @param {string} [type='notice'] - The flash type (e.g. 'notice', 'alert').
 * @returns {void}
 *
 * @example
 * appendMessageToStorage('Saved', 'notice');
 */
function appendMessageToStorage(message, type = 'notice') {
  const storageContainer = findByIdWithLegacy('flash-unified-storage', 'flash-storage');
  if (!storageContainer) {
    console.error('[FlashUnified] Storage root not found. Define <div id="flash-unified-storage" style="display:none"></div> in layout.');
    return;
  }

  let storage = storageContainer.querySelector(STORAGE_SELECTOR);
  if (!storage) {
    storage = document.createElement('div');
    storage.setAttribute('data-flash-unified-storage', 'true');
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
  setMessageTypeOnLi(li, type);
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

// TODO: Drop legacy `.flash-message-text` support in the next major version.
function findFlashMessageTextTarget(root) {
  return root.querySelector('[data-flash-unified-message-text]') || root.querySelector('[data-flash-message-text]') || root.querySelector('.flash-message-text');
}

/**
 * Clear rendered flash messages from message containers.
 * If `message` is provided, only remove elements whose text exactly matches it.
 *
 * @param {string} [message] - Exact message text to remove (optional).
 * @returns {void}
 */
function clearFlashMessages(message) {
  document.querySelectorAll(CONTAINER_SELECTOR).forEach(container => {
    if (typeof message === 'undefined') {
      container.querySelectorAll(MESSAGE_SELECTOR)?.forEach(n => n.remove());
      return;
    }

    container.querySelectorAll(MESSAGE_SELECTOR)?.forEach(n => {
      const text = findFlashMessageTextTarget(n);
      if (text && text.textContent.trim() === message) n.remove();
    });
  });
}

/**
 * Create a DOM node for a flash message using the template marker for `type`.
 * Falls back to a minimal element when the template is missing.
 *
 * @param {string} type
 * @param {string} message
 * @returns {Element}
 */
function createFlashMessageNode(type, message) {
  const templateId = messageTemplateIdCandidates(type).find(id => document.getElementById(id));
  const template = templateId ? document.getElementById(templateId) : null;
  if (template && template.content) {
    const base = template.content.firstElementChild;
    if (!base) {
      console.error(`[FlashUnified] Template #${templateId} has no root element`);
      const node = document.createElement('div');
      node.setAttribute('role', 'alert');
      markMessageNode(node);
      node.textContent = message;
      return node;
    }
    const root = base.cloneNode(true);
    markMessageNode(root);
    const span = findFlashMessageTextTarget(root);
    if (span) span.textContent = message;
    return root;
  } else {
    console.error(`[FlashUnified] No template found for type: ${type}`);
    // Fallback element when template is missing
    const node = document.createElement('div');
    node.setAttribute('role', 'alert');
    markMessageNode(node);
    const span = document.createElement('span');
    span.setAttribute('data-flash-unified-message-text', '');
    span.setAttribute('data-flash-message-text', '');
    span.textContent = message;
    node.appendChild(span);
    return node;
  }
}

/**
 * Return true if any storage contains at least one `<li>`.
 *
 * @returns {boolean}
 */
function storageHasMessages() {
  const storages = document.querySelectorAll(STORAGE_SELECTOR);
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
          if (node.matches(`${STORAGE_SELECTOR}, ${CONTAINER_SELECTOR}, template[id^="flash-unified-template-"], template[id^="flash-message-template-"]`)) {
            shouldRender = true;
          }
          if (node.querySelector && node.querySelector(STORAGE_SELECTOR)) {
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
