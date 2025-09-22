## Development guide

This document is written for developers who are new to this project. It explains how to set up the development environment, the test strategy (unit / generator / E2E), how to use a sandbox for verification, and a recommended day-to-day workflow. Brief background and operational tips are included near the end.

## Summary

- Unit tests: cover library logic and `FlashUnified::Installer` (no Rails required).
- Generator verification: test file generation in `test/generators/` or by manual sandbox checks (Rails required).
- E2E (integration): to automatically verify that the gem shows flashes when installed into an app, create a sandbox app and run Capybara/system tests there.

## Quick setup

1. Install dependencies:

```bash
bundle install
```

2. Run unit tests (fast, Rails not required):

```bash
bundle exec rake test TEST=test/unit/installer_test.rb
# or run the whole suite
bundle exec rake test
```

Note: `rake test` excludes `test/dummy/**` and `sandbox/*/test/**` by default so contributors don't need a booted Rails app for normal test runs.

## Recommended workflow

Split development and verification into clear stages for speed and clarity.

1) Fast edit loop — logic changes and unit tests

- Edit: make changes in `lib/`.
- Run: `bundle exec rake test TEST=test/unit/...` (no Rails required).

2) Generator verification — confirm generated files

- Purpose: ensure the install generator outputs the expected partials, templates, and locale files.
- Run generator tests under `test/generators/` (requires Rails), or manually run the generator in a sandbox and inspect the generated files.

3) E2E / integration — verify the gem in a host app

- Purpose: verify the gem, when installed in a real app, displays Flash messages as expected.
- Recommended approach: create a sandbox Rails app that references the local gem using `path:` and add Capybara/system tests to that sandbox. Automate sandbox bootstrap and run system tests in CI as a separate job if needed.

## Running generator tests locally

Generator tests under `test/generators/` use `Rails::Generators::TestCase`. To run them locally, add Rails to your development/test group:

```ruby
# Gemfile (example)
group :development, :test do
  gem 'rails', '~> 7.1'
end
```

Then:

```bash
bundle install
bundle exec rake test TEST=test/generators/install_generator_test.rb
```

## Sandbox + E2E (Capybara) guidance

Purpose: run integration tests that exercise the gem inside a host application.

Basic procedure:

1. Create a sandbox app (use `bin/sandbox` if available or run `rails new`).
2. In the sandbox `Gemfile`, reference the local gem:

```ruby
gem 'flash_unified', path: '../../'
```

3. Install and generate:

```bash
bundle install
bin/rails generate flash_unified:install
```

4. Run system tests (example):

```bash
bundle exec rake test:system
```

Test idea: have a controller action that sets `flash[:notice] = 'OK'` and redirects; use Capybara to visit the page and `assert_text 'OK'`. For asynchronous rendering, use `have_selector` / `have_text` with Capybara's waiting behavior.

Notes:
- Do not normally commit sandbox apps to the main branch. Use temporary branches or local directories for sandbox testing.
- When a bug is found in the sandbox, fix the gem source (in this repo), commit/PR the change, then rebuild the sandbox and re-run tests to verify.

## CI guidance (concise)

- Keep unit tests fast and runnable via `rake test`.
- Run generator integration tests in CI jobs that add Rails to the `development, test` group.
- Run sandbox E2E tests in a separate CI job (resource-heavy) and/or schedule them (nightly) if you want broader coverage.

## Short tips and background

- Installer extraction: moving file operations into `FlashUnified::Installer` enables fast, Rails-free unit testing and speeds up development loops.
- `test/dummy`: intended as a minimal placeholder for manual generator checks; it's excluded from automated `rake test` runs.
- Importmap: the generator prints recommended pins but does not modify `config/importmap.rb` automatically to avoid surprising host apps.
