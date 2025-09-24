# FlashUnified

FlashUnified provides a unified Flash/notification rendering approach that works from both the server and the client.

Server-side view helpers embed messages as data inside the page, and a lightweight client-side JavaScript reads that data and renders messages into visible markup. This keeps the server responsible for providing message content while the client is responsible for rendering.

## Current status

This project is currently in alpha. It is not recommended for production use. Public APIs may change in a future release.

## Motivation

There were two design goals driving this project.

First, we wanted messages originating on the client (for example, a large request blocked by a proxy producing a 413) to appear using the same UI as server-side Flash messages. Because a proxy-blocked request never reaches the Rails server, the client must handle it; we still want the visual/UX to match the regular Flash system.

Second, we wanted Flash messages produced inside Turbo Frames to be displayed in a global, outside-the-frame location in many cases. Embedding messages inside a frame is straightforward, but applications often prefer to show messages outside the frame.

## How it works

The core idea is to split responsibilities between server and client into a two-step flow:

1. The server (view helpers) embeds messages into the page as hidden DOM storage elements.
2. The client-side JavaScript detects page changes, scans the hidden storage, reads pending messages, formats them using templates, and inserts them into the visible container. After rendering, storage elements are removed from the DOM to prevent duplicates.

## Key features

- View helpers that render the small DOM pieces the client expects:
    - hidden embedded storage elements for messages
    - template skeletons used to create visible message markup
    - a visible container element where messages are inserted
- A minimal client-side library (`app/javascript/flash_unified/flash_unified.js`) published as an ES module. It can be imported via Importmap or served through the asset pipeline.
- Localized HTTP-status message definitions included under `config/locales`.


## Installation

This gem is an alpha and not yet published on RubyGems.org. Install it from GitHub.

Add this to your application's `Gemfile`:

```ruby
# Gemfile
gem 'flash_unified', github: 'hiroaki/flash-unified', branch: 'develop'
# Optionally pin to a specific commit to avoid unexpected changes:
# gem 'flash_unified', github: 'hiroaki/flash-unified', ref: 'abcdef0'
```

Then run:

```bash
bundle install
```

## Setup (client-side)

FlashUnified consists of a client (JavaScript) and server (view helpers).

### 1. Place files (install generator)

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

### 2. Initialize the client

Call `initializeFlashMessageSystem` once when the page loads.

#### Importmap

1. Add a pin to `config/importmap.rb`:

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
```

2. Import and initialize it from your JavaScript entrypoint (for example `app/javascript/application.js`):

```js
import { initializeFlashMessageSystem } from "flash_unified";
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFlashMessageSystem);
} else {
    initializeFlashMessageSystem();
}
// initializeFlashMessageSystem() is idempotent; calling once is enough.
// For verbose logs during development, pass true: initializeFlashMessageSystem(true)
```

#### Propshaft / Sprockets

This library ships as an ES Module. If you're not using Importmap, import it via an inline module script in your layout and initialize it:

```erb
<script type="module">
    import { initializeFlashMessageSystem } from "<%= asset_path('flash_unified/flash_unified.js') %>";

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeFlashMessageSystem);
    } else {
        initializeFlashMessageSystem();
    }
    // Supports Turbo Frames/Streams out of the box via internal listeners
</script>
``` 

## Setup (server-side)

### Helpers

The gem provides the following view helpers (each renders a partial bundled with the engine):

- `flash_global_storage` — a global hidden embedded element (includes the required `id="flash-storage"`, commonly used with Turbo Streams).
- `flash_storage` — a per-page hidden embedded element; place it inside content that will be returned in responses.
- `flash_templates` — renders the `<template>` skeletons the client uses to create visible messages.
- `flash_container` — renders a visible container where messages will be displayed.
- `flash_general_error_messages` — renders localized HTTP status messages definitions (usually hidden).

Place the global hidden elements somewhere in your layout (for example just inside the `<body>`). Keep the `id="flash-storage"` on the global storage element (required for Turbo Streams integration).

### Minimal layout example

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

Embed per-response storage inside content that is returned to the client (this is a hidden element). If you return content for a Turbo Frame, render it inside that frame's response:
```erb
<%= flash_storage %>
```

### Template customization

The partials copied by the install generator can be freely edited to customize markup and styling. Below is a short excerpt from the default templates (`app/views/flash_unified/_templates.html.erb`):

```erb
<template id="flash-message-template-notice">
    <div class="flash-notice" role="alert">
        <span class="flash-message-text"></span>
    </div>
</template>
<template id="flash-message-template-warning">
    <div class="flash-warning" role="alert">
        <span class="flash-message-text"></span>
    </div>
</template>
```

Template IDs such as `flash-message-template-notice` map to flash "types" (for example `:notice`, `:alert`, `:warning`). The client selects a template by the message type. For custom types, add a template following the same ID pattern.

The client inserts the message text into `.flash-message-text` inside the template. Keep that element (or an equivalent placeholder) so insertion works; you can add extra elements (for example a dismiss button) and style as needed.

## JavaScript API

The client is published as an ES module and exports the following functions (see `app/javascript/flash_unified/flash_unified.js`):

- `initializeFlashMessageSystem(debug = false)`
    - Initializes the system. Idempotent.
    - Listens to: `DOMContentLoaded`, `turbo:load`, `turbo:frame-load`, `turbo:render`, `turbo:submit-end`, `turbo:after-stream-render`, `turbo:fetch-request-error`.
- `renderFlashMessages()`
    - Reads pending messages from storage, renders them into the container using templates, then removes the consumed storage node(s).
- `appendMessageToStorage(message, type = 'alert')`
    - Appends a single item into the global storage (`#flash-storage`).
- `clearFlashMessages(message?)`
    - Without an argument, removes all flash message elements from containers (leaves the container intact). With a string, removes only messages whose text matches exactly.
- `handleFlashPayload(payload)` (experimental)
    - Accepts `{ type, message }[]` or `{ messages: { type, message }[] }`, appends to storage, then renders.
- `enableMutationObserver(options = { debug: false })` (experimental)
    - Enables a MutationObserver to trigger rendering on relevant DOM insertions (normally not needed).

### Custom events (experimental)

Dispatch the `flash-unified:messages` event on `document` to push messages at any time:

```js
// Example 1: pass an array
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
    detail: [
        { type: 'notice', message: 'Saved' },
        { type: 'warning', message: 'Heads up' }
    ]
}));

// Example 2: pass an object with a messages field
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
    detail: { messages: [ { type: 'alert', message: 'Failed' } ] }
}));
```

### Network and HTTP error messages (experimental)

We hook into `turbo:submit-end` and `turbo:fetch-request-error` and apply the following rules. If storage already contains any messages or the container already has children, auto-insertion is skipped to avoid duplicates.

- For HTTP status codes `>= 400`, look up the localized message under `#general-error-messages li[data-status="<status>"]` and, if found, display it as an `alert`.
- If no server response is available (network/proxy error), fall back to `data-status="network"`.

## Locale files

The gem includes `config/locales/http_status_messages.*.yml` for English and Japanese. The install generator copies these into your application's `config/locales/` so you can customize them. Existing files are not overwritten by default.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) (English) or [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese) for detailed development and testing instructions.

## License

This project is licensed under the 0BSD (Zero-Clause BSD) license. See LICENSE for details.
