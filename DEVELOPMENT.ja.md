# 開発者向けガイド

この文書は、テスト構成、CI、周辺スクリプトについて、現在の状況を整理したものです。

## 1. 現状サマリー

### サポート対象

- Ruby: 3.2, 3.3
- Rails: 7.1.5.2, 7.2.2.2, 8.0.3

### テスト・ツール

| 項目 | 状態/説明 | 参照/補足 |
|------|-----------|-----------|
| ユニットテスト | あり。例: `FlashUnified::Installer` の挙動、モジュールのスモークテスト | `test/unit`、`test/unit/flash_unified_test.rb` |
| ジェネレータテスト | あり（最小ケース） | `test/generators/install_generator_test.rb` |
| システムテスト | あり（最小ケース）。現状は rack_test ドライバで JS 実行は cuprite を予定 | `test/system/dummy_home_test.rb`、`test/application_system_test_case.rb` |
| JavaScript 単体テスト | 未導入 | 将来: jsdom + vitest 等を検討 |
| 複数 Rails 互換性 | Appraisals 導入済み | `Appraisals`、`bundle exec appraisal ...` |
| CI（GitHub Actions） | 導入済み | `.github/workflows/ci.yml` |
| サンドボックス | 手元検証用アプリを生成（Importmap/Propshaft/Sprockets） | `bin/sandbox`（テンプレ: `sandbox/templates/*.rb`） |
| 補助スクリプト | Appraisals を横断して system / generators テストを実行 | `bin/run-dummy-tests` |

## 2. ファイル構成

| 項目 | 役割/説明 | 主な場所 |
|------|-----------|-----------|
| エンジン本体 | Rails エンジンの核（初期化/コピー処理など） | `lib/flash_unified/`（例: `engine.rb`, `installer.rb`） |
| ビュー/JS/ロケール（配布物） | ホストアプリへ配布するテンプレート/JS/翻訳 | `app/views/flash_unified/*`<br>`app/javascript/flash_unified/flash_unified.js`<br>`config/locales/http_status_messages.*.yml` |
| ビュー・ヘルパ | レイアウトやビューで呼び出すヘルパ | `app/helpers/flash_unified/view_helper.rb` |
| テスト | ユニット/ジェネレータ/システムの各レイヤ | `test/unit`、`test/generators`、`test/system`、`test/test_helper.rb` |
| ダミーアプリ | テスト起動・再現性確保用の最小 Rails アプリ | `test/dummy` |
| CI | GitHub Actions ワークフロー | `.github/workflows/ci.yml` |
| Appraisals | Rails バージョン行列の定義 | `Appraisals` |
| サンドボックス雛形 | 手元検証用アプリの生成スクリプト/テンプレート | `bin/sandbox`、`sandbox/templates/*.rb` |

## 3. 開発セットアップ

1) 依存のインストール

```bash
bundle install
bundle exec appraisal install
```

2) 動作確認

```bash
bundle exec rake test:unit
bin/run-dummy-tests
bin/run-dummy-tests all generators
```

備考:
- Rails が必要なテストは Appraisals を使って実行します。 `bin/run-dummy-tests` は各バージョンの Rails を用いて system / generators テストを走らせるためのバッチスクリプトです。
- システムテストはまだ整備されていません。現在は Capybara との接続を確認している段階で rack_test ドライバで動いています。システムテストでは JavaScript を動かす必要があるため、ドライバーには cuprite を導入予定です。

## 4. テストの実行方法

全体をまとめて実行するテストは未整備です。次のとおり、単位ごとに実行してください。

```
# ユニットテストのみ
bundle exec rake test:unit

# ジェネレータテストのみ
bin/run-dummy-tests all generators

# システムテストのみ
bin/run-dummy-tests
bin/run-dummy-tests all

# 参考： ジェネレータテストのうち Rails 7.2 のみ
bin/run-dummy-tests rails-7.2 generators
bundle exec appraisal rails-7.2 rake test:generators

# 参考： システムテストのうち Rails 7.2 のみ:
bin/run-dummy-tests rails-7.2
bundle exec appraisal rails-7.2 rake test:system

# 参考: 個別ファイルの実行（ Rails 不要なもの）
bundle exec rake test TEST=test/unit/target_test.rb

# 参考: 個別ファイルの実行（ Rails を要するもの）
bundle exec appraisal rails-7.2 rake test TEST=test/system/target_test.rb
```

## 5. ダミーアプリとサンドボックス

- ダミーアプリ（`test/dummy`）
  - 目的: 自動テストの再現性を高める固定資産。
  - CI でもここを前提に実行されます。

- サンドボックス（`bin/sandbox`）
  - 目的: 手元での素早い実験（Importmap/Propshaft/Sprockets の違いを検証）。
  - 例:
    ```
    bin/sandbox importmap
    bin/sandbox propshaft --scaffold
    bin/sandbox sprockets --path ../..
    ```
  - 生成後の案内に従って `bin/rails server` で起動できます。

## A. 今後の展望

- ジェネレータテストの拡充（重複挿入の厳密検証、出力内容の詳細比較）。
- 最小限の JS ユニットテスト（必要になった時点で導入: jsdom+vitest 等）。
- システムテストのシナリオ追加（Turbo Frame/Stream を用いた代表ケース）。
