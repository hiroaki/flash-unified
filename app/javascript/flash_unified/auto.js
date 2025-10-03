/*
  Flash Unified Auto-Initialize Entry Point

  This module automatically initializes the flash message system when imported,
  eliminating the need for manual setup in simple cases.

  Usage patterns:

  1) Auto-initialize with Turbo integration (default behavior):
     import "flash_unified/auto";
     // Automatically sets up Turbo listeners and custom events

  2) Opt-out via HTML attribute:
     <html data-flash-unified-auto-init="false">
     import "flash_unified/auto";
     // No initialization occurs

  3) Enable debug mode:
     <html data-flash-unified-debug="true">
     import "flash_unified/auto";
     // Initializes with debug logging enabled

  4) Enable network error handling:
     <html data-flash-unified-enable-network-errors="true">
     import "flash_unified/auto";
     // Also installs network error listeners

  5) Manual control (use specific modules instead):
     import { renderFlashMessages } from "flash_unified";
     import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
     installTurboRenderListeners(true); // Call explicitly when needed

  Opt-out options:
  - Set <html data-flash-unified-auto-init="false"> to disable auto-initialization
  - Set <html data-flash-unified-debug="true"> to enable debug console output
  - Set <html data-flash-unified-enable-network-errors="true"> to enable network error handling
  - Use individual modules for full manual control
*/

import { installTurboIntegration, installNetworkErrorListeners } from './turbo_helpers.js';

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const autoInit = root.getAttribute('data-flash-unified-auto-init');

  // Only proceed if not explicitly disabled
  if (autoInit !== 'false') {
    const debug = root.getAttribute('data-flash-unified-debug') === 'true';
    const enableNetworkErrors = root.getAttribute('data-flash-unified-enable-network-errors') === 'true';

    const init = async () => {
  // Set up Turbo integration and custom event handling
  installTurboIntegration(debug);

      // Optionally install network error helpers
      if (enableNetworkErrors) {
        installNetworkErrorListeners(debug);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }
}
