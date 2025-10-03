# FlashUnified

FlashUnified は、サーバーサイドとクライアントサイドの両方から利用できる統一的な Flash メッセージ描画の仕組みを提供します。

サーバー側のビュー・ヘルパーで Flash メッセージをデータとしてページに埋め込み、クライアント側の軽量 JavaScript がそれを読み取って表示します。

## 現在のステータス

現在はアルファ版です。本番での使用は推奨しません。公開 API は安定しておらず、次のリリースで変更される可能性があります。

## モチベーション

同時に二つの課題がありました。

ひとつは、サーバーサイドからの Flash と同一の UI 表現で、クライアントサイドから発生するメッセージを表示できるようにしたいと思いました。たとえば巨大なリクエストがプロキシに遮断された時に、413 エラーを Flash として表示したい場合です。これは Rails サーバーに到達しないため、クライアントサイドで処理する必要がありますが、その際に通常の Flash と同じ UI ロジックで表示したいのです。

そしてもうひとつに、Turbo Frame からも Flash メッセージを表示したいと思いました。フレーム内に Flash を表示するならば問題ないのですが、大抵の場合はフレームの外側で表示するようになっているでしょう。

## 仕組み

これらの課題を解決するポイントは、JavaScript 側で描画を行う必要があるという点です。そこでサーバー側とクライアント側で役割を分ける「二段階」の処理を考えました。基本的には次のとおりです：

1. サーバーはヘルパーを使って、ページ内に非表示の DOM 要素としてメッセージを埋め込みます。
2. クライアント側の JavaScript はページの変化を検知したとき、非表示ストレージを走査し、保留中のメッセージを読み取ってテンプレートで整形し、それをコンテナ内に挿入（描画）します。なお重複表示を避けるために描画後に各ストレージ要素は DOM から取り除きます。


## 主な機能

- サーバー側のビュー・ヘルパーを提供します。これらは次のような要素をレンダリングします：
  - メッセージをページ内に一時保存するために埋め込む非表示要素（ストレージ）
  - 実際に表示するための要素の雛形（テンプレート）
  - テンプレートを挿入する場所を示すための要素（コンテナ）

- `app/javascript/flash_unified/flash_unified.js` に最小限のクライアントライブラリ（ES Module）を収録しています。Importmap やアセットパイプラインから読み込めます。

- 応用機能のための HTTP ステータス用のローカライズ済みメッセージを `config/locales` に収録しています。

## インストール

この gem はまだ RubyGems.org に公開していないアルファ版です。インストールは GitHub から行ってください。

アプリケーションの `Gemfile` に次を追加します：

```ruby
# Gemfile
gem 'flash_unified', github: 'hiroaki/flash-unified', branch: 'develop'
# 変更の影響を受けたくない場合は、特定のコミットに固定することもできます:
# gem 'flash_unified', github: 'hiroaki/flash-unified', ref: 'abcdef0'
```

その後、次を実行します：

```bash
bundle install
```

## セットアップ（クライアントサイド）

FlashUnified はクライアント（JavaScript）とサーバー（ビュー・ヘルパー）の両面から構成されます。

### 1. ファイルの配置（インストールジェネレータ）

ジェネレータを実行すると、以下のファイルがホストアプリにコピーされます：

- JavaScript（ES Modules）`app/javascript/flash_unified/` に以下をコピー
  - `flash_unified.js`（コア機能）
  - `auto.js`（自動初期化エントリ）
  - `turbo_helpers.js`（Turbo 連携ヘルパー）
  - `network_helpers.js`（ネットワーク/HTTP エラーヘルパー）
- ビュー（パーシャル）: `app/views/flash_unified/` に以下をコピー
  - `_templates.html.erb`（クライアントが使う `<template>` 要素）
  - `_storage.html.erb`（メッセージ埋め込みのための非表示ストレージ要素）
  - `_global_storage.html.erb`（主に Turbo Stream 用の非表示ストレージ要素）
  - `_container.html.erb`（メッセージをここに挿入するための可視コンテナ）
  - `_general_error_messages.html.erb`（I18n を使った HTTP ステータス・メッセージの定義）
- ロケールファイル: `config/locales/`
  - `http_status_messages.en.yml`
  - `http_status_messages.ja.yml`

実行方法：

```bash
bin/rails generate flash_unified:install
```

デフォルトでは既存ファイルを上書きしません。すでにパーシャルやロケールを管理している場合、ジェネレータはそれらをスキップします。


### 2. 初期化スタイルを選ぶ

簡単に始められる自動初期化（auto エントリ）か、より細かな制御のための手動配線のどちらかを選べます。

#### Importmap のピン

`config/importmap.rb` に以下を追加します：

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
```

#### かんたん導入（自動初期化）

JS エントリポイント（例: `app/javascript/application.js`）で次を読み込みます：

```js
import "flash_unified/auto"; // Turbo 連携と初回描画を自動で行います
```

動作は `<html>` の data 属性で切り替えできます：

- `data-flash-unified-auto-init="false"` — 自動初期化を無効化
- `data-flash-unified-debug="true"` — デバッグログを有効化
- `data-flash-unified-enable-network-errors="true"` — Turbo 向けネットワークエラーリスナーも有効化

例：

```erb
<html data-flash-unified-debug="true" data-flash-unified-enable-network-errors="true">
```

#### 手動制御（高度な構成向け）

- Turbo イベントに合わせて最小限の描画を行う：

```js
import { renderFlashMessages } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
// 必要なら初回だけ自分で呼ぶ:
// renderFlashMessages();
```

- 任意のタイミングでメッセージを出す（自前 JS から）：

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("保存しました", "notice");
renderFlashMessages();
```

- ネットワーク/HTTP エラー用ヘルパー（フレームワーク非依存 API）：

```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError(); // ネットワーク系エラーの汎用メッセージをセットして描画
notifyHttpError(413); // HTTP ステータス別のメッセージをセットして描画
```

#### アセットパイプライン（Propshaft / Sprockets）

レイアウトの module スクリプトで auto エントリを読み込みます：

```erb
<link rel="modulepreload" href="<%= asset_path('flash_unified/auto.js') %>">
<script type="module">
  import "<%= asset_path('flash_unified/auto.js') %>";
</script>
```

## セットアップ（サーバーサイド）

### ヘルパー

サーバーサイドで利用するビュー・ヘルパーは、クライアントが期待する構造の DOM 断片（テンプレート・ストレージ・コンテナ等）をレンダリングします。各ヘルパーに対応するパーシャル・テンプレートがあります。

- `flash_global_storage` → 主に Turbo Stream で利用するための、グローバルに置かれる非表示の埋め込み要素（注意： `id="flash-storage"` を含んでいます）。
- `flash_storage` → 非表示埋め込み要素。書き換えるコンテンツの中に含めてください。
- `flash_templates` → クライアントが使用する表示用の要素の雛形 `<template>`。
- `flash_container` → 実際にユーザーに見せる位置に置くコンテナ。
- `flash_general_error_messages` → HTTP ステータスに対するメッセージの定義を行う非表示要素（主にエラー表示用）。

### 最小のレイアウト例

これらは非表示要素のためどこに置いても構いません。通常は `<body>` の直下に配置しておけば十分です：
```erb
<%= flash_general_error_messages %>
<%= flash_global_storage %>
<%= flash_templates %>
```

メッセージを表示したい場所に配置：
```erb
<%= flash_container %>
```

表示する Flash メッセージの内容は、レスポンスするコンテンツ内に埋め込みます。これは非表示要素であるため、そのコンテンツ内のどこに配置してもかまいません。もし Turbo Frame のレスポンスならば、対象のフレーム内でレンダリングするように設定してください：
```erb
<%= flash_storage %>
```

### テンプレートのカスタマイズ

表示される Flash の見た目やマークアップのカスタマイズは、インストール・ジェネレータによってホスト・アプリにコピーされるパーシャル・テンプレート（`app/views/flash_unified/`）を編集してください。

以下はデフォルトの一部抜粋です（`app/views/flash_unified/_templates.html.erb`）：

```erb
<template id="flash-message-template-notice">
  <div class="flash-notice" role="alert">
    <span class="flash-message-text"></span>
  </div>
</template>
<template id="flash-message-template-warning">
  <div class="flash-warning" role="alert">
    <span class="flash-message-text"></span>
  </div>
</template>
```

`flash-message-template-notice` のようなテンプレート ID は Flash の "type"（例: `:notice`, `:alert`, `:warning`）に対応しています。クライアントはメッセージに含まれる type を参照して、該当するテンプレートを選択します。

クライアントはテンプレート内の `.flash-message-text` 要素の中にメッセージ文字列を挿入します。それ以外は制限はありません。必要に応じて追加の要素（例えば dismiss ボタン）を入れるなど、自由に表現してください。

## JavaScript API と拡張

JavaScript は最小コアとオプションのヘルパー群に分割されています。必要なものだけを選んで使えます。

### コア（`flash_unified`）

- `renderFlashMessages()` — 非表示ストレージを走査してコンテナに描画し、ストレージを削除
- `appendMessageToStorage(message, type = 'alert')` — グローバルストレージ（`#flash-storage`）に追記
- `clearFlashMessages(message?)` — 描画済みメッセージを全削除、または完全一致テキストのみ削除
- `processMessagePayload(payload)` — `{ type, message }[]` または `{ messages: [...] }` を受け取り、追記して描画
- `startMutationObserver(options = {})` — ストレージ/テンプレートの挿入を監視して描画（任意）
- `installCustomEventListener(debug = false)` — `flash-unified:messages` を購読してペイロード処理
- `storageHasMessages()` — ストレージ内に既存メッセージがあるか判定するユーティリティ

### カスタムイベント

任意のタイミングでメッセージを表示したい場合は、ドキュメントに `flash-unified:messages` イベントをディスパッチしてください。

```js
// 例1: 配列で渡す
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: [
    { type: 'notice', message: '保存しました' },
    { type: 'warning', message: '警告メッセージ' }
  ]
}));
```

```js
// 例2: オブジェクトで渡す
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: { messages: [ { type: 'alert', message: '失敗しました' } ] }
}));
```

### Turbo 連携ヘルパー（`flash_unified/turbo_helpers`）

- `installTurboRenderListeners(debug = false)` — Turbo のライフサイクル（Drive/Frame/Stream）に合わせて描画
- `installTurboIntegration(debug = false)` — Turbo リスナーとカスタムイベント処理をまとめて設定

### ネットワーク/HTTP エラー用ヘルパー（`flash_unified/network_helpers`）

- `notifyNetworkError()` — `#general-error-messages` から汎用ネットワークエラー文言を引いて描画
- `notifyHttpError(status)` — HTTP ステータス別の文言を引いて描画
- `resolveAndAppendErrorMessage(status)` — 下位 API。ストレージ/可視コンテナに既存メッセージがある場合は重複を避けます

### 自動初期化エントリ（`flash_unified/auto`）

インポートすると DOM 準備後に Turbo 連携の初期化を自動実行します。`<html>` の data 属性で制御します：

- `data-flash-unified-auto-init="false"` — 自動初期化を無効化
- `data-flash-unified-debug="true"` — デバッグログを有効化
- `data-flash-unified-enable-network-errors="true"` — Turbo 向けネットワークエラーリスナーも有効化

## 開発について

詳細な開発・テスト手順は [DEVELOPMENT.md](DEVELOPMENT.md)（英語）または [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md)（日本語）を参照してください。

## ライセンス

本プロジェクトは 0BSD (Zero-Clause BSD) ライセンスの下で公開されています。詳細は `LICENSE` をご確認ください。
