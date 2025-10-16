# FlashUnified

FlashUnified provides a unified Flash message rendering mechanism for Rails applications that can be used from both server-side and client-side code.

Server-side view helpers embed Flash messages into the page as data, and a lightweight client-side JavaScript reads those embeddings and renders them onto the page.

## Current status

This project is considered alpha up to v1.0.0. Public APIs are not stable and may change in future releases.

## Motivation

Two concerns motivated this work.

One is to be able to present client-originated messages using the same UI as server-side Flash messages. For example, when a large request is blocked by a proxy and a 413 error occurs, the client must handle it because the request does not reach the Rails server; nevertheless we want to display it using the same Flash UI.

The other is to support showing Flash messages that originate from Turbo Frames. Displaying Flash inside a frame is straightforward, but in most applications messages are shown outside the frame.

## How it works

The key is that rendering must be done on the JavaScript side. We split responsibilities between server and client into two steps:

1. The server embeds the Flash object into the page as hidden DOM elements and returns the rendered page.
2. The client-side JavaScript detects page changes, scans those elements, reads the embedded messages, formats them using templates, and inserts them into the specified container element. After rendering, the message elements are removed from the DOM to avoid duplicate displays.

This mechanism is simple; the main requirement is to agree on how to embed data. This gem defines a DOM structure for the embedding, which we refer to as "storage":

```erb
<div data-flash-storage style="display: none;">
  <ul>
    <% flash.each do |type, message| %>
      <li data-type="<%= type %>"><%= message %></li>
    <% end %>
  </ul>
</div>
```

Because storage is hidden, it can be placed anywhere in the rendered page. For Turbo Frames, place it inside the frame.

The container (where Flash messages are displayed) and the templates used for formatting are independent of the storage location. In other words, even when storage is inside a Turbo Frame, the rendering can target a container outside the frame.

For client-detected cases (for example, when a proxy returns 413 on form submission), instead of rendering an error message directly from JavaScript, embed the message into a container element and let the same templates and flow render it as a Flash message.

### Controller example

Controller-side procedures for setting Flash are unchanged:

```ruby
if @user.save
  redirect_to @user, notice: "Created successfully."
else
  flash.now[:alert] = "Could not create."
  render :new, status: :unprocessable_content
end
```

Introducing this gem does not require changes to existing controllers. Layout changes are minimal since storage elements are hidden; usually you only need to adjust the container area for Flash messages.

The main implementation task when using this gem is deciding when the embedded data should be rendered as Flash messages. Typically this is done with events. The gem provides helpers that automatically set up event handlers, but you may call rendering methods directly where appropriate.

## Main features

This gem provides rules for embedding data and helper tools for implementation.

Server-side:
- View helpers that render DOM fragments expected by the client:
  - Hidden storage elements for temporarily saving messages in the page
  - Templates for the actual display elements
  - A container element indicating where templates should be inserted
- Localized messages for HTTP status (for advanced usage)

Client-side:
- A minimal ES Module in `flash_unified.js`. Configure via Importmap or the asset pipeline.
- `auto.js` for automatic initialization (optional)
- `turbo_helpers.js` for Turbo integration (optional)
- `network_helpers.js` for network/HTTP error display (optional)

Generator:
- An installer generator that copies the above files into the host application.

## Installation

Add the following to your application's `Gemfile`:

```ruby
gem 'flash_unified'
```

Then run:

```bash
bundle install
```

## Setup

### 1. Place files

Run the installer generator:

```bash
bin/rails generate flash_unified:install
```

### 2. Add JavaScript

**Importmap:**

`config/importmap.rb` should pin the JavaScript modules you use. The installer generator and sandbox templates pin all shipped modules, but if you manage pins manually, include at least the following:

```ruby
pin "flash_unified/auto", to: "flash_unified/auto.js"
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
```

If you want the library to set up rendering timing automatically, use `auto.js`. `auto.js` will register Turbo integration events, custom event listeners, and perform initial render handling automatically.

If you prefer to control those events yourself, import the core `flash_unified` module and call the provided helpers (for example, `installInitialRenderListener()` for initial render, `installTurboRenderListeners()` from `flash_unified/turbo_helpers` for Turbo lifecycle hooks, and `installCustomEventListener()` to subscribe to `flash-unified:messages`). `turbo_helpers.js` and `network_helpers.js` are optional—pin only the ones you will use.

**Asset pipeline (Propshaft / Sprockets):**

This gem's JavaScript is provided as ES modules. Instead of `pin`ning, add the following to an appropriate place in your layout:
```erb
<link rel="modulepreload" href="<%= asset_path('flash_unified/flash_unified.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/network_helpers.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/turbo_helpers.js') %>">
<link rel="modulepreload" href="<%= asset_path('flash_unified/auto.js') %>">
<script type="importmap">
  {
    "imports": {
      "flash_unified": "<%= asset_path('flash_unified/flash_unified.js') %>",
      "flash_unified/auto": "<%= asset_path('flash_unified/auto.js') %>",
      "flash_unified/turbo_helpers": "<%= asset_path('flash_unified/turbo_helpers.js') %>",
      "flash_unified/network_helpers": "<%= asset_path('flash_unified/network_helpers.js') %>"
    }
  }
</script>
<script type="module">
  import "flash_unified/auto";
</script>
```

### 3. JavaScript initialization

When using helpers, ensure the initialization that registers event handlers runs on page load.

**Automatic (simple case):**

Import `auto.js` in your JS entry (e.g. `app/javascript/application.js`):

```js
import "flash_unified/auto";
```

`auto.js` runs initialization when loaded. Its behavior can be controlled with data attributes on `<html>` (described below).

**Semi-automatic (Turbo events are set automatically):**

When using `turbo_helpers.js`, initialization is not run automatically after import. Call the provided functions:

```js
import { installInitialRenderListener } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
installInitialRenderListener();
```

This ensures Flash messages are rendered when page changes occur (Turbo events).

**Manual (implement your own handlers):**

If you implement event registration yourself, at minimum call `renderFlashMessages()` on initial page load. A helper `installInitialRenderListener()` is provided for this purpose:

```js
import { installInitialRenderListener } from "flash_unified";
installInitialRenderListener();
```

Decide an appropriate timing to call `renderFlashMessages()`—typically within an event handler.

## Server setup

### Helpers

Server-side view helpers render the DOM fragments the client expects. Most partials do not need changes other than the `flash_templates` partial.

- `flash_global_storage` — a global storage element (includes `id="flash-storage"`).
- `flash_storage` — a storage element; include it inside the content you return.
- `flash_templates` — templates (`<template>` elements) used by the client.
- `flash_container` — the container where Flash messages are displayed.
- `flash_general_error_messages` — a node with messages for HTTP status codes.

Important: the JavaScript relies on specific DOM contracts (for example, a global storage element with `id="flash-storage"` and template IDs in the form `flash-message-template-<type>`). Changing these IDs/selectors without updating the JavaScript will break integration.

### Minimal layout example

Storage elements can be placed anywhere. Typically they are included near the top of the body:

```erb
<%= flash_general_error_messages %>
<%= flash_global_storage %>
<%= flash_templates %>
```

Place the visible container where users should see messages:

```erb
<%= flash_container %>
```

Embed `flash_storage` inside the response content (for Turbo Frame responses, render it inside the frame):

```erb
<%= flash_storage %>
```

### Template customization

To customize the appearance and markup of Flash messages, edit the partial template `app/views/flash_unified/_templates.html.erb` that is copied into your host Rails application by the installer generator.

Here is a partial example:

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

Template IDs like `flash-message-template-notice` map to Flash types (`:notice`, `:alert`, `:warning`). The client inserts the message string into `.flash-message-text`. Otherwise the templates are free-form; add elements such as dismiss buttons as needed.

## JavaScript API and extensions

The JavaScript is split into a core library and optional helpers. Use only what you need.

### Core (`flash_unified`)

- `renderFlashMessages()` — scan storages, render to containers, and remove storages.
- `appendMessageToStorage(message, type = 'notice')` — append to the global storage.
- `clearFlashMessages(message?)` — remove rendered messages (all or exact-match only).
- `processMessagePayload(payload)` — accept `{ type, message }[]` or `{ messages: [...] }`.
- `installCustomEventListener()` — subscribe to `flash-unified:messages` and process payloads.
- `storageHasMessages()` — utility to detect existing messages in storage.
- `startMutationObserver()` — (optional / experimental) monitor insertion of storages/templates and render them.
- `consumeFlashMessages(keep = false)` — scan all `[data-flash-storage]` elements on the current page and return an array of messages ({ type, message }[]). By default this operation is destructive and removes the storage elements; pass `keep: true` to read without removing.
 - `consumeFlashMessages(keep = false)` — scan all `[data-flash-storage]` elements on the current page and return an array of messages ({ type, message }[]). By default this operation is destructive and removes the storage elements; pass `keep = true` to read without removing.
- `aggregateFlashMessages()` — a thin wrapper over `consumeFlashMessages(true)` that returns the aggregated messages without removing storage elements. Useful for forwarding messages to external notifier libraries.

Use `appendMessageToStorage()` and `renderFlashMessages()` to produce client-originated Flash messages:

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("File size too large.", "notice");
renderFlashMessages();
```

If you want to forward server-embedded messages to a toast/notifier library instead of rendering them in the page, `aggregateFlashMessages()` returns the messages without removing storage so you can pass them to your notifier:

```js
import { aggregateFlashMessages } from "flash_unified";

document.addEventListener('turbo:load', () => {
  const msgs = aggregateFlashMessages();
  msgs.forEach(({ type, message }) => {
    YourNotifier[type](message); // e.g. toastr.info(message)
  });
});
```

### Custom event

To use custom events, run `installCustomEventListener()` during initialization:

```js
import { installCustomEventListener } from "flash_unified";
installCustomEventListener();
```

Then, at any desired timing, dispatch a `flash-unified:messages` event on the document:

```js
// Example: passing an array
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: [
    { type: 'notice', message: 'Sent successfully.' },
    { type: 'warning', message: 'Expires in one week.' }
  ]
}));

// Example: passing an object
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: { messages: [ { type: 'alert', message: 'Operation was cancelled.' } ] }
}));
```

### Turbo helpers (`flash_unified/turbo_helpers`)

When using Turbo, partial updates require rendering at the appropriate events. Use the helper to register these listeners:

- `installTurboRenderListeners()` — register Turbo lifecycle listeners.
- `installTurboIntegration()` — a convenience that combines `installTurboRenderListeners()` and `installCustomEventListener()` (used by `auto.js`).

```js
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
installTurboRenderListeners();
```

### Network/HTTP helpers (`flash_unified/network_helpers`)

Use these helpers to set messages for network/HTTP errors:

```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError();
notifyHttpError(413);
```

The messages used here are output as hidden elements by the server-side view helper `flash_general_error_messages`. The original message strings are installed as I18n translation files in `config/locales` by the generator. To change these messages, edit the translations in the corresponding locale file.

### Auto initialization entry (`flash_unified/auto`)

Importing `flash_unified/auto` runs initialization after DOM ready. The behavior can be controlled with data attributes on `<html>`:

- `data-flash-unified-auto-init="false"` — disable automatic initialization.
- `data-flash-unified-enable-network-errors="true"` — also enable network/HTTP error listeners.

```erb
<html data-flash-unified-enable-network-errors="true">
```

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) or [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) for development and testing instructions.

## License

This project is licensed under 0BSD (Zero-Clause BSD). See `LICENSE` for details.
