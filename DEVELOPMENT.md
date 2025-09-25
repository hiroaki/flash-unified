# Developer Guide

## 0. Introduction (current state and next steps)

This document explains the current state, issues, and intended practices for development and maintenance of this library, focusing on tests and developer tooling. It aims to provide a practical playbook for contributors so they can start with a fast loop and progressively increase quality.

Current status:
* Unit tests: Basic tests for `FlashUnified::Installer` exist.
* Generator tests: Minimal test files exist, but they require expansion to cover duplicate-insertion checks and more detailed output assertions.
* System tests (browser-based integration): Not yet introduced.
* JavaScript unit tests: Not yet introduced.
* CI (continuous integration): No complete workflow has been set up for all layers yet, but the repository contains unit and generator jobs in `.github/workflows/ci.yml`.
* Multi-Rails-version compatibility checks: No automated system (Appraisal) in place yet; CI currently uses a temporary Gemfile approach.

Supported environment (current):
* Supported Ruby: 3.2, 3.3
* Supported Rails: 7.1.5.2, 7.2.2.2, 8.0.3

Problems / pain points:
* No automated detection when changes affect UI / DOM behavior.
* No automated detection for breaking changes in generated assets (templates or partials).
* No regression tests for flash message lifecycle behavior across Turbo navigation.

Priority roadmap (high to low):
1. Expand existing unit tests (helpers, engine setup, overwrite branching behavior).
2. Add and expand generator tests (file generation, duplicate insertion prevention).
3. Add a minimal set of system tests (three representative scenarios).
4. Evaluate and add lightweight JS unit tests if needed (jsdom / vitest, etc.).
5. Establish CI workflows in phases (unit → generators → system).
6. Add Rails compatibility checks (Appraisal) and clarify the policy.

## Long-term roadmap (draft; priorities may change)

This section lists candidate improvements for the mid-term and long-term and provides an explicit place for discussion and re-evaluation.

Priority criteria:
- High: Changes that currently require frequent manual verification.
- Medium: Changes with wide impact but low occurrence frequency.
- Low: Improvements that increase quality but are not blocking current development.

Notation used in this document:
* [current]: already implemented / in use
* [planned]: not yet implemented, but the approach is decided
* [consider]: items with conditions to decide adoption

Definitions (for first-time readers):
* dummy app: A minimal Rails app committed under `test/dummy` to improve test reproducibility (used mainly for system tests).
* sandbox: A temporary Rails app created by scripts like `bin/sandbox` for quick manual experimentation; not committed.
* system test: Browser-driven tests (Capybara, headless browsers) that verify Rails ↔ Turbo ↔ DOM ↔ this library integration.
* generator test: Tests verifying `rails generate flash_unified:install` produces the correct files and inserts the needed code.
* JS unit test: Tests for `flash_unified.js` logic using DOM emulation (jsdom) without launching a full browser.

---
## Quick summary

This guide helps new contributors get into a "fast loop" while improving quality incrementally. It explains the test pyramid, the difference between dummy and sandbox apps, CI strategy, and planned extensions.

---
## Test pyramid (responsibilities)

Explains which test types to use for which purposes and the expected relative cost and failure signal.

| Rank | Layer | Purpose | Cost (relative) | What a failure suggests | Directory / status |
|------|-------|---------|-----------------|-------------------------|--------------------|
| 1 | Unit (Ruby) | Pure Ruby logic (copy operations, etc.) | Minimal | Implementation bug | `test/unit/` [current] |
| 2 | Generator | File generation, insertion, duplicate prevention | Medium | Broken generated assets | `test/generators/` [planned] |
| 3 | System | Rails + Turbo + JS integration (minimal cases) | Heavy | Integration scenario breakage | `test/system/` [planned] |
| 4 | JS unit | `flash_unified.js` logic / DOM operations (when complex) | Medium | Selector changes / side effects | `test/js/` (separate runner) [consider] |
| 5 | View / helper | Minimal HTML output snapshots for partials | Medium | Markup regressions | `test/view/` [consider] |

Guideline: prioritize tests for layers that are hard to detect when they break and are frequently changed.

---
## Recommended daily workflow (current + planned)

1. Determine what the change affects (copy logic, template structure, JS selectors).
2. Add tests as low in the stack as possible (if a selector change is due to a DOM node shortage, reproduce it in a unit-level test first).
3. Always run `bundle exec rake test` before committing (fast layer(s) should be green).
4. [Planned] CI will run generator tests on PRs to detect generated-asset regressions.
5. [Planned] System tests will be opt-in / low-frequency and investigated if flakes occur.
6. If a bug is reproducible only in system tests repeatedly, add lower-level tests (unit or JS unit) to capture it earlier.

---
## Unit tests (current + planned)

Scope and target for the high-speed unit tests.

Targets:
* `FlashUnified::Installer` [current]
* `FlashUnified::Engine` basic setup (autoload / helper registration) [planned]
* Helper methods (e.g. `flash_global_storage`) using small test doubles to minimize Rails reliance [planned]

Optional targets:
* SimpleCov to ensure critical paths (copy, overwrite branching) are well-covered (goal: >90%).

---
## Generator tests (planned — ready to start)

Generator tests verify that `rails generate flash_unified:install` creates the expected files and inserts the necessary snippets into existing files without duplication.

Prerequisite: none (Rails::Generators::TestCase is standard)

What to test:
* Missing file → generated
* Existing file + force=false → do not overwrite
* Existing file + force=true → overwrite (future option)
* Layout insertion / duplication prevention (example: `flash_global_storage` should be inserted only once)

Example tests are included in the doc.

---
## dummy app vs sandbox (concept)

Explains the role differences: dummy is a small committed test app for reproducible automated tests, sandbox is disposable for manual experimentation.

Operational guidance:
* Commit `test/dummy` as a reproducible test asset.
* Keep sandbox disposable and convert findings into reproducible tests in the library.

---
## System tests (phased introduction) [planned]

The three minimal system tests to add first:
1. Notice flash is rendered after redirect via templates
2. Turbo Frame partial update merges new `flash_storage`
3. On fetch error (e.g., 500) a general error list is rendered when no existing flash is displayed

Tips:
* Driver: start with `selenium_chrome_headless`. If speed is a priority, switch to Cuprite later.
* Capybara wait: keep `Capybara.default_max_wait_time = 2` and use `assert_selector` for synchronization.
* Capture screenshots and console logs on failure (Cuprite/Ferrum are convenient).

---
## JavaScript unit tests (consider)

When to add JS unit tests and options (vitest + jsdom vs no JS layer).

Criteria to add:
* Complexity in DOM operations
* Majority of bug reports coming from JS side
* System tests failing with unclear reasons and raising debug costs

---
## Recommended directory structure

```
test/
  unit/
  generators/
  system/
  support/
javascript_test/
```

---
## Rake tasks (example)

Planned Rake tasks to make test layers explicit locally and in CI.

---
## Multiple Rails compatibility (Appraisal idea) [consider → planned]

Goal: detect behavioral differences across Rails versions (7.0 / 7.1 / 7.2 in future).

Steps:
1. Add `gem 'appraisal'` to development
2. Define Appraisals for each Rails version
3. Run matrix in CI (unit + generator; system only on latest)

Note: Current CI (`.github/workflows/ci.yml`) creates a temporary `Gemfile.ci` and appends a Rails line per matrix entry; if Appraisal is introduced, decide whether to align with or replace that approach.

---
## CI strategy (recommended / phased)

Jobs: lint+unit, generators, system (optional), appraisal

GitHub Actions example included in the Japanese doc; the repo's `.github/workflows/ci.yml` already runs unit and generator tests using a temporary Gemfile approach for Rails version testing.

CI system prerequisites:
* When running system tests on CI, you may need OS packages (xvfb, libnss3, fonts) or choose headless drivers that avoid X dependencies.
* Ensure `test/dummy`'s Gemfile contains required gems for system tests (capybara/selenium-webdriver or Cuprite/Ferrum).

Example GitHub Actions snippet (illustrative):

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
      - run: bundle exec rake test TEST=test/generators

  system:
    if: contains(github.event.pull_request.labels.*.name, 'test-system')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
      - run: |
        sudo apt-get update
        # Example OS packages which may be useful for running headful browsers in CI.
        # This is optional and shown for illustration; if you prefer headless drivers (Cuprite/Ferrum)
        # you may not need these packages. The example tolerates failure:
        sudo apt-get install -y xvfb libnss3 fonts-liberation || true
      - run: xvfb-run -a bundle exec rake test:system
```

---
## Debug & troubleshooting (reference)

Typical failures, their likely causes, and mitigations.

---
## Design policies (short)

* Keep server-side helpers minimal and focused on structure provision.
* Centralize DOM selector constants used by JS to make changes easier to detect.
* New flash types follow `flash-message-template-<type>` naming convention — add a naming rule test.

---
## Roadmap (short)

Short summary of priorities and next activities.

---
## Setup (current steps)

```bash
bundle install
bundle exec rake test TEST=test/unit/installer_test.rb
bundle exec rake test
```

---

If everything looks correct, I'll mark the English translation todo completed. If you want any wording changes in the Japanese original before further edits, tell me what to adjust.
