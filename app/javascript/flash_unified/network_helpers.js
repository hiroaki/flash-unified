/*
  Flash Unified — Network Error Helpers

  Purpose:
  - Provide optional network and HTTP error handling for Turbo form submissions.
  - Users can install these listeners if they want automatic error message display.

  Required DOM:
    <ul id="general-error-messages" style="display:none;">
      <li data-status="413">Payload Too Large</li>
      <li data-status="network">Network Error</li>
      <li data-status="500">Internal Server Error</li>
    </ul>

  Usage:
    // Framework-agnostic helpers (call from your own handlers)
    import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";
    notifyNetworkError();   // Add generic network error and render
    notifyHttpError(413);   // Add HTTP-specific message and render

    // Turbo-specific automatic listeners (optional):
    // import { installNetworkErrorListeners } from "flash_unified/turbo_helpers";
    // installNetworkErrorListeners(true); // debug=true
*/

import { renderFlashMessages, appendMessageToStorage, storageHasMessages } from './flash_unified.js';

/* エラーステータスに応じた汎用メッセージをストレージへ追加します。
  既にストレージにメッセージが存在する場合は何もしません。
  'network' または 4xx/5xx を対象とし、#general-error-messages から文言を解決します。
  ---
  Add a general error message to storage based on status ('network' or 4xx/5xx).
  If any storage already has messages, this is a no-op. Looks up text in #general-error-messages.
*/
function resolveAndAppendErrorMessage(status) {
  // If any flash storage already contains messages, do not override it
  if (storageHasMessages()) return;

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
  if (container && container.querySelector('[data-flash-message]')) return;

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

function notifyNetworkError() {
  resolveAndAppendErrorMessage('network');
  renderFlashMessages();
}

function notifyHttpError(status) {
  resolveAndAppendErrorMessage(status);
  renderFlashMessages();
}

export {
  resolveAndAppendErrorMessage,
  notifyNetworkError,
  notifyHttpError
};
