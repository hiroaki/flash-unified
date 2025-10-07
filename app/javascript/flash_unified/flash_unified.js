/*
  Flash Unified — Minimal Core API

  Purpose
  - Provide core utilities for flash message rendering.
  - Users control when and how to trigger rendering via their own event handlers.

  Core API:
  - renderFlashMessages(): render all messages from storage into containers
  - appendMessageToStorage(message, type): add a message to hidden storage
  - clearFlashMessages(message?): clear displayed messages
  - processMessagePayload(payload): handle message arrays from custom events
  - startMutationObserver(): watch for dynamically inserted storage/templates

  Required DOM (no Rails helpers needed)
  1) Display container (required)
     <div data-flash-message-container></div>

  2) Hidden storage (optional; any number; removed after render)
     <div data-flash-storage style="display:none;">
       <ul>
         <li data-type="notice">Saved</li>
         <li data-type="alert">Oops</li>
       </ul>
     </div>

  3) Message templates, one per type (root should have role="alert" and include
     a .flash-message-text node for insertion)
     <template id="flash-message-template-notice">
       <div class="flash-notice" role="alert"><span class="flash-message-text"></span></div>
     </template>
     <template id="flash-message-template-alert">
       <div class="flash-alert" role="alert"><span class="flash-message-text"></span></div>
     </template>

  4) Global storage (required by appendMessageToStorage)
     <div id="flash-storage" style="display:none;"></div>

  Usage Examples:
    // Manual control with Stimulus
    import { renderFlashMessages, appendMessageToStorage } from "flash_unified";
    export default class extends Controller {
      connect() { renderFlashMessages(); }
      error() {
        appendMessageToStorage('Error occurred', 'alert');
        renderFlashMessages();
      }
    }

    // Custom event listener
    import { renderFlashMessages } from "flash_unified";
    document.addEventListener('turbo:load', renderFlashMessages);
    document.addEventListener('my-app:show-message', (event) => {
      appendMessageToStorage(event.detail.message, event.detail.type);
      renderFlashMessages();
    });
*/

/* 初回描画リスナーをセットします。
   DOMContentLoaded 時に renderFlashMessages() を一度だけ呼びます。
   ---
   Install a listener to render flash messages on DOMContentLoaded (once).
*/
function installInitialRenderListener() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { renderFlashMessages(); }, { once: true });
  } else {
    renderFlashMessages();
  }
}

/* ストレージにあるメッセージを表示させます。
  すべての [data-flash-storage] 内のリスト項目を集約し、各項目ごとにテンプレートを用いて
  フラッシュメッセージ要素を生成し、[data-flash-message-container] に追加します。
  処理後は各ストレージ要素を取り除きます。
  ---
  Render messages found in all [data-flash-storage] lists, create elements via templates,
  and append them into [data-flash-message-container]. Each storage is removed after processing.
*/
function renderFlashMessages() {
  const storages = document.querySelectorAll('[data-flash-storage]');
  const containers = document.querySelectorAll('[data-flash-message-container]');

  // Aggregated messages list
  const messages = [];
  storages.forEach(storage => {
    const ul = storage.querySelector('ul');
    if (ul && ul.children.length > 0) {
      ul.querySelectorAll('li').forEach(li => {
        messages.push({ type: li.dataset.type || 'notice', message: li.textContent.trim() });
      });
    }
    // Remove storage after consuming
    storage.remove();
  });

  containers.forEach(container => {
    messages.forEach(({ type, message }) => {
      if (message) container.appendChild(createFlashMessageNode(type, message));
    });
  });
}

/* フラッシュ・メッセージ項目として message をデータとして埋め込みます。
  埋め込まれた項目は renderFlashMessages を呼び出すことによって表示されます。
  ---
  Append a message item into the hidden storage.
  Call renderFlashMessages() to display it.
*/
function appendMessageToStorage(message, type = 'notice') {
  const storageContainer = document.getElementById("flash-storage");
  if (!storageContainer) {
    console.error('[FlashUnified] #flash-storage not found. Define <div id="flash-storage" style="display:none"></div> in layout.');
    // TODO: あるいは自動生成して document.body.appendChild しますか？
    // ユーザの目に見えない部分で要素が増えることを避けたいと考え、警告に留めています。
    // 下で storage を生成する部分は、ユーザが設定するコンテナの中なので問題ありません。
    // ---
    // Alternatively we could auto-create it on document.body, but we avoid hidden side-effects.
    // Creating the inner [data-flash-storage] below is safe since it's inside the user-provided container.
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

/* カスタムイベントリスナーを設定します（オプション）。
  サーバーや他のJSからのカスタムイベントを受け取ります。
  ---
  Setup custom event listener for programmatic message dispatch.
  Listen for "flash-unified:messages" events from server or other JS.
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

/* フラッシュ・メッセージの表示をクリアします。
  message が指定されている場合は、そのメッセージを含んだフラッシュ・メッセージのみを削除します。
  省略された場合はすべてのフラッシュ・メッセージが対象です。
  ---
  Clear flash messages. If message is provided, remove only matching ones;
  otherwise remove all flash message nodes in the containers.
*/
function clearFlashMessages(message) {
  document.querySelectorAll('[data-flash-message-container]').forEach(container => {
    // メッセージ指定なし: メッセージ要素のみ全削除（コンテナ内の他要素は残す）
    if (typeof message === 'undefined') {
      container.querySelectorAll('[data-flash-message]')?.forEach(n => n.remove());
      return;
    }

    // 指定メッセージに一致する要素だけ削除
    container.querySelectorAll('[data-flash-message]')?.forEach(n => {
      const text = n.querySelector('.flash-message-text');
      if (text && text.textContent.trim() === message) n.remove();
    });
  });
}

// --- ユーティリティ関数 / Utility functions ---

/* テンプレートからフラッシュ・メッセージ要素を生成します。
  type に対応する <template id="flash-message-template-<type>"> を利用し、
  .flash-message-text に文言を挿入します。テンプレートが無い場合は簡易的な要素を生成します。
  ---
  Create a flash message DOM node using <template id="flash-message-template-<type>">.
  Inserts the message into .flash-message-text. Falls back to a minimal element when template is missing.
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
    // テンプレートがない場合は生成 / Fallback element when template is missing
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

/* 何らかのストレージにメッセージが存在するかを判定します。
  ---
  Return true if any [data-flash-storage] contains at least one <li> item.
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

/* メッセージの配列（または { messages: [...] }）を受け取り、ストレージに追加して描画します。
  ---
  Handle a payload of messages and render them.
  Accepts either an array of { type, message } or an object { messages: [...] }.
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

/* 任意: MutationObserver を有効化し、動的に挿入されたストレージ/テンプレートを検出して描画します。
  サーバーレスポンス側でカスタムイベントを発火できない場合の代替となります。
  ---
  Optional: Enable a MutationObserver that watches for dynamically inserted
  flash storage or templates and triggers rendering. Useful when you cannot
  or do not want to dispatch a custom event from server responses.
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
  appendMessageToStorage,
  clearFlashMessages,
  processMessagePayload,
  startMutationObserver,
  installCustomEventListener,
  installInitialRenderListener,
  storageHasMessages
};
