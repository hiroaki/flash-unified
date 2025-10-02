# Developer Guide

This guide helps new contributors get started quickly and safely. It summarizes the current test layout, CI, helper scripts, and frequently used commands. The focus is on clarity and practical steps.

## 1. Current snapshot

### Supported matrix

- Ruby: 3.2, 3.3
- Rails: 7.1.5.2, 7.2.2.2, 8.0.3

### Testing & tooling

| Item | Status / description | References |
|------|-----------------------|------------|
| Unit tests | Present | `test/unit` |
| Generator tests | Present (minimal) | `test/generators/install_generator_test.rb` |
| System tests | Present (JS via cuprite). Includes Turbo Drive/Frame flows and error handling | `test/system/dummies_system_test.rb`, `test/system/dummy_home_test.rb`, `test/application_system_test_case.rb` |
| JS unit tests | Not introduced | Consider jsdom + vitest when JS complexity grows |
| Multi-Rails compatibility | Appraisals in place (Rails 7.1.5.2 / 7.2.2.2 / 8.0.3) | `Appraisals`, `bundle exec appraisal ...` |
| CI (GitHub Actions) | In place | `.github/workflows/ci.yml` (jobs: unit-tests〈Ruby 3.2/3.3〉, generate-appraisals, generator-tests〈Appraisals matrix〉, system-tests〈Appraisals matrix〉) |
| Sandbox | Generate local apps for quick checks (Importmap/Propshaft/Sprockets) | `bin/sandbox` (templates: `sandbox/templates/*.rb`) |
| Helper script | Run unit/generator/system across Appraisals. Suite-first CLI; defaults: `suite=all`, `appraisal=all` | `bin/test` |

## 2. Repository layout

| Item | Role / notes | Main location |
|------|--------------|---------------|
| Engine core | Rails engine initialization and copy logic | `lib/flash_unified/` (e.g., `engine.rb`, `installer.rb`) |
| Views / JS / locales (distributables) | Partials, client JS, locale files copied to host apps | `app/views/flash_unified/*`<br>`app/javascript/flash_unified/flash_unified.js`<br>`config/locales/http_status_messages.*.yml` |
| View helper | Helpers to render engine partials | `app/helpers/flash_unified/view_helper.rb` |
| Tests | Unit / generator / system layers | `test/unit`, `test/generators`, `test/system`, `test/test_helper.rb` |
| Dummy app | Minimal Rails app for test boot/reproducibility | `test/dummy` |
| CI | GitHub Actions workflow | `.github/workflows/ci.yml` |
| Appraisals | Rails version matrix definition | `Appraisals` |
| Sandbox templates | Local app scaffolding | `bin/sandbox`, `sandbox/templates/*.rb` |

## 3. First-time setup

1) Install dependencies

```bash
bundle install
bundle exec appraisal install
```

2) Run tests

```bash
bin/test
```

Notes:
- Tests requiring specific Rails variants run via Appraisals. `bin/test` is a convenience wrapper to execute unit / generator / system tests across defined Appraisals.

## 4. How to run tests (by purpose)

Run suites separately for clarity and speed.

Signature: `bin/test [suite] [appraisal]`

```
# All suites across all Appraisals (default)
bin/test

# Specific suite across all Appraisals
bin/test unit
bin/test generators
bin/test system

# All suites on a specific Appraisal
bin/test all rails-7.2

# Specific suite on a specific Appraisal
bin/test unit rails-7.2
bin/test generators rails-7.2
bin/test system rails-7.2

# Unit only using current Gemfile
bundle exec rake test:unit

# Appraisal-scoped Rake invocations
bundle exec appraisal rails-7.2 rake test:unit
bundle exec appraisal rails-7.2 rake test:generators
bundle exec appraisal rails-7.2 rake test:system

# Reference: single-file run (pure Ruby)
bundle exec rake test TEST=test/unit/flash_unified_test.rb

# Reference: single-file run
bundle exec rake test TEST=test/unit/view_helper_test.rb
bundle exec appraisal rails-7.2 rake test TEST=test/system/target_test.rb
```

For system tests that require JavaScript, the Capybara driver uses cuprite, so a Chrome browser must be available in your environment.

With cuprite, if you set the environment variable `HEADLESS=0`, tests will run in non-headless mode. You can also set `SLOWMO` to a number of seconds to add a delay between steps. Combining these allows you to observe browser actions visually:

```
HEADLESS=0 SLOWMO=0.3 bin/test system rails-7.2
```

## 5. Dummy app vs Sandbox

- Dummy app (`test/dummy`)
  - Purpose: reproducibility for automated tests.
  - Used by CI as the execution baseline.

- Sandbox (`bin/sandbox`)
  - Purpose: quick, disposable local experiments (Importmap/Propshaft/Sprockets).
  - Examples:
    ```
    bin/sandbox importmap
    bin/sandbox propshaft --scaffold
    bin/sandbox sprockets --path ../..
    ```
  - Follow the script output to `bin/rails server` and verify in a browser.

## A. Outlook

- Enrich generator tests (assert duplicate-prevention and content details).
- Introduce a minimal JS unit-test layer when it adds clear value (e.g., jsdom + vitest).
- Add representative system scenarios (Turbo Frame/Stream basics) as the next step.
