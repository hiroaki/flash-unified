/*
  Flash Unified (standalone) — Minimal setup guide

  Purpose
  - Read messages from hidden "storage" nodes and render them into a visible
    container using <template> definitions.
  - Auto-render after common events when Turbo is present, or call a render
    function manually.

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

  4) Global storage (required by appendMessageToStorage and Turbo Streams)
     <div id="flash-storage" style="display:none;"></div>

  5) General error messages (optional; network/HTTP fallback)
     <ul id="general-error-messages" style="display:none;">
       <li data-status="413">Payload Too Large</li>
       <li data-status="network">Network Error</li>
     </ul>

  Initialization (ES module)
    <script type="module">
      import { initializeFlashMessageSystem } from "/path/to/flash_unified.js";
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => initializeFlashMessageSystem());
      } else {
        initializeFlashMessageSystem();
      }
    </script>
*/

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
  let messages = [];
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
function appendMessageToStorage(message, type = 'alert') {
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

/* ページでフラッシュ・メッセージの仕組みを働かせるようにします。
  ページのロードが完了したときに一度だけ呼び出してください（冪等）。
  ---
  Initialize the flash message system for the current page (idempotent).
  Call once after the page is ready.
*/
function initializeFlashMessageSystem(debugFlag = false) {
  // Ensure listeners are registered only once per document lifecycle
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-initialized')) {
    return; // idempotent init
  }
  root.setAttribute('data-flash-unified-initialized', 'true');

  const debugLog = debugFlag ? function(message) {
    console.debug(message);
  } : function() {};

  document.addEventListener('turbo:load', function() {
    debugLog('turbo:load');
    renderFlashMessages();
  });

  document.addEventListener("turbo:frame-load", function() {
    debugLog('turbo:frame-load');
    renderFlashMessages();
  });

  document.addEventListener('turbo:render', function() {
    debugLog('turbo:render');
    renderFlashMessages();
  });

  // Turbo Stream レンダリング後のカスタムイベントに反応
  // ---
  // Listen for our custom after-stream-render event
  document.addEventListener("turbo:after-stream-render", function() {
    debugLog('turbo:after-stream-render');
    renderFlashMessages();
  });

  // フォーム送信時にサーバーからの HTTP レスポンスが返る場合だけでなく、
  // プロキシエラーやネットワークエラーなど、Rails に到達しないケースも扱います。
  // ---
  // Handles not only successful server responses but also proxy/network errors
  // where the request never reaches Rails.
  document.addEventListener('turbo:submit-end', function(event) {
    debugLog('turbo:submit-end');
    const res = event.detail.fetchResponse;
    if (res === undefined) {
      // fetchResponse が undefined の場合は、ネットワーク断やプロキシによる遮断など、
      // サーバーに到達していない可能性があるため、その場合はネットワークエラーとして扱います。
      // ---
      // When fetchResponse is undefined, likely a network/proxy issue — treat as network error.
      handleFlashErrorStatus('network');
      console.warn('[FlashUnified] No response received from server. Possible network or proxy error.');
    } else {
      handleFlashErrorStatus(res.statusCode);
    }
    renderFlashMessages();
  });

  // ネットワークエラーのハンドリング / Network error handling
  document.addEventListener('turbo:fetch-request-error', function(_event) {
    debugLog('turbo:fetch-request-error');
    if (anyFlashStorageHasMessage()) {
      return;
    }

    const generalerrors = document.getElementById('general-error-messages');
    let message = null;
    if (generalerrors) {
      const li = generalerrors.querySelector('li[data-status="network"]');
      if (li) message = li.textContent.trim();
    }
    if (message) {
      appendMessageToStorage(message, 'alert');
    } else {
      console.error('[FlashUnified] No error message defined for network error');
    }

    renderFlashMessages();
  });

  // 任意: サーバーや他の JS からのカスタムイベントを受け取ります
  // イベント名: "flash-unified:messages"
  // event.detail は次のいずれかです:
  //   - Array<{ type: string, message: string }>
  //   - { messages: Array<{ type: string, message: string }> }
  // ---
  // Optional: Listen for custom dispatch from server or other JS
  // Event name: "flash-unified:messages"
  // event.detail can be an Array of messages or an object with a messages array.
  document.addEventListener('flash-unified:messages', function(event) {
    debugLog('flash-unified:messages');
    try {
      handleFlashPayload(event.detail);
    } catch (e) {
      console.error('[FlashUnified] Failed to handle custom payload', e);
    }
  });

  // Turbo Stream 更新検知のためのカスタムイベント設定
  // MutationObserver の代わりに、イベント駆動で「描画完了」を検出します。
  // 参考: Hotwired コミュニティのディスカッション
  // https://discuss.hotwired.dev/t/event-to-know-a-turbo-stream-has-been-rendered/1554/25
  //
  // コアアイデア: turbo:before-stream-render をフックし、元の render 関数をラップして、
  // 描画完了後に独自イベントを発火させます。
  // ---
  // Setup custom turbo:after-stream-render event for Turbo Stream updates.
  // Wrap the original render to dispatch an event after rendering is done.
  (function() {
    // Create custom event for after stream render
    const afterRenderEvent = new Event("turbo:after-stream-render");

    // Hook into turbo:before-stream-render to add our custom event
    document.addEventListener("turbo:before-stream-render", (event) => {
      debugLog('turbo:before-stream-render');
      const originalRender = event.detail.render;
      event.detail.render = async function (streamElement) {
        await originalRender(streamElement);
        document.dispatchEvent(afterRenderEvent);
      };
    });
  })();

  (function() {
    let domLoaded = false;
    document.addEventListener('DOMContentLoaded', function() {
      if (domLoaded) return;
      domLoaded = true;
      debugLog('DOMContentLoaded (initial load)');
      renderFlashMessages();
    });

    // If the document is already loaded (e.g. script loaded late), run once
    if (document.readyState === "complete" || document.readyState === "interactive") {
      if (!domLoaded) {
        domLoaded = true;
        debugLog('DOMContentLoaded (late init)');
        renderFlashMessages();
      }
    }
  })();
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

/* エラーステータスに応じた汎用メッセージをストレージへ追加します。
  既にストレージにメッセージが存在する場合は何もしません。
  'network' または 4xx/5xx を対象とし、#general-error-messages から文言を解決します。
  ---
  Add a general error message to storage based on status ('network' or 4xx/5xx).
  If any storage already has messages, this is a no-op. Looks up text in #general-error-messages.
*/
function handleFlashErrorStatus(status) {
  // If any flash storage already contains messages, do not override it
  if (anyFlashStorageHasMessage()) return;

  // Determine lookup key
  let key;
  if (status === 'network') {
    key = 'network';
  } else if (!status || status < 400) {
    return;
  } else {
    key = String(status);
  }

  // Avoid duplicates when container has children
  const container = document.querySelector('[data-flash-message-container]');
  if (container && container.children.length > 0) return;

  const generalerrors = document.getElementById('general-error-messages');
  if (!generalerrors) {
    console.error('[FlashUnified] No general error messages element found');
    return;
  }

  const li = generalerrors.querySelector(`li[data-status="${key}"]`);
  if (li) {
    appendMessageToStorage(li.textContent.trim(), 'alert');
  } else {
    console.error(`[FlashUnified] No error message defined for status: ${status}`);
  }
}

/* 何らかのストレージにメッセージが存在するかを判定します。
  ---
  Return true if any [data-flash-storage] contains at least one <li> item.
*/
function anyFlashStorageHasMessage() {
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
function handleFlashPayload(payload) {
  if (!payload) return;
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload.messages) ? payload.messages : []);
  if (list.length === 0) return;
  list.forEach(({ type, message }) => {
    if (!message) return;
    appendMessageToStorage(String(message), type || 'notice');
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
function enableMutationObserver(options = {}) {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-observer-enabled')) return;
  root.setAttribute('data-flash-unified-observer-enabled', 'true');

  const debug = !!options.debug;
  const log = debug ? (msg) => console.debug(msg) : () => {};

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
      log('MutationObserver: renderFlashMessages');
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
  initializeFlashMessageSystem,
  clearFlashMessages,
  handleFlashPayload,
  enableMutationObserver
};
