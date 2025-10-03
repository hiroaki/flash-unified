/*
  Flash Unified — Turbo Integration Helpers

  Purpose:
  - Provide optional Turbo event listeners for automatic flash message rendering.
  - Users can install these listeners if they want automatic integration with Turbo.

  Usage:
    import { renderFlashMessages } from "flash_unified";
    import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

    // Install automatic Turbo event listeners
    installTurboRenderListeners(true); // debug=true

    // Manual initial render
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderFlashMessages);
    } else {
      renderFlashMessages();
    }
*/

import { renderFlashMessages, handleFlashPayload } from './flash_unified.js';
import { handleFlashErrorStatus } from './network_helpers.js';

/* Turbo関連のイベントリスナーを設定します。
  ページ遷移やフレーム更新時に自動的にフラッシュメッセージを描画します。
  ---
  Install Turbo event listeners for automatic flash message rendering.
  Renders messages on page navigation and frame updates.
*/
function installTurboRenderListeners(debugFlag = false) {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-turbo-listeners')) {
    return; // Already installed
  }
  root.setAttribute('data-flash-unified-turbo-listeners', 'true');

  const debugLog = debugFlag ? function(message) {
    console.debug(`[FlashUnified:Turbo] ${message}`);
  } : function() {};

  // Turbo page load events
  document.addEventListener('turbo:load', function() {
    debugLog('turbo:load');
    renderFlashMessages();
  });

  document.addEventListener('turbo:frame-load', function() {
    debugLog('turbo:frame-load');
    renderFlashMessages();
  });

  document.addEventListener('turbo:render', function() {
    debugLog('turbo:render');
    renderFlashMessages();
  });

  // Turbo Stream events
  setupTurboStreamEvents(debugLog);

  // Initial render if not already done
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      debugLog('DOMContentLoaded');
      renderFlashMessages();
    }, { once: true });
  } else {
    debugLog('DOMContentLoaded (immediate)');
    renderFlashMessages();
  }
}

/* Turbo Stream更新後のカスタムイベントを設定します。
  turbo:before-stream-renderをフックして描画完了後にイベントを発火させます。
  ---
  Setup custom turbo:after-stream-render event for Turbo Stream updates.
  Hooks into turbo:before-stream-render to dispatch event after rendering is done.
*/
function setupTurboStreamEvents(debugLog) {
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

  // Listen for our custom after-stream-render event
  document.addEventListener("turbo:after-stream-render", function() {
    debugLog('turbo:after-stream-render');
    renderFlashMessages();
  });
}

/* Turboリスナー + カスタムイベントリスナーを一度に設定します。
  ---
  Sets up Turbo listeners + custom event listeners in one call.
*/
function setupFlashUnifiedForTurbo(debugFlag = false) {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-initialized')) {
    return; // idempotent init
  }
  root.setAttribute('data-flash-unified-initialized', 'true');

  const debugLog = debugFlag ? function(message) {
    console.debug(message);
  } : function() {};

  // Install Turbo listeners
  installTurboRenderListeners(debugFlag);

  // Setup custom event listener (uses core handleFlashPayload)
  document.addEventListener('flash-unified:messages', function(event) {
    debugLog('flash-unified:messages');
    try {
      handleFlashPayload(event.detail);
    } catch (e) {
      console.error('[FlashUnified] Failed to handle custom payload', e);
    }
  });
}

export {
  installTurboRenderListeners,
  setupTurboStreamEvents,
  setupFlashUnifiedForTurbo
};

/* ネットワークエラー関連のイベントリスナーを設定します。
  Turboフォーム送信時のエラー処理を自動化します。
  ---
  Install network error event listeners for automatic error handling.
  Handles Turbo form submission errors and network issues.
*/
function installNetworkErrorListeners(debugFlag = false) {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-network-listeners')) {
    return; // Already installed
  }
  root.setAttribute('data-flash-unified-network-listeners', 'true');

  const debugLog = debugFlag ? function(message) {
    console.debug(`[FlashUnified:NetworkError] ${message}`);
  } : function() {};

  // If Turbo is not present, these listeners will not fire. Provide a hint in debug mode.
  const turboPresent = typeof window !== 'undefined' && window.Turbo;
  if (!turboPresent) {
    debugLog('Turbo not detected. installNetworkErrorListeners will be inert. Use notifyNetworkError()/notifyHttpError() from your own handlers.');
  }

  document.addEventListener('turbo:submit-end', function(event) {
    debugLog('turbo:submit-end');
    const res = event.detail.fetchResponse;
    if (res === undefined) {
      handleFlashErrorStatus('network');
      console.warn('[FlashUnified] No response received from server. Possible network or proxy error.');
    } else {
      handleFlashErrorStatus(res.statusCode);
    }
    renderFlashMessages();
  });

  document.addEventListener('turbo:fetch-request-error', function(_event) {
    debugLog('turbo:fetch-request-error');
    handleFlashErrorStatus('network');
    renderFlashMessages();
  });
}

export { installNetworkErrorListeners };