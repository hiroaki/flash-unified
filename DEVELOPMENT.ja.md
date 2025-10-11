# 開発者向けガイド

この文書は、テスト構成、CI、周辺スクリプトについて、現在の状況を整理したものです。

## 1. 現状サマリー

### サポート対象

現在テスト対象としている Ruby および Rails のバージョンは次のとおりです：
- Ruby: 3.2, 3.3
- Rails: 7.1.5.2, 7.2.2.2, 8.0.3

### テスト・ツール

いくつかのディレクトリに用途別に分けています。

| テストカテゴリ | パス |
|------|-----------|
| ユニットテスト | `test/unit` |
| ジェネレータテスト | `test/generators` |
| システムテスト | `test/system` |

* JavaScript 単体テストは未導入（将来: jsdom + vitest 等を検討？）。当面はシステムテストで動作をチェックしてください。
* テスト時の Rails バージョン切り替えのために Appraisals を利用しています。
* CI には GitHub Actions を利用しています。
* サンドボックス（検証用即席アプリ）を生成するツールを提供しています。
* 補助スクリプト `bin/test` : Appraisals を横断して unit / generators / system テストを実行できます。

各項目についての詳細は以降のセクションで説明します。

## 2. ファイル構成

| 項目 | 役割/説明 | 場所 |
|------|-----------|-----------|
| エンジン本体 | Rails エンジンの核 | `lib/flash_unified/` |
| ビュー | ホストアプリへ配布するテンプレート | `app/views/flash_unified/` |
| JavaScript | ホストアプリへ配布する JavaScript ソース | `app/javascript/flash_unified/` |
| ロケール | ホストアプリへ配布する I18n 訳文ファイル | `config/locales/` |
| ビュー・ヘルパ | レイアウトやビューで呼び出すヘルパ | `app/helpers/flash_unified/` |
| テスト | ユニット/ジェネレータ/システムの各レイヤ | `test/{unit,generators,system}` |
| ダミーアプリ | テスト起動・再現性確保用の最小 Rails アプリ | `test/dummy` |
| CI | GitHub Actions ワークフロー | `.github/workflows/` |
| Appraisals | Rails バージョン行列の定義 | `Appraisals` |
| サンドボックス雛形 | 検証用即席アプリの生成スクリプト/テンプレート | `bin/sandbox`、`sandbox/templates/` |

## 3. 開発セットアップ

1) 依存のインストール

```bash
bundle install
bundle exec appraisal install
```

2) テストの実行

```bash
bin/test
```

備考:
- Rails が必要なテストは Appraisals を使って実行します。 `bin/test` は各バージョンの Rails を用いて unit / generators / system 各テストを横断実行するためのラッパーです。

## 4. テストの実行方法

テストは目的ごとに個別に実行できます。

シグネチャ: `bin/test [suite] [appraisal]`

```
# すべての Appraisals で全スイート（既定）
bin/test

# すべての Appraisals で特定スイートのみ
bin/test unit
bin/test generators
bin/test system

# 特定の Appraisal で全スイート
bin/test all rails-7.2

# 特定の Appraisal で特定スイート
bin/test unit rails-7.2
bin/test generators rails-7.2
bin/test system rails-7.2

# ユニットテストのみ（現在の Gemfile 使用）
bundle exec rake test:unit

# Appraisal を明示して Rake を直接呼ぶ例
bundle exec appraisal rails-7.2 rake test:unit
bundle exec appraisal rails-7.2 rake test:generators
bundle exec appraisal rails-7.2 rake test:system

# 参考: 個別ファイルの実行（ Rails 不要なもの）
bundle exec rake test TEST=test/unit/target_test.rb

# 参考: 個別ファイルの実行（ Rails を要するもの）
bundle exec appraisal rails-7.2 rake test TEST=test/system/target_test.rb
```

システムテストの Capybara のドライバーには cuprite を使用しています。そのため実行環境に Chrome ブラウザが必要です。

cuprite のカスタム設定が施してあり、環境変数 `HEADLESS` に `0` をセットするとヘッドレス・モードを解除します。また `SLOWMO` に秒数をセットすると、ステップごとにその秒数のディレイが入ります。これらを合わせて指定すると、ブラウザの実際の操作の様子を観察できます：
```
HEADLESS=0 SLOWMO=0.3 bin/test system rails-7.2
```

## 5. ダミーアプリとサンドボックス

### ダミーアプリ `test/dummy`

自動テストの再現性を確保するための Rails アプリがコミットされています。 CI でもここを対象に実行されます。

### サンドボックス作成コマンド `bin/sandbox`

手元で検証を行うために、 Importmap/Propshaft/Sprockets の構成で素早く Rails アプリを作成することができます。

オプション `--scaffold` を付与すると、 Memo リソース（コントローラ、モデル、ビュー）を作成します。

作成例:
```
bin/sandbox importmap
bin/sandbox propshaft --scaffold
bin/sandbox sprockets --scaffold --path ../..
```

生成後の案内に従って `bin/rails server` で起動してください。

## A. コントリビュートについて

バグ報告・機能提案・プルリクエスト歓迎します。以下の点にご協力ください：

- 質問は Issue ではなく [Discussions](https://github.com/hiroaki/flash-unified/discussions) にお寄せください。
- コード変更時は必ずテストを追加・修正し、`bin/test` で全テストが通ることを確認してください。
- Pull Request は最新の develop ブランチに対して出してください。また変更内容・目的・動作確認方法を PR の説明欄に明記してください。

ご協力ありがとうございます！
