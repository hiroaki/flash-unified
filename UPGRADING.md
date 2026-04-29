# Upgrading FlashUnified

Compatibility notes and migration guidance between versions.

## Migrating from legacy marker names

Legacy marker names are still accepted during the transition period, but are planned for removal in a future version. If you have hand-written layouts, custom templates, or custom renderers that reference legacy names, use the table below to replace them with the new names.

| Legacy name | New name |
| --- | --- |
| `data-flash-storage` | `data-flash-unified-storage` |
| `data-object-id` | `data-flash-unified-storage-dedupe-key` |
| `data-type` | `data-flash-unified-message-type` |
| `data-flash-message` | `data-flash-unified-message` |
| `data-flash-message-text` | `data-flash-unified-message-text` |
| `data-flash-message-container` | `data-flash-unified-container` |
| `data-flash-primary` | `data-flash-unified-container-primary` |
| `data-flash-message-container-priority` | `data-flash-unified-container-priority` |
| `id="flash-storage"` | `id="flash-unified-storage"` |
| `id="general-error-messages"` | `id="flash-unified-general-errors"` |
| `id="flash-message-template-<type>"` | `id="flash-unified-template-<type>"` |
