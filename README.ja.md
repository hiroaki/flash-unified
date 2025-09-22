# FlashUnified

FlashUnified は、サーバーサイドとクライアントサイドの両方から利用できる統一的な Flash メッセージ描画の仕組みを提供します。

サーバー側のビュー・ヘルパーで Flash メッセージをデータとしてページに埋め込み、クライアント側の軽量 JavaScript がそれを読み取って表示します。

## 現在のステータス

現在はアルファ版です。本番での使用は推奨しません。公開 API は安定しておらず、次のリリースで変更される可能性があります。

## 主な機能

- サーバー側のビュー・ヘルパーを提供します。これらは次のような要素をレンダリングします：
  - メッセージをページ内に一時保存するために埋め込む非表示要素（ストレージ）
  - 実際に表示するための要素の雛形（テンプレート）
  - テンプレートを挿入する場所を示すための要素（コンテナ）

- `app/javascript/flash_unified/flash_unified.js` に最小限のクライアントライブラリ（ES module）を収録しています。importmap やアセットパイプラインから読み込めます。

- 応用機能のための HTTP ステータス用のローカライズ済みメッセージを `config/locales` に収録しています。

## 仕組み

この gem が提供する Flash の表示の仕組みのポイントは、サーバー側とクライアント側で役割を分ける "二段階" の処理にあります。基本的には次のとおりです：

1. サーバーはヘルパーを使って、ページ内に非表示の DOM 要素としてメッセージを埋め込みます。
2. クライアント側の JavaScript はページの変化を検知したとき、非表示ストレージを走査し、保留中のメッセージを読み取ってテンプレートで整形し、それをコンテナ内に挿入（描画）します。


## インストール

アプリケーションの `Gemfile` に次を追加します：

```ruby
gem 'flash_unified'
```

その後、次を実行します：

```bash
bundle install
```

または、直接 gem をインストールするには：

```bash
gem install flash_unified
```

## Rails 7+ での利用（importmap / propshaft）

FlashUnified は `app/javascript/flash_unified` にクライアントコードを持ち、いくつかのビュー・ヘルパーを提供してクライアントが期待する DOM テンプレートやストレージ要素をレンダリングします。

### インストールジェネレータが行うこと

ジェネレータを実行すると、以下のファイルがホストアプリにコピーされます：

- JavaScript: `app/javascript/flash_unified/flash_unified.js`
- ビュー（パーシャル）: `app/views/flash_unified/` に以下をコピー
  - `_templates.html.erb`（クライアントが使う `<template>` 要素）
  - `_storage.html.erb`（メッセージ埋め込みのための非表示ストレージ要素）
  - `_global_storage.html.erb`（主に Turbo Stream 用の非表示ストレージ要素）
  - `_container.html.erb`（メッセージをここに挿入するための可視コンテナ）
  - `_general_error_messages.html.erb`（I18n を使った HTTP ステータス・メッセージの定義）
- ロケールファイル: `config/locales/`
  - `http_status_messages.en.yml`
  - `http_status_messages.ja.yml`

### ジェネレータの実行方法：

```bash
bin/rails generate flash_unified:install
```

デフォルトでは既存ファイルを上書きしません。すでにパーシャルやロケールを管理している場合、ジェネレータはそれらをスキップします。

## Importmap / Propshaft / Sprockets

### Importmap（Rails 7+ で bundler を使わない場合の推奨）

1. ジェネレータを実行し、`app/javascript/flash_unified/flash_unified.js` を配置します。
2. `config/importmap.rb` にピンを追加します：

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
```

3. JavaScript エントリポイント（例: `app/javascript/application.js`）から import します：

```js
import "flash_unified"
```

### Propshaft / Sprockets

エンジンは `app/javascript` をホストアプリのアセットパスに含めます。レイアウトで直接読み込めます：

```erb
<%= javascript_include_tag "flash_unified/flash_unified" %>
```

## ヘルパー

この gem は次のようなヘルパーを提供します（各ヘルパーは対応するパーシャル・テンプレートをレンダリングします）：

- `flash_global_storage` → 主に Turbo Stream で利用するための、グローバルに置かれる非表示の埋め込み要素（注意： `id="flash-storage"` を含んでいます）。
- `flash_storage` → 非表示埋め込み要素。書き換えるコンテンツの中に含めてください。
- `flash_templates` → クライアントが使用する表示用の要素の雛形 `<template>`。
- `flash_container` → 実際にユーザーに見せる位置に置くコンテナ。
- `flash_general_error_messages` → HTTP ステータスに対するメッセージの定義を行う非表示要素（主にエラー表示用）。

### 最小のレイアウト例（`<body>` 内に配置）:

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

表示するための Flash メッセージは、レスポンスするコンテンツ内に埋め込みます。これは非表示要素であるため、そのコンテンツ内のどこに配置してもかまいません：
```erb
<%= flash_storage %>
```

## テンプレートのカスタマイズ

表示される Flash の見た目やマークアップのカスタマイズは、インストール・ジェネレータによってホスト・アプリにコピーされるパーシャル・テンプレート（`app/views/flash_unified/`）を編集してください。スタイルや DOM 構造を直接変更することで、表示を自由に調整できます。

以下はデフォルトの一部抜粋です（`app/views/flash_unified/_templates.html.erb`）：

```erb
<template id="flash-message-template-notice">
  <div class="flash-notice" role="alert">
    <span class="flash-message-text"></span>
  </div>
</template>
<template id="flash-message-template-warning">
  <div class="flash-alert" role="alert">
    <span class="flash-message-text"></span>
  </div>
</template>
```

`flash-message-template-notice` のようなテンプレート id は flash の "type"（例: `:notice`, `:alert`, `:warning`）に対応しています。クライアントはメッセージに含まれる type を参照して、該当するテンプレートを選択します。独自のタイプを追加する場合は対応するテンプレートを同じ id 形式で追加してください。

クライアントはテンプレート内の `.flash-message-text` 要素の中にメッセージ文字列を挿入します。したがって、見た目を変えるときはこの要素の構造を意識して CSS を充てるか、必要に応じて追加の要素（例えば dismiss ボタン）を入れてください。


## ロケールファイル

応用機能のために、この gem は `config/locales/http_status_messages.*.yml`（英語・日本語）を収録しています。ジェネレータはこれらをホストアプリの `config/locales/` にコピーします。既存ファイルは上書きされません。

## 開発について

詳細な開発・テスト手順は [DEVELOPMENT.md](DEVELOPMENT.md)（英語）または [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md)（日本語）を参照してください。

## ライセンス

本プロジェクトは 0BSD (Zero-Clause BSD) ライセンスの下で公開されています。詳細は `LICENSE` をご確認ください。
