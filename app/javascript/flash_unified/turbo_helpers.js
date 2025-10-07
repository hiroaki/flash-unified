/*
  Flash Unified — Turbo Integration Helpers

  Purpose:
  - Provide optional Turbo event listeners for automatic flash message rendering.
  - Users can install these listeners if they want automatic integration with Turbo.

  Usage:
    import { renderFlashMessages } from "flash_unified";
    import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

    // Install automatic Turbo event listeners
    installTurboRenderListeners();

    // For the initial render we recommend using the core helper:
    // import { installInitialRenderListener } from "flash_unified";
    // installInitialRenderListener();
*/

import { renderFlashMessages, installCustomEventListener } from './flash_unified.js';
import { resolveAndAppendErrorMessage } from './network_helpers.js';

/* Turbo関連のイベントリスナーを設定します。
  ページ遷移やフレーム更新時に自動的にフラッシュメッセージを描画します。
  ---
  Install Turbo event listeners for automatic flash message rendering.
  Renders messages on page navigation and frame updates.
*/
function installTurboRenderListeners() {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-turbo-listeners')) {
    return; // Already installed
  }
  root.setAttribute('data-flash-unified-turbo-listeners', 'true');

  // Turbo page load events
  document.addEventListener('turbo:load', function() {
    renderFlashMessages();
  });

  document.addEventListener('turbo:frame-load', function() {
    renderFlashMessages();
  });

  document.addEventListener('turbo:render', function() {
    renderFlashMessages();
  });

  // Turbo Stream events
  installTurboStreamEvents();
}

/* Turbo Stream更新後のカスタムイベントを設定します。
  turbo:before-stream-renderをフックして描画完了後にイベントを発火させます。
  ---
  Setup custom turbo:after-stream-render event for Turbo Stream updates.
  Hooks into turbo:before-stream-render to dispatch event after rendering is done.
*/
// Internal: used by installTurboRenderListeners
function installTurboStreamEvents() {
  // Create custom event for after stream render
  const afterRenderEvent = new Event("turbo:after-stream-render");

  // Hook into turbo:before-stream-render to add our custom event
  document.addEventListener("turbo:before-stream-render", (event) => {
    const originalRender = event.detail.render;
    event.detail.render = async function (streamElement) {
      await originalRender(streamElement);
      document.dispatchEvent(afterRenderEvent);
    };
  });

  // Listen for our custom after-stream-render event
  document.addEventListener("turbo:after-stream-render", function() {
    renderFlashMessages();
  });
}

/* Turboリスナー + カスタムイベントリスナーを一度に設定します。
  ---
  Sets up Turbo listeners + custom event listeners in one call.
*/
function installTurboIntegration() {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-initialized')) return; // idempotent
  root.setAttribute('data-flash-unified-initialized', 'true');

  // Delegate to existing installers to avoid duplicating logic.
  installTurboRenderListeners();
  installCustomEventListener();
}

export {
  installTurboRenderListeners,
  installTurboIntegration
};

/* ネットワークエラー関連のイベントリスナーを設定します。
  Turboフォーム送信時のエラー処理を自動化します。
  ---
  Install network error event listeners for automatic error handling.
  Handles Turbo form submission errors and network issues.
*/
function installNetworkErrorListeners() {
  const root = document.documentElement;
  if (root.hasAttribute('data-flash-unified-network-listeners')) {
    return; // Already installed
  }
  root.setAttribute('data-flash-unified-network-listeners', 'true');

  document.addEventListener('turbo:submit-end', function(event) {
    const res = event.detail.fetchResponse;
    if (res === undefined) {
      resolveAndAppendErrorMessage('network');
      console.warn('[FlashUnified] No response received from server. Possible network or proxy error.');
    } else {
      resolveAndAppendErrorMessage(res.statusCode);
    }
    renderFlashMessages();
  });

  document.addEventListener('turbo:fetch-request-error', function(_event) {
    resolveAndAppendErrorMessage('network');
    renderFlashMessages();
  });
}

export { installNetworkErrorListeners };