# 開発者向けドキュメント

このドキュメントは、新しくこのプロジェクトに参加する開発者向けに、開発環境のセットアップ、テスト戦略（ユニット / ジェネレータ / E2E）、Sandbox の使い方、および日常的なワークフローを分かりやすくまとめたものです。詳細な背景や運用上の細かい注意点は後半の短い TIPS にまとめています。

## 要約

- ユニットテスト: `lib/` のロジックや `FlashUnified::Installer` の動作はユニットテストでカバーします（Rails 不要）。
- ジェネレータ検証: ファイル生成そのもののテストは `test/generators/` や手動の確認で行います（Rails が必要です）。
- E2E（実動確認）: gem をホストアプリに組み込んだ状態で Flash の実表示を自動検証するには、Sandbox を用意して Capybara 等の system テストを実行するのが望ましいです。

## セットアップ

1. 依存をインストール:

```bash
bundle install
```

2. ユニットテストの実行（例）:

```bash
bundle exec rake test TEST=test/unit/installer_test.rb
# またはスイート全体
bundle exec rake test
```

注意: `rake test` はデフォルトで `test/dummy/**` と `sandbox/*/test/**` を除外しています。つまり通常のテスト実行は Rails を必要としないユニットテストだけを対象にしています。

## 推奨ワークフロー

目的ごとに作業手順を分けることで、効率的に開発と検証が行えます。

1) 速いループ — ロジック修正とユニットテスト

- 編集: `lib/` の実装を修正
- 実行: `bundle exec rake test TEST=test/unit/...`（Rails 不要）

2) ジェネレータ検証 — 生成物の確認

- 目的: ジェネレータが正しい partial/template/locale を出力するかを確認。
- 方法: `test/generators/` のテストを使う（Rails が必要）か、手動で sandbox に対して `bin/rails generate flash_unified:install` を実行して生成物を目視確認します。

3) E2E/統合テスト — 実際に表示されるかの検証

- 目的: gem をインストールしたホストアプリで Flash が正しく表示されることを検証。
- 方法: Sandbox を作成して `Gemfile` に `gem 'flash_unified', path: '../../'` を追加し、Capybara を使った system テストを sandbox 側に置いて実行するのが実用的です（CI の別ジョブで自動化可能）。

## ジェネレータ統合テスト（ローカル実行）

テストは `test/generators/` に置かれ、`Rails::Generators::TestCase` を使います。ローカルで実行する場合は `:development, :test` グループに Rails を追加してください。

```ruby
# Gemfile (例)
group :development, :test do
  gem "rails", "~> 7.1"
end
```

```bash
bundle install
bundle exec rake test TEST=test/generators/install_generator_test.rb
```

## Sandbox と E2E（Capybara）の方針

目的: gem を組み込んだ実アプリでの表示を自動化して検証する。手順は次の通りです。

1. Sandbox を作る（既存の `bin/sandbox` を使うか手動で `rails new`）
2. Sandbox の `Gemfile` にローカル参照を追加:

```ruby
gem 'flash_unified', path: '../../'
```

3. `bundle install` → `bin/rails generate flash_unified:install` → `bundle exec rake test:system`（Capybara の system tests を実行）

テスト例（ざっくり）: コントローラで `redirect_to ..., flash: { notice: 'ok' }` を返して、Capybara でページを開き `assert_text 'ok'` を確認します。非同期表示の待機は Capybara の `have_selector` / `have_text` を利用してください。

注意事項:
- Sandbox は通常コミットしないでください。確認用に一時的に作るか、専用のブランチに置く運用がおすすめです。
- Sandbox で修正点が見つかったら、修正は gem のコード側（このリポジトリの `lib/` 等）に反映してコミットし、その後 Sandbox を再構築して検証する流れにしてください。

## CI に関する簡潔な方針

- ユニットテストは軽量に保ち、`rake test` で速く回す。
- ジェネレータ統合テストは CI の別ジョブで Rails を追加して実行する。
- E2E（Sandbox + Capybara）はリソース的に重いため、CI では必要に応じて別ジョブで定期実行または PR 必要時のみ実行するのが現実的です。

## 短い TIPS と背景

- Installer 抽出: ファイル操作を `FlashUnified::Installer` に切り出すことで、Rails を読み込まないユニットテストが可能になり、開発のループを高速化できます。
- `test/dummy`: ジェネレータの出力を手動で確認するための最小アプリ置き場です。`rake test` から除外しているため、自動テストはここに置きません。
- Importmap: ジェネレータは `config/importmap.rb` を自動編集しません。自動編集はホストアプリに驚きを与えるため避けています。
