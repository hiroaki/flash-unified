# FlashUnified

Welcome to your new gem! In this directory, you'll find the files you need to be able to package up your Ruby library into a gem. Put your Ruby code in the file `lib/flash_unified`. To experiment with that code, run `bin/console` for an interactive prompt.

TODO: Delete this and the text above, and describe your gem

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'flash_unified'
```

And then execute:

    $ bundle install

Or install it yourself as:

    $ gem install flash_unified

## Usage

TODO: Write usage instructions here

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `rake test` to run the tests. You can also run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/[USERNAME]/flash_unified. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [code of conduct](https://github.com/[USERNAME]/flash_unified/blob/master/CODE_OF_CONDUCT.md).


## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the FlashUnified project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/[USERNAME]/flash_unified/blob/master/CODE_OF_CONDUCT.md).

## Using FlashUnified in Rails 7+ (propshaft / importmap)

FlashUnified ships a small client-side library under `app/javascript/flash_unified` and several Rails view helpers that render the DOM templates and storage elements the client expects.

What the install generator does
------------------------------

Running the generator copies the following files from the engine into your host application (under the same relative paths):

- JavaScript: `app/javascript/flash_unified/flash_unified.js` (ES module)
- Views (engine partials) to `app/views/flash_unified/`:
    - `_templates.html.erb` (DOM <template> elements used by the client)
    - `_storage.html.erb` (per-page hidden storage element)
    - `_global_storage.html.erb` (global hidden storage element with `id="flash-storage"`)
    - `_container.html.erb` (container element where messages will be shown)
    - `_general_error_messages.html.erb` (renders HTTP status messages via I18n)
- Locale files to `config/locales/`:
    - `http_status_messages.en.yml`
    - `http_status_messages.ja.yml`

Run the generator with:

```bash
bin/rails generate flash_unified:install
```

By default the generator copies files into your application but will not overwrite existing files. If you already maintain custom partials or locale files the generator will skip them and leave your files in place.

Importmap / Propshaft / Sprockets
---------------------------------

- Importmap (recommended for Rails 7+ without a bundler):
    1. Run the generator (it copies `app/javascript/flash_unified/flash_unified.js` into your app).
    2. Pin the file in `config/importmap.rb` (the generator prints a suggested pin):

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
```

    3. Import it from your JavaScript entrypoint (e.g. `app/javascript/application.js`):

```js
import "flash_unified"
```

- Propshaft or Sprockets: the engine exposes its `app/javascript` to the host app's asset paths. You can include the script directly in your layout:

```erb
<%= javascript_include_tag "flash_unified/flash_unified" %>
```

Helpers and required DOM ids
---------------------------

This gem provides view helpers that render the engine's partials. The helpers are:

- `flash_global_storage` → renders the global hidden storage element (contains the required `id="flash-storage"`).
- `flash_storage` → renders a per-page hidden storage element.
- `flash_templates` → renders the `<template>` nodes the client uses to render messages.
- `flash_container` → renders a visible container where messages are shown (calls the engine partial).
- `flash_general_error_messages` → renders a list of localized HTTP status messages.

The JavaScript looks specifically for an element with the id `flash-storage`. If you override or copy the partials, keep `id="flash-storage"` on the global storage element or update your import to initialize the client with a different selector.

Recommended minimal layout snippet (place inside `<body>`):

```erb
<%= flash_global_storage %>
<%= flash_container %>
<%= flash_templates %>
<%= flash_general_error_messages %>
```

If you prefer to include partials manually instead of using helpers, render the engine partials under `flash_unified/` (the generator copies them to that path by default).

Locale files
------------

The gem ships `config/locales/http_status_messages.*.yml` for English and Japanese. The install generator copies these into your application's `config/locales/` so you can customize them. The generator will not overwrite existing locale files unless you remove them first.

Notes and next steps
--------------------

- Helpers in the engine render the engine partials by default. If you want to customize markup, run the generator and edit the copied view partials in your application.
- Generator currently skips existing files; adding a `--force` option to overwrite files is a possible future improvement.
- Tests for the generator and helper integration are not included yet; adding small unit/integration tests would be a good follow-up.

If anything here is unclear or you want a different default for the generator (for example, not copying view partials), tell me which behavior you prefer and I can update the README and generator accordingly.

