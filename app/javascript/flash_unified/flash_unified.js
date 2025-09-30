/*
  flash_unified.js - Flash Message Client-side Integration

  クライアント側でフラッシュ・メッセージを統一的に制御する仕組みです。
  サーバー、クライアント、プロキシからのエラーといった異なる発生によるものでも、
  同じ仕組みでメッセージを表示できるようにします。

  --- 概要 ---
  1. フラッシュ・メッセージは <div data-flash-storage> 内の <ul><li> で保存します（非表示）。
  2. 表示は <template> をもとに、 <div data-flash-message-container> 内に描画します。
  3. Turbo イベントにより表示処理が自動で呼び出されます。または JavaScript で任意のタイミングでも呼び出せます。

  --- 使い方 ---
  サーバー（コントローラ）にてフラッシュ・メッセージを作成します：

    flash[:alert] = "エラーが発生しました"

  サーバー（ビュー）でフラッシュ・メッセージを "ストレージ" 要素に描画します：

    <div data-flash-storage style="display: none;">
      <ul>
        <% flash.each do |type, message| %>
          <li data-type="<%= type %>"><%= message %></li>
        <% end %>
      </ul>
    </div>

  上記の flash オブジェクトが展開されると、例えばこのような形になります：

    <div data-flash-storage style="display: none;">
      <ul>
        <li data-type="alert">メッセージ1内容</li>
        <li data-type="notice">メッセージ2内容</li>
      </ul>
    </div>

  この結果がクライアントに返され、そこでイベントが発生することで、
  あらかじめビューに配置されている表示位置に、テンプレートで整形されたメッセージの要素が追加されます：

    <div data-flash-message-container></div>

  JavaScript から明示的に表示する場合は、 "ストレージ" にメッセージを入れてから描画処理を実行します：

    appendMessageToStorage('数字以外が入力されています', 'alert');
    renderFlashMessages();

  --- Turbo Stream 用のストレージの定義 ---
  Turbo Stream で HTML 部分を更新するには id を指定する必要があるため、
  id を持ったストレージ用の要素をグローバルな位置に配置してください。中身は空にしておきます。

    <div id="flash-storage" style="display: none;">
    </div>

  --- メッセージの <template> の定義 ---
  扱うメッセージの type ごとに id を割り振ったテンプレートを作成し、グローバルな位置に配置してください。

    <template id="flash-message-template-notice">
      <div class="..." role="alert">
        <span class="flash-message-text"></span>
      </div>
    </template>
    <template id="flash-message-template-alert">
      <div class="..." role="alert">
        <span class="flash-message-text"></span>
      </div>
    </template>
    <template id="flash-message-template-warning">
      <div class="..." role="alert">
        <span class="flash-message-text"></span>
      </div>
    </template>

  --- 汎用エラーメッセージの定義 ---
  サーバーに届く前のエラーを表示するためのメッセージを、グローバルな位置に配置してください。
  定義すべき data-status は、すべての HTTP ステータスコードと "network" です。

    <ul id="general-error-messages" style="display:none;">
      ...
      <li data-status="413">送信データサイズが大きすぎます。</li>
      ...
      <li data-status="500">サーバーエラーが発生しました</li>
      ...
      <li data-status="network">ネットワークエラーが発生しました</li>
    </ul>
*/

/* ストレージにあるメッセージを表示させます。
  すべての flash-storage 内のリスト項目を集約し、各項目ごとにテンプレートを用いてフラッシュメッセージ要素を生成し、
  flash-message-containerに追加します。なお処理後は各 flash-storage は取り除かれます。
  */
function renderFlashMessages() {
  const storages = document.querySelectorAll('[data-flash-storage]');
  const containers = document.querySelectorAll('[data-flash-message-container]');

  // マージしたメッセージリスト
  let messages = [];
  storages.forEach(storage => {
    const ul = storage.querySelector('ul');
    if (ul && ul.children.length > 0) {
      ul.querySelectorAll('li').forEach(li => {
        messages.push({ type: li.dataset.type || 'notice', message: li.textContent.trim() });
      });
    }
    // ストレージは都度クリア
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
  */
function appendMessageToStorage(message, type = 'alert') {
  const storageContainer = document.getElementById("flash-storage");
  if (!storageContainer) {
    console.error('[FlashUnified] #flash-storage not found. Define <div id="flash-storage" style="display:none"></div> in layout.');
    // TODO: あるいは自動生成して document.body.appendChild しますか？
    // ユーザの目に見えない部分で要素が増えることを避けたいと考え、警告に留めています。
    // 下で storage を生成する部分は、ユーザが設定するコンテナの中なので問題ありません。
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
  ページのロードが完了したときに一度だけ呼び出してください。
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

  // Listen for our custom after-stream-render event
  document.addEventListener("turbo:after-stream-render", function() {
    debugLog('turbo:after-stream-render');
    renderFlashMessages();
  });

  // turbo:submit-end イベントは、フォーム送信時にサーバーからの HTTP レスポンスが返る場合だけでなく、
  // プロキシエラーやネットワークエラーなど、 Rails に到達しないケースも扱います。
  document.addEventListener('turbo:submit-end', function(event) {
    debugLog('turbo:submit-end');
    const res = event.detail.fetchResponse;
    if (res === undefined) {
      // fetchResponse が undefined の場合は、ネットワーク断やプロキシによる遮断など、
      // サーバーに到達していない可能性があるため、その場合はネットワークエラーとして扱います。
      handleFlashErrorStatus('network');
      console.warn('[FlashUnified] No response received from server. Possible network or proxy error.');
    } else {
      handleFlashErrorStatus(res.statusCode);
    }
    renderFlashMessages();
  });

  // Network error handling
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

  // Optional: Listen for custom dispatch from server or other JS
  // Event name: "flash-unified:messages"
  // event.detail can be:
  //   - Array of { type: string, message: string }
  //   - { messages: Array<{ type: string, message: string }> }
  document.addEventListener('flash-unified:messages', function(event) {
    debugLog('flash-unified:messages');
    try {
      handleFlashPayload(event.detail);
    } catch (e) {
      console.error('[FlashUnified] Failed to handle custom payload', e);
    }
  });

  // Setup custom turbo:after-stream-render event for Turbo Stream updates
  // This replaces MutationObserver with a cleaner event-driven approach
  //
  // Based on technique from Hotwired community discussion:
  // https://discuss.hotwired.dev/t/event-to-know-a-turbo-stream-has-been-rendered/1554/25
  //
  // The core idea is to hook into turbo:before-stream-render and wrap the original
  // render function to dispatch a custom event after rendering completes.
  // This provides a clean event-driven alternative to MutationObserver for detecting
  // when Turbo Stream updates have finished rendering.
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
      debugLog('DOMContentLoaded');
      renderFlashMessages();
    });

    // If the document is already loaded (e.g. script loaded late), run once
    if (document.readyState === "complete" || document.readyState === "interactive") {
      if (!domLoaded) {
        domLoaded = true;
        debugLog('DOMContentLoaded (late)');
        renderFlashMessages();
      }
    }
  })();
}

/* フラッシュ・メッセージの表示をクリアします。
    message が指定されている場合は、そのメッセージを含んだフラッシュ・メッセージをクリアします。
    message が省略された場合は全てが対象です。
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

// --- utility functions ---

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
    // テンプレートがない場合は生成
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

function handleFlashErrorStatus(status) {
  // If any flash storage already contains messages, do not override it
  if (anyFlashStorageHasMessage()) return;

  // Determine lookup key: 'network' or the numeric status string
  let key;
  if (status === 'network') {
    key = 'network';
  } else if (!status || status < 400) {
    return;
  } else {
    key = String(status);
  }

  // If the visible container already has children, avoid inserting duplicates
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

// Handle a payload of messages and render them.
// Accepts either an array of { type, message } or an object { messages: [...] }.
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

// Optional: Enable a MutationObserver that watches for dynamically inserted
// flash storage or templates and triggers rendering. Useful when you cannot
// or do not want to dispatch a custom event from server responses.
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

