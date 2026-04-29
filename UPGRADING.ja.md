# FlashUnified アップグレードガイド

バージョン間の互換情報と移行手順をまとめます。

## 旧名称から新名称への移行

現在は移行期間として旧名称も引き続き動作しますが、将来のバージョンで削除される予定です。手書きのレイアウトやカスタムテンプレート・カスタムレンダラで旧名称を使用している場合は、下記の対応表を参考に新しい名称へ移行してください。

| 旧名称 | 新しい名称 |
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
