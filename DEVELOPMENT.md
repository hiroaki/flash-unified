# Developer Guide

This document summarizes the current state of test structure, CI, and helper scripts for this project.

## 1. Current Summary

### Supported Versions

The Ruby and Rails versions currently tested are:
- Ruby: 3.2, 3.3
- Rails: 7.1.5.2, 7.2.2.2, 8.0.3

### Testing & Tooling

Tests are organized by purpose in separate directories:

| Test Category      | Path              |
|--------------------|-------------------|
| Unit tests         | `test/unit`       |
| Generator tests    | `test/generators` |
| System tests       | `test/system`     |

* JS unit tests are not yet introduced (consider jsdom + vitest in the future). For now, please check JS behavior via system tests.
* Appraisals are used to switch Rails versions during testing.
* CI is provided via GitHub Actions.
* A sandbox tool is available to generate quick disposable test apps (Importmap/Propshaft/Sprockets).
* Helper script `bin/test`: runs unit/generator/system tests across Appraisals.

Details for each item are explained in later sections.

## 2. File Structure

| Item            | Role/Description                          | Location                             |
|-----------------|-------------------------------------------|--------------------------------------|
| Engine core     | Rails engine core                         | `lib/flash_unified/`                 |
| Views           | Templates distributed to host apps        | `app/views/flash_unified/`           |
| JavaScript      | JS source distributed to host apps        | `app/javascript/flash_unified/`      |
| Locales         | I18n translation files for host apps      | `config/locales/`                    |
| View helper     | Helpers for layouts/views                 | `app/helpers/flash_unified/`         |
| Tests           | Unit/generator/system layers              | `test/{unit,generators,system}`      |
| Dummy app       | Minimal Rails app for reproducible tests  | `test/dummy`                         |
| CI              | GitHub Actions workflow                   | `.github/workflows/`                 |
| Appraisals      | Rails version matrix definition           | `Appraisals`                         |
| Sandbox         | Scripts/templates for quick test apps     | `bin/sandbox`, `sandbox/templates/`  |

## 3. Development Setup

1) Install dependencies

```bash
bundle install
bundle exec appraisal install
```

2) Run tests

```bash
bin/test
```

Note:
- Tests requiring Rails run via Appraisals. `bin/test` is a wrapper to run unit/generator/system tests across all Rails versions.

## 4. How to Run Tests

You can run tests by purpose.

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

# Unit tests only (using current Gemfile)
bundle exec rake test:unit

# Run Rake directly with Appraisal
bundle exec appraisal rails-7.2 rake test:unit
bundle exec appraisal rails-7.2 rake test:generators
bundle exec appraisal rails-7.2 rake test:system

# Reference: run a single file (no Rails required)
bundle exec rake test TEST=test/unit/target_test.rb

# Reference: run a single file (requires Rails)
bundle exec appraisal rails-7.2 rake test TEST=test/system/target_test.rb
```

The Capybara driver for system tests uses cuprite, so a Chrome browser is required in your environment.

A custom cuprite configuration is applied in the test setup. With cuprite, set `HEADLESS=0` to disable headless mode, and set `SLOWMO` to add a delay between steps. This lets you observe browser actions:

```
HEADLESS=0 SLOWMO=0.3 bin/test system rails-7.2
```

## 5. Dummy App and Sandbox

### Dummy App `test/dummy`

A committed Rails app ensures reproducibility for automated tests. CI also runs against this app.

### Sandbox Command `bin/sandbox`

For local testing, you can quickly generate Rails apps with Importmap, Propshaft, or Sprockets.

Add the `--scaffold` option to create Memo resources (controller, model, views).

Examples:
```
bin/sandbox importmap
bin/sandbox propshaft --scaffold
bin/sandbox sprockets --scaffold --path ../..
```

Follow the instructions after generation to start the server with `bin/rails server`.

## A. Contributing

Bugs, feature requests, and pull requests are welcome. Please:

- For questions, use [Discussions](https://github.com/hiroaki/flash-unified/discussions) instead of Issues.
- When changing code, always add or update tests and make sure all tests pass with `bin/test`.
- Submit pull requests against the latest `develop` branch, and describe your changes, purpose, and how you verified them in the PR description.

Thank you for your cooperation!
