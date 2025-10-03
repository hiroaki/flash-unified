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

- JavaScript (ES modules) to `app/javascript/flash_unified/`:
    - `flash_unified.js` (core utilities)
    - `auto.js` (optional auto entry)
    - `turbo_helpers.js` (optional Turbo integration helpers)
    - `network_helpers.js` (optional network/HTTP error helpers)
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

### 2. Choose your initialization style

You can use a convenient auto-initialize entry, or wire things manually for full control.

#### Importmap pins

Add pins to `config/importmap.rb`:

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
```

#### Quick start (auto entry)

In your JS entrypoint (for example `app/javascript/application.js`):

```js
import "flash_unified/auto"; // Sets up Turbo listeners and renders on load
```

Configuration via HTML data attributes on the root `<html>` element:

- `data-flash-unified-auto-init="false"` — opt-out of auto init
- `data-flash-unified-debug="true"` — enable debug logging
- `data-flash-unified-enable-network-errors="true"` — also install Turbo-specific network error listeners

Example:

```erb
<html data-flash-unified-debug="true" data-flash-unified-enable-network-errors="true">
```

#### Manual control (recommended for advanced setups)

- Minimal render on Turbo events:

```js
import { renderFlashMessages } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
// Optionally, do an initial render explicitly if you prefer:
// renderFlashMessages();
```

- Programmatic messages (from your own JS):

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("Saved", "notice");
renderFlashMessages();
```

- Network/HTTP error helpers (framework-agnostic API):

```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

// e.g., in your global fetch() wrapper
notifyNetworkError();          // Sets a generic network error and renders
notifyHttpError(413);          // Sets an HTTP-status-specific message and renders
```

#### Asset pipeline (Propshaft / Sprockets)

When using the asset pipeline, import the auto entry via `asset_path` with a module script in your layout:

```erb
<link rel="modulepreload" href="<%= asset_path('flash_unified/auto.js') %>">
<script type="module">
  import "<%= asset_path('flash_unified/auto.js') %>";
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

The JavaScript is split into a minimal core plus optional helpers. Pick only what you need.

### Core (from `flash_unified`)

- `renderFlashMessages()` — scan hidden storage, render into the visible container, then remove storage nodes
- `appendMessageToStorage(message, type = 'alert')` — append a message into the global storage (`#flash-storage`)
- `clearFlashMessages(message?)` — clear all rendered messages, or only those whose text matches exactly
- `processMessagePayload(payload)` — accept `{ type, message }[]` or `{ messages: [...] }`, append and render
- `startMutationObserver(options = {})` — optional MutationObserver that reacts to inserted storage/templates
- `installCustomEventListener(debug = false)` — listen for `flash-unified:messages` custom events and handle payloads
- `storageHasMessages()` — utility used to detect pre-existing messages in storage

### Custom events

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

### Turbo integration helpers (from `flash_unified/turbo_helpers`)

- `installTurboRenderListeners(debug = false)` — render on Turbo lifecycle events (Drive, Frame, Stream)
- `installTurboIntegration(debug = false)` — convenience: install Turbo listeners and a custom payload handler

### Network/HTTP error helpers (from `flash_unified/network_helpers`)

- `notifyNetworkError()` — add a generic network error (looks up text in `#general-error-messages`) and render
- `notifyHttpError(status)` — add an HTTP-status-specific message and render
- `resolveAndAppendErrorMessage(status)` — lower-level function used by the helpers; respects existing storage/visible messages

### Auto entry (from `flash_unified/auto`)

When imported, it initializes Turbo integration automatically on DOM ready. Configure with `<html>` data attributes:

- `data-flash-unified-auto-init="false"` — disable auto
- `data-flash-unified-debug="true"` — enable debug logs
- `data-flash-unified-enable-network-errors="true"` — also install Turbo-specific network error listeners

## Locale files

The gem includes `config/locales/http_status_messages.*.yml` for English and Japanese. The install generator copies these into your application's `config/locales/` so you can customize them. Existing files are not overwritten by default.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) (English) or [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese) for detailed development and testing instructions.

## License

This project is licensed under the 0BSD (Zero-Clause BSD) license. See LICENSE for details.
