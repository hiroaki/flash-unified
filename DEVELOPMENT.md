# Developer Guide

This document summarizes the current state of test structure, CI, and helper scripts for this project.

## 1. Current Summary

### Supported Versions

The Ruby and Rails versions currently tested are:
- Ruby: 3.2, 3.3
- Rails: 7.1.6, 7.2.3, 8.0.4, 8.1.1

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

## 6. JavaScript Bundle & Build Workflow

### Background
- The introduction of `all.bundle.js` lets Importmap users adopt FlashUnified with a single `pin` and `import`.
- The gem ships the pre-built `app/javascript/flash_unified/all.bundle.js` while still exposing individual modules for advanced use and backwards compatibility.

### Structure Overview
- Aggregated entry: `app/javascript/flash_unified/all.entry.js`
	- Imports core, Turbo helpers, and network helpers (including side-effect auto-init).
- Build script: `scripts/build-all-bundle.mjs`
	- Invokes esbuild via Node’s API and resolves bare imports (`flash_unified/...`) to local files with a custom alias plugin.
	- Produces a minified ESM bundle (`all.bundle.js`). The process is idempotent—safe to run any time.
- npm script: `npm run build:bundle`
	- Wrapper around the build script; used locally and in CI.

### Development Workflow
1. Install Node dependencies
	 - Run `npm ci` (or `npm install`) once to set up dev dependencies.
2. Rebuild the bundle whenever JS sources change
	 ```bash
	 npm run build:bundle
	 ```
	 - Successful runs print `[flash-unified] Built app/javascript/flash_unified/all.bundle.js`.
	 - Commit the generated bundle if it changes—CI will flag stale outputs.
3. Run tests
	 - At minimum, run `bin/test unit` and `bin/test system rails-7.2` (extend to other Appraisals as needed).

During development, if you want the bundle to be rebuilt automatically whenever you save files, use watch mode.

- Built-in esbuild watch
  ```bash
  npm run watch:bundle
  ```

Even when using the watcher, make sure to run `npm run build:bundle` and commit `app/javascript/flash_unified/all.bundle.js` before pushing.

### Release & Maintenance Notes
- Before publishing the gem, run `npm run build:bundle` and commit the refreshed `all.bundle.js`.
- If you bump esbuild or Node.js versions, re-run the build and full test suite to confirm compatibility.
- README, generators, and Quickstart instructions assume `flash_unified/all.bundle.js`. Update the docs if the bundle contract changes.
- If you experiment with variants (e.g., removing network helpers), adjust `all.entry.js` and the alias plugin accordingly.

### CI Integration
- `.github/workflows/build-js.yml` runs `npm run build:bundle` and verifies that `app/javascript/flash_unified/all.bundle.js` has no unstaged diff.
- When differences exist, the workflow fails and instructs you to rebuild locally and commit.
- CI currently tests Rails 8.0 on Ruby 3.3; you can mirror this locally using `APPRAISAL=rails-8.0 bin/test ...`.

## A. Contributing

Bugs, feature requests, and pull requests are welcome. Please:

- For questions, use [Discussions](https://github.com/hiroaki/flash-unified/discussions) instead of Issues.
- When changing code, always add or update tests and make sure all tests pass with `bin/test`.
- Submit pull requests against the latest `develop` branch, and describe your changes, purpose, and how you verified them in the PR description.

Thank you for your cooperation!
