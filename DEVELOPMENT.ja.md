# 開発者向けドキュメント

## 0. はじめに（現状とこれから）

この文書は、開発・保守に関わるメンバー向けに、テストや開発補助体制の現状・課題・今後の方針を整理し、標準的な運用指針を示すことを目的としています。現時点では、以下のようにテストと開発補助体制はまだ完全ではありません。

現状:
* ユニットテスト: `FlashUnified::Installer` に対する基本的なテストのみが存在します。
* ジェネレータテスト: 最低限のテストファイルは存在しますが、重複挿入の検証や出力内容の詳細検証など拡充が必要です。
* システムテスト（ブラウザを利用した統合テスト）: 未導入です。
* JavaScript 単体テスト: 未導入です。
* CI（継続的インテグレーション）: ワークフロー未作成です。
* 複数 Rails バージョン互換性検証: 仕組み未導入です。

サポート環境（現時点）:
* サポートする Ruby: 3.2, 3.3
* サポートする Rails: 7.1.5.2, 7.2.2.2, 8.0.3

課題感:
* 変更が UI / DOM 挙動に影響した場合の自動検出手段がない。
* 生成物（テンプレート / 部品部分テンプレート）の破壊（意図しない変更）を検出できない。
* フラッシュメッセージのライフサイクル（Turbo ナビゲーションをまたぐ挙動）の回帰テストができない。

今後の方針（優先度順）:
1. 既存ユニットテストの拡充（ヘルパー、エンジン設定、上書き挙動分岐）。
2. ジェネレータテストの追加（生成ファイル・重複挿入防止）。
3. 最小セットのシステムテスト（代表 3 シナリオ）導入。
4. 必要性を見極めた上で JavaScript の軽量ユニットテスト導入（jsdom / vitest 等）。
5. CI ワークフロー整備（段階的: unit → generators → system）。
6. Rails バージョン互換確認（Appraisal）を追加し、互換性方針を明確化。

## 将来拡張ロードマップ（案 / 優先度は状況で再評価）

このセクションは現時点で想定している中長期的な改善候補を優先度付きで列挙し、議論や見直しの起点にします。定期的に "未着手だが価値が下がった項目" を棚卸ししてください。

優先度判定基準:
- 高: 現在の開発フローで頻繁に手動確認が必要な項目
- 中: バグ発生時の影響範囲が広いが、発生頻度は低い項目
- 低: 品質向上に寄与するが、現在の開発に支障がない項目

この文書では「現在すでに存在するもの」と「まだ存在せず、将来導入予定のもの」を明確に区別するため、以下の表記を用います。

凡例:
* [現状] すでに実装・運用されている事項
* [予定] まだ未実装だが導入方針が決まっている事項
* [検討] 導入を判断するための条件を記した事項（採否未確定）

用語定義（初めて読む方向け）:
* dummy アプリ: `test/dummy` 配下に置く、テスト再現性を高めるためにリポジトリに含める最小の Rails アプリ。自動テスト（特にシステムテスト）で利用する想定です。
* sandbox 環境: `bin/sandbox` スクリプトなどで一時的に生成する手動検証用 Rails アプリ。生成結果はコミットしない前提で「振る舞いを素早く触って確認」する用途に限定します。
* システムテスト (System Test): Capybara などを用いてブラウザ（またはヘッドレスブラウザ）と JavaScript を実行し、Rails ↔ Turbo ↔ DOM ↔ 本ライブラリの統合作用を検証するテスト層です。
* ジェネレータテスト: `rails generate flash_unified:install` などが生成するファイル・挿入するコード片を検証するテスト。
* JavaScript 単体テスト: ブラウザ全体を立ち上げず、DOM エミュレーション (jsdom) などで `flash_unified.js` の関数単位の振る舞いを検証するテスト。

以下の残りセクションでは、これらの方針を詳細に説明します。

---
## 総覧（読み始める前の要約）

このドキュメントは新規参加者向けに「最小で速い開発ループ」を確保しつつ、品質を段階的に高めるための標準的な手順と判断基準（テストピラミッド / dummy と sandbox の使い分け / CI 戦略 / 将来拡張）を整理したものです。既に存在するものと今後強化するものを区別して記載しています。

---
## テストピラミッド（目的と責務）

このセクションでは、どの種類のテストをどの目的で配置し、どの段階で導入・拡張していくかを俯瞰します。テストレイヤは「壊れた場合の発見容易性」と「実行コスト」のバランスで順序付けされます。表の「状態」列は現状・将来計画を示します。

| 順位 | レイヤ | 説明 | 実行コスト（相対） | 失敗時に示唆する問題 | ディレクトリ / 状態 |
|------|--------|------|------------------|--------------------------|--------------------|
| 1 | ユニット (Ruby) | 純粋な Ruby ロジック（コピー処理等） | 最小 | 実装ロジックの欠陥 | `test/unit/` [現状] |
| 2 | ジェネレータ | ファイル生成・挿入・重複抑制 | 中 | 生成物の破壊 / 重複 | `test/generators/` [予定] |
| 3 | システム (System Test) | Rails + Turbo + JS の統合（最小ケース限定） | 重 | 統合シナリオ破綻 | `test/system/` [予定] |
| 4 | JavaScript ユニット | `flash_unified.js` の関数/DOM操作（複雑化を待つ） | 中 | セレクタ変更 / 副作用 | `test/js/`（別ランナー）[検討] |
| 5 | ビュー / ヘルパ（軽量） | 部品 HTML 出力の最小スナップショット（必要性が高まった時） | 中 | マークアップ改変漏れ | `test/view/`（設置検討）[検討] |

導入順の考え方: まず "壊れても検知しづらいが頻繁に触る層" を優先します。上記の順位は推奨導入順序を表し、状況に応じて調整可能です。



導入順の考え方: まず “壊れても検知しづらいが頻繁に触る層” を優先します。従って 1 → 2 → 5（最小ケース限定） → 4（複雑化を待つ） → 3（必要性が高まった時） という順番を基本とし、状況に応じて入れ替えます。

---
## 推奨デイリーワークフロー（現状 + 予定）

1. 変更内容を判別します（例: ファイルコピー処理の分岐追加 / テンプレート構造変更 / JavaScript セレクタ変更 等）。
2. 可能な限り「一番下の層」にテストを追加します（例: セレクタ変更理由が DOM ノード不足ならまずユニットで再現）。
3. コミット前に `bundle exec rake test` を実行し、速い層（現状はユニットのみ）を必ず緑にします。
4. （[予定]）PR 作成時 CI がジェネレータテストを実行し、生成物の破壊を検出します。
5. （[予定]）システムテストは頻度を絞ったジョブまたは opt-in チェックとして運用し、フレーク（テストが環境差などで揺らぐ現象）が出たら原因（待機不足 / Turbo イベント競合）を特定します。
6. 重大なバグがシステムテストでのみ再現する状況が一定回数続いたら、そのバグ原因に近い層へ（ユニット / JS ユニット）テストを “押し下げ” ます。

---
## ユニットテスト (現状 + 拡張予定)

ここでは最も高速に回る基礎テスト（ユニットテスト）の対象範囲と、今後どこまで深めるかの指針を示します。目的は「失敗したら即座にロジックのどこが壊れたか」を明確にすることです。外部環境（Rails の初期化、ブラウザ等）に依存しないことを重視します。

対象:
* `FlashUnified::Installer`（[現状] 既にテストあり）
* `FlashUnified::Engine` の基本設定（autoload / helper 登録を簡易に検証）[予定]
* 各ヘルパーメソッド（`flash_global_storage` など）: Rails 依存を極小化したテストダブルで HTML 断片を検証 [予定]

追加指標（任意）:
* SimpleCov: 重要パス（コピーと上書き分岐）が 90% 以上
* 並列化: `Minitest.parallel_executor = ...` ではなく Rails 無しなので default parallel に任せても可（テスト数増えたら検討）

---
## ジェネレータテスト（予定 - 着手可能）

このセクションは Rails ジェネレータ（`rails generate flash_unified:install`）が正しいファイル群と内容を生成し、既存コードへ重複なく必要な挿入を行うかを機械的に検証する方法について述べます。導入の目的は「手動確認の省力化」と「変更差分の安全な検出」です。

前提条件: なし（Rails::Generators::TestCaseは標準機能）
着手手順: `test/generators/install_generator_test.rb` を作成し、`Rails::Generators::TestCase`を使用

`Rails::Generators::TestCase` を使用。主に次を検証:
* 既存ファイル未存在 → 生成される（例：`assert_file "app/javascript/flash_unified.js"`）
* 既存ファイル + force=false → 上書きしない（例：`assert_no_file_difference "app/views/layouts/application.html.erb"`）
* 既存ファイル + force=true（将来オプション化するなら）→ 上書き
* layout 追記・重複防止（例：`assert_file "app/views/layouts/application.html.erb"` で `flash_global_storage` が1回のみ挿入されることを検証）

テストコード例：
```ruby
def test_generator_creates_javascript_file
  run_generator
  assert_file "app/javascript/flash_unified.js"
end

def test_generator_prevents_duplicate_layout_insertion
  # 既存layoutにヘルパーが含まれる場合
  create_file "app/views/layouts/application.html.erb", "<%= flash_global_storage %>"
  run_generator
  assert_file "app/views/layouts/application.html.erb" do |content|
    assert_equal 1, content.scan(/flash_global_storage/).count
  end
end
```

改善アイデア（段階的導入）:
1. 基礎: `assert_file` / `refute_includes` による存在 + 重複防止
2. 中間: 正規表現で layout への挿入順序を検証
3. 発展（[検討]）: snapshot（期待出力ファイル丸ごと比較）。変更頻度が低くなってから導入し、ノイズを減らします。

---
## dummy アプリ vs sandbox の使い分け（概念整理）

このセクションでは、リポジトリに含める固定的な検証用 Rails アプリ（dummy）と、一時的に生成して捨てられる実験用アプリ（sandbox）の役割分担を明確化します。目的は「再現性の担保」と「探索的検証スピード」の両立です。

| 項目 | dummy (`test/dummy`) | sandbox (`bin/sandbox` 生成) |
|------|----------------------|------------------------------|
| 目的 | テスト専用・最小固定 | 人間の実験 / 手動検証 / PoC |
| コミット | する | 原則しない（再生成） |
| システムテスト配置 | ◎（推奨） | △（一時的） |
| Rails バージョン切替 | Appraisal + dummy | それぞれ再生成 |
| 再現性 | 高い | 低い（手元依存） |

運用指針:
* dummy アプリは “自動テストの再現性のための資産” としてコミットします。
* sandbox は “捨ててよい作業スペース” として再生成可能に保ちます。
* sandbox 内で発見した問題は **必ず** ライブラリ本体へフィードバック（PR）し、再現用の自動テスト（できればユニット or ジェネレータ）を追加します。

---
## システムテスト (段階導入計画) [予定]

このセクションはブラウザ制御（Capybara 等）を通じて Rails・Turbo・JavaScript の統合作用を最小コストで検証する導入ステップを示します。目的は「代表的ユーザ経路での回帰防止」です。ここで挙げる 3 ケースは “最低限の守るべきライフサイクル” をカバーします。

最初に入れるケース（最小 3 本想定 / これ以上は “回帰が実際に起きてから” 拡張）:
1. notice フラッシュがリダイレクト後にテンプレート経由で描画される
2. Turbo Frame 内の部分更新で新しい flash_storage がマージされる
3. fetch エラー（例: 500）の場合に一般エラーリストがレンダリングされる（既存メッセージ未表示時）

実装 Tips:
* Driver: まずは `selenium_chrome_headless`。速度重視なら後で `cuprite` へ切替可。
* 安定化: `Capybara.default_max_wait_time = 2` 程度に抑え、DOM 反映は `assert_selector('[data-flash-message-container] .flash-message-text', text: 'ok')`
* JS ログ収集: 失敗時スクリーンショット + コンソールログ（Cuprite/Ferrum なら簡単）

テストコード例：
```ruby
# test/system/flash_display_test.rb
class FlashDisplayTest < ApplicationSystemTestCase
  test "notice flash appears after redirect" do
    visit root_path
    click_link "Create Memo"
    fill_in "Title", with: "Test Memo"
    click_button "Create"

    # リダイレクト後にフラッシュメッセージが表示されることを確認
    assert_selector('[data-flash-message-container] .flash-message-text',
                   text: 'Memo was successfully created')
  end

  test "turbo frame updates merge flash storage" do
    visit memos_path

    # Turbo Frame内でフォーム送信
    within "#memo_form_frame" do
      fill_in "Title", with: "Frame Test"
      click_button "Create"
    end

    # 新しいメッセージが追加されることを確認
    assert_selector('[data-flash-message-container] .flash-message-text',
                   text: 'Created via frame')
  end
end
```

---
## JavaScript 単体テスト（検討）

このセクションはブラウザを立ち上げずに JavaScript の純粋なロジック / DOM 操作を検証する層を導入するかどうかの判断材料を整理します。目的は「システムテストでは特定しづらい破壊（セレクタ変更、要素欠落、イベント順序）を早期に検出」することです。

ブラウザ統合テストだけだと失敗原因が特定しづらいので、`app/javascript/flash_unified/flash_unified.js` を jsdom で直接テストするレイヤを追加可能。

選択肢:
* 低コスト: `vitest` + jsdom（Rails 非依存）
* 既存構成最小変更: Ruby だけで行く（当面は未導入）

導入判断の基準:
* DOM 操作が複雑化（テンプレ動的差し替え / メッセージキュー制御 / アニメーション等）
* バグ報告の 50% 以上が JavaScript 側に寄る
* システムテストが “失敗理由不明” でデバッグコストを押し上げる状態が継続

---
## 推奨ディレクトリ構成（段階 / 現状 + 予定）

このセクションはテスト種別の追加に伴い、どのようにディレクトリを段階的に拡張するかの標準案を示します。目的は階層ごとの責務を明確化し、不要な依存（例: system が unit の helper に依存するなど）を避けることです。

```
test/
  unit/              # 速い Ruby ロジック
  generators/        # Rails::Generators::TestCase
  system/            # Capybara (dummy 配下で動作)
  support/           # 共通ヘルパ (Capybara設定, assertions)
javascript_test/     # (将来) vitest など
```

---
## Rake タスク（例：将来追加予定）

このセクションでは将来、分類されたテストスイートを個別または組み合わせて実行するために Rake タスクをどのように整理するかの案を提示します。目的はローカルと CI 双方で明確な “どの層を今走らせているか” の可視性を高めることです。

`Rakefile` に以下のような分類を追加すると CI / ローカルが明確化:

```ruby
namespace :test do
  desc 'Fast tests (unit only)'
  task :fast do
    sh 'bundle exec rake test' # 既存: unit のみ
  end

  desc 'Generators'
  task :generators do
    sh 'bundle exec rake test TEST=test/generators'
  end

  desc 'System (dummy app)'
  task :system do
    sh 'bundle exec rails test:system'
  end
end
```

---
## 複数 Rails バージョン互換性 (Appraisal 導入案) [検討→予定]

このセクションは異なる Rails バージョン間での互換性を自動検証する仕組み（Appraisal gem 利用）を導入する目的と手順を説明します。目的はホストアプリ多様化に伴う予期せぬ非互換の早期検出です。

目的: Rails 7.0 / 7.1 / 7.2 (将来) での挙動差異を検出。

1. `gem 'appraisal'` を development に追加
2. `Appraisals` に各 Rails を定義
3. CI で matrix 実行（ユニット + ジェネレータ。システムは最新のみ）

注: 現状の CI (`.github/workflows/ci.yml`) では、テスト用に一時的な `Gemfile.ci` を作成して指定の Rails バージョンを追加する方式を利用しています。Appraisal を導入する場合はこの方針と整合させるか置き換える形で検討してください。

Appraisals 例:
```ruby
appraise 'rails-7.0' do
  gem 'rails', '~> 7.0.0'
end

appraise 'rails-7.1' do
  gem 'rails', '~> 7.1.0'
end
```

---
## CI 戦略（推奨構成 / 段階導入）

このセクションでは継続的インテグレーション（Continuous Integration: CI）のジョブ分割戦略と段階導入順を説明します。目的は “変更の性質に応じて最小限のコストで十分な検証” を実現することです。

| ジョブ | 目的 | 内容 | 頻度 |
|--------|------|------|------|
| lint+unit | 最速フィードバック | Ruby 3.x matrix + `rake test` | PR 毎 |
| generators | 生成物確認 | Rails 最新 + `test/generators` | PR 毎 |
| system | 統合安定性 | dummy + headless | ラベル or nightly |
| appraisal | 互換性 | Rails 7.x matrix (unit+generators) | PR 選択的 |

オプション: system を optional チェックにして失敗でもマージ可（不安定期の運用）

GitHub Actions設定例：
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  lint-and-unit:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        ruby: ['3.2', '3.3']
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ matrix.ruby }}
          bundler-cache: true
      - run: bundle exec rake test

  generators:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
      - run: bundle exec rake test TEST=test/generators

  system:
    if: contains(github.event.pull_request.labels.*.name, 'test-system')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
      - run: |
        sudo apt-get update
        # system テストを CI 上で安定して動かすために必要なパッケージの一例（必要になったら有効化）
        # この例はオプションです。headless オプションや Cuprite/Ferrum 等で代替できる場合は不要です。
        sudo apt-get install -y xvfb libnss3 fonts-liberation || true
        - run: xvfb-run -a bundle exec rake test:system
```

CI / system テストの前提（補足）:
* GitHub Actions 等で system テストを動かす場合、上記のような OS パッケージ（xvfb やブラウザ依存ライブラリ）が必要になることがあります。
* また `test/dummy` の `Gemfile` に `capybara` / `selenium-webdriver`（または Cuprite/Ferrum を使う場合はそれら）を追加しておいてください。

---
## デバッグ & トラブルシュート（参考）

このセクションは典型的な失敗症状と、その原因・対処の一覧を提供し、問題発生時の初動時間を短縮することを狙います。新しい事象が増えたら表を拡充してください。

| 症状 | 典型原因 | 対処 |
|------|----------|------|
| System test フレーク | Turbo イベント競合 | `assert_selector` で同期; 不要な `sleep` を除去 |
| メッセージ未表示 | テンプレ ID 変更 | HTML 部分差分を `save_and_open_page` で確認 |
| 二重表示 | 重複ストレージ要素 | JS: storage クリアロジックのユニットテスト追加 |
| fetch エラー未レンダ | 既存 flash が残存 | 仕様: 既存表示があると一般エラー挿入しない |

---
## 設計面ポリシー（簡易 / 変更方針）

このセクションでは今後の変更レビュー時に判断基準となる “設計上の原則” を列挙します。目的はレビューの一貫性と不要な複雑化の抑制です。

* サーバー側 helper は極力ロジックを持たず「構造提供」に限定
* JS は DOM 取得セレクタ（ID / data-attr）を中央集約（変更検出を容易に）
* 追加 flash type はテンプレ命名規約 (`flash-message-template-<type>`) に依存 → 命名規則テストを 1 本追加予定

---
## 将来拡張ロードマップ（案 / 優先度は状況で再評価）

このセクションは現時点で想定している中長期的な改善候補を優先度付きで列挙し、議論や見直しの起点にします。定期的に “未着手だが価値が下がった項目” を棚卸ししてください。

| 優先 | 項目 | 目的 |
|------|------|------|
| 高 | システムテスト最小 3 ケース | 回帰バグ主要経路の自動化 |
| 中 | JS ユニット層 | DOM 差分の早期検知 |
| 中 | Appraisal 導入 | 互換性確保 |
| 低 | アクセシビリティ smoke | SR 互換確認 (role / aria-live) |
| 低 | Visual regression (Percy 等) | Flash 見た目崩れ検知 |

---
## セットアップ（現行手順）

このセクションは初めてリポジトリをクローンした開発者が最小限のコマンドでローカル検証サイクル（ユニットテスト実行）に入るための手順を示します。将来的にテスト層が増えた際はここに追加の “よく使うコマンド” を並べます。

```bash
bundle install
# 単一テスト
bundle exec rake test TEST=test/unit/installer_test.rb
# 高速層一括
bundle exec rake test
```

現在のテスト実行設定:
現在の `bundle exec rake test` は以下を除外しています：
- `test/dummy/**/*_test.rb`
- `sandbox/*/test/**/*_test.rb`
- `test/generators/**/*_test.rb`

システムテスト導入時は、`test/system/`を新規作成し、Rakefileを以下のように更新予定：
```ruby
# 将来のRakefile例
namespace :test do
  task :unit do
    # 現在の除外設定を維持
  end

  task :system do
    sh 'cd test/dummy && bundle exec rails test:system'
  end
end
```

---
## ジェネレータテスト実行例（予定）

このセクションはジェネレータテスト導入後に具体的にどう実行するかを示すコマンド例を提供します。導入前でも手順を明示することで準備タスクの視認性を高めています。

```ruby
# Gemfile (抜粋)
group :development, :test do
  gem 'rails', '~> 7.1'
end
```

```bash
bundle install
bundle exec rake test TEST=test/generators/install_generator_test.rb
```

---
## 最小システムテスト導入手順（概略 / 予定）

このセクションは 3 本の代表的システムテストを作成する際の最小ステップを列挙します。目的は “着手のハードル” を下げ、初回導入を速やかに行えるようにすることです。

1. **前提設定**: `test/dummy/Gemfile` に必要なgem追加
   ```ruby
   # test/dummy/Gemfile
   gem 'capybara'
   gem 'selenium-webdriver'
   ```

2. **テストヘルパー設定**: `test/dummy/test/application_system_test_case.rb` 作成
   ```ruby
   require "test_helper"
   require "capybara/rails"
   require "capybara/minitest"

   class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
     driven_by :selenium, using: :chrome, screen_size: [1400, 1400]
   end
   ```

3. **レイアウト設定確認**: `test/dummy/app/views/layouts/application.html.erb` で必要なヘルパーが呼ばれていることを確認
   ```erb
   <%= flash_global_storage %>
   <%= flash_container %>
   <%= flash_templates %>
   <%= flash_general_error_messages %>
   ```

4. **テストファイル作成**: `test/dummy/test/system/flash_display_test.rb`
   ```ruby
   require "application_system_test_case"

   class FlashDisplayTest < ApplicationSystemTestCase
     test "notice flash appears after redirect" do
       visit root_path
       # アクション実行
       assert_selector('[data-flash-message-container] .flash-message-text', text: '期待メッセージ')
     end
   end
   ```

5. **実行確認**: `cd test/dummy && bundle exec rails test:system`

---
## 補足 TIPS / 背景

このセクションは本文中に組み込むと流れが重くなるが、背景理解や設計判断の根拠として参照価値がある短いメモを集約したものです。

* Installer 抽出: Rails boot 無し高速フィードバック
* dummy: テスト再現性担保 / コミット管理対象
* sandbox: 実験場（コミットしない）
* Importmap 自動編集を避ける設計: ホストアプリの意図しない変更を防止
* HTTP エラー自動表示は「既に flash がある場合は抑制」→ 仕様テストを 1 本追加予定

---
## まとめ（運用簡潔版 / 現状→将来の流れ）

このセクションは全体の優先順位を短く再掲し、初めて参加した開発者が “次にどの活動へ参加すればよいか” を即座に把握できるようにする目的で配置しています。

1. まずユニットを増やす（fast loop 最優先）
2. ジェネレータ差分をテスト化（手動確認の削減）
3. dummy に最小システム 3 ケース
4. 必要性が明確化したら JS ユニット / Appraisal / system 拡張
5. CI は fast → generators → (optional system) のレイヤ分離

---
改善・追記したい点が出たら PR で本ファイルを直接更新してください。
