/*
  Flash Unified Auto-Initialize Entry Point

  This module automatically initializes the flash message system when imported,
  eliminating the need for manual setup in simple cases.

  Usage patterns:
  
  1) Auto-initialize (default behavior):
     import "flash_unified/auto";
     // Automatically calls initializeFlashMessageSystem() on DOM ready
  
  2) Opt-out via HTML attribute:
     <html data-flash-unified-auto-init="false">
     import "flash_unified/auto";
     // No initialization occurs
  
  3) Enable debug mode:
     <html data-flash-unified-debug="true">
     import "flash_unified/auto";
     // Initializes with debug logging enabled

  4) Manual control (use main module instead):
     import { initializeFlashMessageSystem } from "flash_unified";
     initializeFlashMessageSystem(); // Call explicitly when needed

  Opt-out options:
  - Set <html data-flash-unified-auto-init="false"> to disable auto-initialization
  - Set <html data-flash-unified-debug="true"> to enable debug console output
  - Use the main "flash_unified" module for full manual control
*/

import { initializeFlashMessageSystem } from './flash_unified.js';

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const autoInit = root.getAttribute('data-flash-unified-auto-init');
  
  // Only proceed if not explicitly disabled
  if (autoInit !== 'false') {
    const debug = root.getAttribute('data-flash-unified-debug') === 'true';
    const init = () => initializeFlashMessageSystem(debug);
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }
}
