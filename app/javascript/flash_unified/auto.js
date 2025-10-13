/*
  Flash Unified Auto-Initialize Entry Point

  This module automatically initializes the flash message system when imported
  to simplify setup for common cases.

  Usage patterns:

  1) Auto-initialize with Turbo integration (default behavior):
    import "flash_unified/auto";
    // Automatically sets up Turbo listeners and custom events

  2) Opt-out via HTML attribute:
    <html data-flash-unified-auto-init="false">
    import "flash_unified/auto";
    // No initialization occurs

  3) Enable network error handling:
    <html data-flash-unified-enable-network-errors="true">
    import "flash_unified/auto";
    // Also installs network error listeners

  Opt-out/Opt-in options:
  - Set <html data-flash-unified-auto-init="false"> to disable auto-initialization
  - Set <html data-flash-unified-enable-network-errors="true"> to enable network error handling
*/

import { installTurboIntegration, installNetworkErrorListeners } from 'flash_unified/turbo_helpers';
import { installInitialRenderListener } from 'flash_unified';

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const autoInit = root.getAttribute('data-flash-unified-auto-init');

  // Only proceed if not explicitly disabled
  if (autoInit !== 'false') {
    const enableNetworkErrors = root.getAttribute('data-flash-unified-enable-network-errors') === 'true';

    const init = async () => {
      // Set up Turbo integration and custom event handling
      installTurboIntegration();
      installInitialRenderListener();
      // Optionally install network error helpers
      if (enableNetworkErrors) {
        installNetworkErrorListeners();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }
}
