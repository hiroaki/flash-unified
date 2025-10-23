# FlashUnified

FlashUnified は、サーバーサイドとクライアントサイドの両方から利用できる統一的な Flash メッセージ描画の仕組みを Rails アプリに提供します。

サーバー側のビュー・ヘルパーで Flash メッセージをデータとしてページに埋め込み、クライアント側の軽量 JavaScript がそれを読み取ってページに表示します。

## 現在のステータス

バージョン v1.0.0 まではアルファ版として位置付けています。公開 API は安定しておらず、次のリリースで変更される可能性があります。

## モチベーション

同時に二つの課題がありました。

ひとつは、サーバーサイドからの Flash と同一の UI 表現で、クライアントサイドから発生するメッセージを表示できるようにしたいと思いました。たとえば巨大なリクエストがプロキシに遮断された時に、413 エラーを Flash として表示したい場合です。これはリクエストが Rails サーバーに到達しないため、クライアントサイドで処理する必要がありますが、その際に通常の Flash と同じ UI ロジックで表示したいのです。

そしてもうひとつに、Turbo Frame からも Flash メッセージを表示したいと思いました。フレーム内に Flash を表示するならば問題ないのですが、大抵の場合はフレームの外側で表示するようになっているでしょう。

## 仕組み

これらの課題を解決するポイントは、JavaScript 側で描画を行う必要があるという点です。そこでサーバー側とクライアント側で役割を分ける二段階の処理を考えました：

1. サーバーでは Flash オブジェクトをページ内に非表示の DOM 要素として埋め込み、ページを render して返します。
2. クライアントの JavaScript はページの変化を検知したとき、その要素を走査し、埋め込まれたメッセージを読み取ってテンプレートで整形し、それを指定されたコンテナ要素に挿入（描画）します。またその際、重複表示を避けるためにメッセージ要素は DOM から取り除きます。

このように仕組みは単純で、その仕組を実装するためには、どのように埋め込みを行うかのルールを決めるだけです。この gem では次のように埋め込みの DOM 構造を定義し、「ストレージ」と呼ぶことにします：

```erb
<div data-flash-storage style="display: none;">
  <ul>
    <% flash.each do |type, message| %>
      <li data-type="<%= type %>"><%= message %></li>
    <% end %>
  </ul>
</div>
```

ストレージは非表示要素のため、サーバーが render するページのどこに置いても構いません。Turbo Frame の場合はフレームの中に置きます。

そして Flash メッセージを表示する場所である「コンテナ」、および整形のための「テンプレート」はストレージとは関係なく任意の場所に配置します。つまり Turbo Frame であっても、フレームの外側に配置されている Flash 描画領域に対して機能します。

フォームを送信した時にプロキシがエラーを返しくるようなケースをクライアントサイドで処理する場合は、 JavaScript から直接的にエラーメッセージを表示をするのではなく、メッセージをいったんコンテナ要素として埋め込むことによって、同じように（同じテンプレート、同じ処理フローを用いて）Flash を描画することができるようになります。

一方で Flash をセットするコントーラでは、通常の Flashメッセージの表示の手続きとなんら変わるところがありません：

```ruby
if @user.save
  redirect_to @user, notice: "Created successfully."
else
  flash.now[:alert] = "Could not create."
  render :new, status: :unprocessable_content
end
```

つまりこの gem を導入するにあたって、現在のコントローラは変更不要です。また従来のページレイアウトも変える必要はほとんどありません。ビューに設定すべき DOM 要素は非表示要素であり、Flash メッセージを表示するコンテナ領域を少し調整するだけで済むでしょう。

この gem を導入することで主に実装すべきことは、埋め込みデータを Flash メッセージとして表示するタイミングです。通常はイベントを利用することになるでしょう。具体的な処理は実装者に委ねられますが、イベントのセットアップを自動で行うヘルパーも用意されています。任意の処理の中で、表示のためのメソッドを明示的に呼ぶこともできます。

## 主な機能

この gem が提供するのはその仕組みを、決まったルールに整えることと、その実装を補助するツール類です。

サーバーサイド：
- いくつかのビュー・ヘルパー。これらは次のような要素をレンダリングします：
  - メッセージをページ内に一時保存するために埋め込む非表示要素（ストレージ）
  - 実際に表示するための要素の雛形（テンプレート）
  - テンプレートを挿入する場所を示すための要素（コンテナ）
- 応用機能のための HTTP ステータス用のローカライズ済みメッセージ

クライアントサイド：
- `flash_unified.js` に最小限のライブラリ（ES Module）。Importmap やアセットパイプラインから読み込むように設定します。
- `auto.js` 自動初期化を行うヘルパー（オプション）
- `turbo_helpers.js` Turbo 連携のためのヘルパー（オプション）
- `network_helpers.js` ネットワーク/HTTP エラー表示のためのヘルパー（オプション）

ジェネレータ：
- 以上の各ファイルを配置するためのインストール用ジェネレータ

## インストール

アプリケーションの `Gemfile` に次を追加します：

```ruby
gem 'flash_unified'
```

その後、次を実行します：

```bash
bundle install
```

## セットアップ

### 1. ファイルの配置（カスタマイズが必要な場合のみ）

この gem は JavaScript、テンプレートおよびロケールの翻訳ファイルをエンジン内から提供します。カスタマイズしたい場合のみ、該当するファイルをジェネレータでコピーして編集してください。詳しくは後述します。

### 2. JavaScript ライブラリの設置

**Importmap の場合**

`config/importmap.rb` に、使用する JavaScript を pin してください：

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
```

描画のタイミングを自動で設定する場合は `auto.js` を使います。`auto.js` は Turbo 連携のイベントの登録およびカスタムイベントの登録、そしてページの初回描画時の処理を自動で行います。

そうしたイベントを自身で制御（実装）することがある場合は、コア・ライブラリである `flash_unified.js` を使って描画処理を独自に実装してください。その場合 `auto.js` は不要です。またヘルパー `turbo_helpers.js` と `network_helpers.js` はオプションですので、利用するものだけ pin してください。

**アセットパイプライン（Propshaft / Sprockets） の場合**

```erb
<link rel="modulepreload" href="<%= asset_path('flash_unified/flash_unified.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/network_helpers.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/turbo_helpers.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/auto.js') %>">
<script type="importmap">
  {
    "imports": {
      "flash_unified": "<%= asset_path('flash_unified/flash_unified.js') %>",
      "flash_unified/auto": "<%= asset_path('flash_unified/auto.js') %>",
      "flash_unified/turbo_helpers": "<%= asset_path('flash_unified/turbo_helpers.js') %>",
      "flash_unified/network_helpers": "<%= asset_path('flash_unified/network_helpers.js') %>"
    }
  }
</script>
<script type="module">
  import "flash_unified/auto";
</script>
```

### 3. JavaScript 初期化処理

ヘルパーを利用する場合は、ページのロードの際にイベントを登録するための初期化処理を実行してください。

**自動初期化（簡易な実装のケース）**

`auto.js` を利用する場合、 JavaScript エントリポイント（例: `app/javascript/application.js`）で `auto` 読み込みます：
```js
import "flash_unified/auto";
```

読み込みと同時に、初期化処理も実行されます。そのときの動作は `<html>` の data 属性で切り替えできます。具体的には後述します。

**半自動制御（Turbo イベントに関しては自動で設定）**

`turbo_helpers.js` を利用する場合も同様ですが、初期化処理は自動では実行されません。読み込んだモジュールから次のように各メソッドを実行します：
```js
import { installInitialRenderListener } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
installInitialRenderListener();
```

これにより、ページの変化（Turbo のイベント）が検知されたときに Flash メッセージが描画されます。

**手動制御（イベント・ハンドラーを自身で実装するケース）**

イベントの登録などを含めて自前で制御する場合は、コア・ライブラリを読み込み、そのメソッドを使って描画する処理を実装してください。

少なくとも、通常はページのロード時（初期表示時）には、サーバーサイドがページに埋め込んだかもしれないメッセージを処理するために `renderFlashMessages()` を呼ぶことになります。これは定型の手続きになるため `installInitialRenderListener()` として用意されています：

```js
import { installInitialRenderListener } from "flash_unified";
installInitialRenderListener();
```

サーバーサイドによる Flash メッセージが埋め込まれた要素（ストレージ）を処理するために、適切なタイミングで描画処理を呼ぶようにしてください。おそらくは、何らかのイベント・ハンドラーの中に `renderFlashMessages()` の呼び出しを書くことになります：

```js
renderFlashMessages();
```

## セットアップ（サーバーサイド）

### ヘルパー

サーバーサイドで利用するビュー・ヘルパーは、クライアントが期待する構造の DOM 断片（テンプレート・ストレージ・コンテナ等）をレンダリングします。各ヘルパーに対応するパーシャル・テンプレートがありますが、 `flash_templates` 用のパーシャル・テンプレート以外については基本的には変更不要です。

- `flash_global_storage` グローバルに置かれる汎用ストレージ要素（注意： `id="flash-storage"` を含んでいます）。
- `flash_storage` ストレージ要素。書き換えるコンテンツの中に含めてください。
- `flash_templates` クライアントが使用する表示用の要素の雛形 `<template>`。
- `flash_container` 実際にユーザーに見せる位置に目標として置くコンテナ要素。
- `flash_general_error_messages` HTTP ステータスに対するメッセージの定義を行う要素。

重要: JavaScript は gem が定めた特定の DOM 規約に依存しています（例: グローバルストレージ要素に `id="flash-storage"` を付与すること、テンプレートの ID は `flash-message-template-<type>` という形式にすることなど）。これらの ID やセレクタを変更する場合は、対応する JavaScript 側のコードも更新してください。変更を行うと連携を壊してしまいます。

### 最小のレイアウト例

これらは非表示要素のためどこに置いても構いません。通常は `<body>` の直下に配置しておけば十分です：
```erb
<%= flash_general_error_messages %>
<%= flash_global_storage %>
<%= flash_templates %>
```

Flash メッセージを表示したい場所に配置します：
```erb
<%= flash_container %>
```

表示する Flash メッセージの内容は、レスポンスするコンテンツ内に埋め込みます。これは非表示要素であるため、そのコンテンツ内のどこに配置してもかまいません。もし Turbo Frame のレスポンスならば、対象のフレーム内でレンダリングするように配置してください：
```erb
<%= flash_storage %>
```

### テンプレートのカスタマイズ

Flash 要素の見た目やマークアップをカスタマイズしたい場合は、まず次のコマンドでテンプレートをホストアプリにコピーしてください：

```bash
bin/rails generate flash_unified:install --templates
```

コピーされた `app/views/flash_unified/_templates.html.erb` を編集することで、自由にカスタマイズできます。

以下は一部抜粋です：

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

クライアントはテンプレート内の `.flash-message-text` 要素の中にメッセージ文字列を挿入します。それ以外は制約はありません。必要に応じて追加の要素（例えば dismiss ボタン）を入れるなど、自由に表現してください。

## JavaScript API と拡張

JavaScript はコア・ライブラリとオプションのヘルパー群に分割されています。必要なものだけを選んで使えます。

### コア（`flash_unified`）

- `renderFlashMessages()` — ストレージを走査してコンテナに描画し、ストレージを削除します。
- `appendMessageToStorage(message, type = 'notice')` — グローバルなストレージにメッセージを追記します。
- `clearFlashMessages(message?)` — 描画済み Flash メッセージを全削除、または完全一致のもののみ削除します。
- `processMessagePayload(payload)` — `{ type, message }[]` または `{ messages: [...] }` を受け取り、追記して描画します。
- `installCustomEventListener()` — `flash-unified:messages` を購読してペイロード処理します。
- `storageHasMessages()` — ストレージ内に既存メッセージがあるか判定するユーティリティです。
- `startMutationObserver()` — （オプション：試験的）ストレージ/テンプレートの挿入を監視して描画します。
 - `consumeFlashMessages(keep = false)` — 現在のページに埋め込まれているすべての `[data-flash-storage]` を走査してメッセージ配列（{ type, message }[]）を返します。デフォルトではストレージ要素を削除する破壊的な動作を行いますが、`keep = true` を渡すとストレージを残したまま取得だけを行います。
- `aggregateFlashMessages()` — `consumeFlashMessages(true)` の薄いラッパーで、非破壊的にストレージを走査してメッセージ配列を返します。外部のトーストライブラリなどにメッセージを渡して処理する際に便利です。

クライアント内で生成した Flash メッセージを任意のタイミングで表示するには、次のようにメッセージの埋め込みを行ってから、描画処理を行うようにします：

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("ファイルサイズが大きすぎます。", "notice");
renderFlashMessages();
```

サーバー埋め込みのメッセージをページにレンダリングするのではなく、トースト等の外部ライブラリに渡して表示したい場合、`aggregateFlashMessages()` を使ってストレージを破壊せずにメッセージを取得し、通知ライブラリに渡せます：

```js
import { aggregateFlashMessages } from "flash_unified";

document.addEventListener('turbo:load', () => {
  const msgs = aggregateFlashMessages();
  msgs.forEach(({ type, message }) => {
    YourNotifier[type](message); // toastr.info(message) のように
  });
});
```

### カスタムレンダラー（setFlashMessageRenderer）

既定の `renderFlashMessages()` ではテンプレートを使った DOM を `[data-flash-message-container]` に挿入して表示しますが、この処理を任意のレンダラー関数で置き換えることができます。たとえば Notyf などのサードパーティの通知ライブラリと連携させることができます。

設定する関数の引数には `{ type, message }[]` の配列が渡されます。

関数をセットする代わりに `null` を渡すと既定のレンダラーに戻ります。

- シグネチャ: `setFlashMessageRenderer(fn: (messages: { type: string, message: string }[]) => void | null)`
- 例外: `fn` が関数でも `null` でもない場合は `TypeError` を投げます。

Notyf を使った例：

```js
import { setFlashMessageRenderer } from "flash_unified";

setFlashMessageRenderer((messages) => {
  const notyf = new Notyf();
  messages.forEach(({ type, message }) => {
    const level = type === 'info' || type === 'notice' ? 'success' : 'error';
    notyf.open({ type: level, message });
  });
});
```

`auto.js` を使う場合の重要な注意: 初回描画でカスタムレンダラーを使わせるために、`import "flash_unified/auto"` より先にカスタムレンダラーを登録してください。

Importmap/アセットパイプラインのレイアウト例（順序が重要 — 先に登録、その後 auto を読み込み）：

```erb
<script type="module">
  import { setFlashMessageRenderer } from "flash_unified";
  setFlashMessageRenderer((messages) => {
    ...
  });
</script>
<script type="module">
  import "flash_unified/auto";
</script>
```

あるいは、auto を無効化して手動で初期化しても構いません：

```erb
<html data-flash-unified-auto-init="false">
  ...
  <script type="module">
    import { setFlashMessageRenderer, installInitialRenderListener } from "flash_unified";
    setFlashMessageRenderer((msgs) => { /* custom */ });
    installInitialRenderListener(); // もしくは適時 renderFlashMessages() を呼ぶ
  </script>
</html>
```

注意: もし初回描画のあとにカスタムレンダラーを登録した場合、その後のレンダリングから反映されます。挙動の混在を避けるため、初回描画前に登録する（または auto を無効にして手動で描画処理を実装する）ことを推奨します。

### カスタムイベント

カスタムイベントを利用する場合は、初期化時に `installCustomEventListener()` を実行しておきます：

```js
import { installCustomEventListener } from "flash_unified";
installCustomEventListener();
```

その後任意のタイミングで、ドキュメントに `flash-unified:messages` イベントをディスパッチしてください。

```js
// 例：配列で渡す
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: [
    { type: 'notice', message: '送信しました。' },
    { type: 'warning', message: '有効期限は一週間です。' }
  ]
}));

// 例：オブジェクトで渡す
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: { messages: [ { type: 'alert', message: '操作はキャンセルされました。' } ] }
}));
```

### Turbo 連携ヘルパー（`flash_unified/turbo_helpers`）

Turbo を使用してページの部分更新を行っている場合には、その部分更新が発生したことのイベントをトリガーとして描画処理を行う必要がありますが、そのためのイベント・リスナーの登録を一括して行うヘルパーが用意してあります。

- `installTurboRenderListeners()` — Turbo のライフサイクルに合わせて描画するためのイベントを登録します。
- `installTurboIntegration()` — `auto.js` から利用される想定で `installTurboRenderListeners()` と `installCustomEventListener()` をまとめたものです。

```js
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
installTurboRenderListeners();
```

### ネットワーク/HTTP エラー用ヘルパー（`flash_unified/network_helpers`）

ネットワーク/HTTP エラー用ヘルパーを利用する場合は次のようにします：
```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError(); // ネットワーク系エラーの汎用メッセージをセットして描画
notifyHttpError(413); // HTTP ステータス別のメッセージをセットして描画
```

- `notifyNetworkError()` — `#general-error-messages` から汎用ネットワークエラーの文言を利用して描画します。
- `notifyHttpError(status)` — 同様に HTTP ステータス別の文言を利用して描画します。

これらに使われる文言は、サーバーサイドのビュー・ヘルパー `flash_general_error_messages` によって書き出される非表示要素になっており、その元の文言は I18n の翻訳ファイルとして `config/locales/http_status_messages.*.yml` に配置されています。

デフォルトの翻訳内容をカスタマイズしたい場合は、次のコマンドでファイルをホストアプリに翻訳ファイルをコピーし、編集してください：

```bash
bin/rails generate flash_unified:install --locales
```

### 自動初期化エントリ（`flash_unified/auto`）

`flash_unified/auto` をインポートすると、 DOM 準備後に Turbo 連携の初期化が自動で実行されます。その時の動作を `<html>` の data 属性で制御することができます：

- `data-flash-unified-auto-init="false"` — 自動初期化を無効化します。
- `data-flash-unified-enable-network-errors="true"` — ネットワーク/HTTP エラーのためのリスナーも有効化します。

```erb
<html data-flash-unified-enable-network-errors="true">
```

## 開発について

詳細な開発・テスト手順は [DEVELOPMENT.md](DEVELOPMENT.md)（英語）または [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md)（日本語）を参照してください。

## 変更履歴

変更履歴は [GitHub Releases page](https://github.com/hiroaki/flash-unified/releases) を参照してください。

## ライセンス

本プロジェクトは 0BSD (Zero-Clause BSD) ライセンスの下で公開されています。詳細は `LICENSE` をご確認ください。
