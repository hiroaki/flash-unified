/*
  Flash Unified — Aggregated Entry Point

  This module bootstraps the default Flash Unified experience with a single import.
  It installs the auto-initialization side effects and re-exports the public APIs
  from the core, Turbo helpers, and network helpers so advanced users can access
  them without importing individual files.
*/

// Side-effect import: installs auto wiring when not disabled via HTML attributes.
import './auto.js';

// Re-export public APIs for convenience to advanced consumers.
export * from './flash_unified.js';
export * from './turbo_helpers.js';
export * from './network_helpers.js';
