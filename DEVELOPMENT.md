# Developer Guide

This guide helps new contributors get started quickly and safely. It summarizes the current test layout, CI, helper scripts, and frequently used commands. The focus is on clarity and practical steps.

## 1. Current snapshot

### Supported matrix

- Ruby: 3.2, 3.3
- Rails: 7.1.5.2, 7.2.2.2, 8.0.3

### Testing & tooling

| Item | Status / description | References |
|------|-----------------------|------------|
| Unit tests | Present. Examples: `FlashUnified::Installer` behavior, module smoke test | `test/unit`, `test/unit/flash_unified_test.rb` |
| Generator tests | Present (minimal) | `test/generators/install_generator_test.rb` |
| System tests | Present (minimal). Currently uses rack_test driver; JS execution is out of scope | `test/system/dummy_home_test.rb`, `test/application_system_test_case.rb` |
| JS unit tests | Not introduced | Consider jsdom + vitest when JS complexity grows |
| Multi-Rails compatibility | Appraisals in place (Rails 7.1.5.2 / 7.2.2.2 / 8.0.3) | `Appraisals`, `bundle exec appraisal ...` |
| CI (GitHub Actions) | In place | `.github/workflows/ci.yml` (jobs: unit-tests〈Ruby 3.2/3.3〉, generate-appraisals, generator-tests〈Appraisals matrix〉, system-tests〈Appraisals matrix〉) |
| Sandbox | Generate local apps for quick checks (Importmap/Propshaft/Sprockets) | `bin/sandbox` (templates: `sandbox/templates/*.rb`) |
| Helper script | Run system / generator tests across Appraisals | `bin/run-dummy-tests` |

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

2) Quick smoke run

```bash
bundle exec rake test:unit
bin/run-dummy-tests
```

Notes:
- Tests requiring Rails variants run via Appraisals. `bin/run-dummy-tests` is a convenience wrapper to execute system / generator tests across defined Appraisals.
- Current system tests run with rack_test (no JavaScript). For scenarios requiring JS, we plan to introduce a headless driver like Cuprite.

## 4. How to run tests (by purpose)

Run suites separately for clarity and speed.

```
# Unit only:
bundle exec rake test:unit

# Generators only:
bin/run-dummy-tests all generators

# System only:
bin/run-dummy-tests
bin/run-dummy-tests all

# Reference: Generators on Rails 7.2 only:
bin/run-dummy-tests rails-7.2 generators
bundle exec appraisal rails-7.2 rake test:generators

# Reference: System only on Rails 7.2:
bin/run-dummy-tests rails-7.2
bundle exec appraisal rails-7.2 rake test:system

# Reference: single-file run (no Rails)
bundle exec rake test TEST=test/unit/target_test.rb

# Reference: single-file run (requires Rails)
bundle exec appraisal rails-7.2 rake test TEST=test/system/target_test.rb
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

