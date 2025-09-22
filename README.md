# FlashUnified

FlashUnified provides a unified Flash/notification rendering approach that works from both the server and the client.

Server-side view helpers embed messages as data inside the page, and a lightweight client-side JavaScript reads that data and renders messages into visible markup. This keeps the server responsible for providing message content while the client is responsible for rendering.

## Current status

This project is currently in alpha. It is not recommended for production use. Public APIs may change in a future release.

## Key features

- View helpers that render the small DOM pieces the client expects:
    - hidden embedded storage elements for messages
    - template skeletons used to create visible message markup
    - a visible container element where messages are inserted
- A minimal client-side library (`app/javascript/flash_unified/flash_unified.js`) published as an ES module. It can be imported via importmap or served through the asset pipeline.
- Localized HTTP-status message definitions included under `config/locales`.

## How it works

The gem uses a two-step flow that keeps responsibilities clear between server and client:

1. Server helpers embed messages into hidden DOM storage elements in the page.
2. The client-side JavaScript scans the hidden storage when the page loads or when the page changes, reads any pending messages, and renders them using the template skeletons into the visible container.

## Installation

Add this line to your application's `Gemfile`:

```ruby
gem 'flash_unified'
```

Then run:

```bash
bundle install
```

Or install the gem directly:

```bash
gem install flash_unified
```

## Rails 7+ usage (importmap / propshaft)

FlashUnified ships a small client-side library under `app/javascript/flash_unified` and a set of Rails view helpers that render the DOM templates and storage elements the client expects.

### What the install generator does

Running the generator copies the following files into your host application under the same relative paths:

- JavaScript: `app/javascript/flash_unified/flash_unified.js`
- View partials to `app/views/flash_unified/`:
    - `_templates.html.erb` (the `<template>` skeletons the client uses)
    - `_storage.html.erb` (per-page hidden storage element)
    - `_global_storage.html.erb` (global hidden storage element, used commonly with Turbo Streams)
    - `_container.html.erb` (visible container where messages are shown)
    - `_general_error_messages.html.erb` (localized HTTP status message definitions)
- Locale files to `config/locales/`:
    - `http_status_messages.en.yml`
    - `http_status_messages.ja.yml`

Run the generator with:

```bash
bin/rails generate flash_unified:install
```

By default the generator will not overwrite existing files. If you already have custom partials or locale files they will be left in place.

## Importmap / Propshaft / Sprockets

### Importmap (recommended for Rails 7+ without a bundler)

1. Run the generator to place `app/javascript/flash_unified/flash_unified.js` into your app.
2. Add a pin to `config/importmap.rb`:

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
```

3. Import it from your JavaScript entrypoint (for example `app/javascript/application.js`):

```js
import "flash_unified"
```

### Propshaft or Sprockets

The engine exposes `app/javascript` to the host app's asset paths. You can include the script directly in your layout:

```erb
<%= javascript_include_tag "flash_unified/flash_unified" %>
```

## Helpers

The gem provides the following view helpers (each renders a partial bundled with the engine):

- `flash_global_storage` — a global hidden embedded element (includes the required `id="flash-storage"`, commonly used with Turbo Streams).
- `flash_storage` — a per-page hidden embedded element; place it inside content that will be returned in responses.
- `flash_templates` — renders the `<template>` skeletons the client uses to create visible messages.
- `flash_container` — renders a visible container where messages will be displayed.
- `flash_general_error_messages` — renders localized HTTP status messages definitions (usually hidden).

Place the global hidden elements somewhere in your layout (for example just inside the `<body>`). Keep the `id="flash-storage"` on the global storage element unless you explicitly initialize the client with a different selector.

### Recommended minimal layout example (place inside `<body>`)

Global placement (hidden elements):
```erb
<%= flash_general_error_messages %>
<%= flash_global_storage %>
<%= flash_templates %>
```

Place where you want messages to appear:
```erb
<%= flash_container %>
```

Embed per-response storage inside content that is returned to the client (this is a hidden element):
```erb
<%= flash_storage %>
```

## Template customization

The partials copied by the install generator can be freely edited to customize markup and styling. Below is a short excerpt from the default templates (`app/views/flash_unified/_templates.html.erb`):

```erb
<template id="flash-message-template-notice">
    <div class="flash-notice" role="alert">
        <span class="flash-message-text"></span>
    </div>
</template>
<template id="flash-message-template-warning">
    <div class="flash-alert" role="alert">
        <span class="flash-message-text"></span>
    </div>
</template>
```

Template ids such as `flash-message-template-notice` map to flash "types" (for example `:notice`, `:alert`, `:warning`). The client will choose the matching template based on the message's type. If you add custom types, provide templates using the same id pattern.

The client places the message text inside the `.flash-message-text` element within the template. When customizing, keep that element (or an equivalent placeholder) so messages are inserted correctly; you can also add extra elements (for example a dismiss button) and style them as needed.

## Locale files

The gem includes `config/locales/http_status_messages.*.yml` for English and Japanese. The install generator copies these into your application's `config/locales/` so you can customize them. Existing files are not overwritten by default.

## Development

See `DEVELOPMENT.md` (English) or `DEVELOPMENT.ja.md` (Japanese) for detailed development and testing instructions.

## License

This project is licensed under the 0BSD (Zero-Clause BSD) license. See LICENSE for details.
