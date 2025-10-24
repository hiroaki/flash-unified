# FlashUnified

FlashUnified provides a unified Flash message rendering mechanism for Rails applications that can be used from both server-side and client-side code.

Server-side view helpers embed Flash messages as hidden DOM elements (`data-flash-storage`), and client-side JavaScript scans, formats, and renders them into containers. This enables consistent Flash UI for server messages, Turbo Frame responses, and client-detected errors (e.g., 413 proxy errors).

## Current status

This project is considered alpha up to v1.0.0. Public APIs are not stable and may change in future releases.

## Motivation

We faced two challenges simultaneously.

One is to be able to present client-originated messages using the same UI as server-side Flash messages. For example, when a large request is blocked by a proxy and a 413 error occurs, the client must handle it because the request does not reach the Rails server; nevertheless we want to display it using the same Flash UI logic.

The other is to support showing Flash messages that originate from Turbo Frames. Displaying Flash inside a frame is straightforward, but in most cases you want to display them outside the frame.

## How it works

The key insight is that rendering must be done on the JavaScript side. We split responsibilities between server and client into two steps:

1. The server embeds the Flash object into the page as hidden DOM elements and returns the rendered page.
2. The client-side JavaScript detects page changes, scans those elements, reads the embedded messages, formats them using templates, and inserts them into the specified container element. After rendering, the message elements are removed from the DOM to avoid duplicate displays.

This mechanism is simple; the main requirement is to define rules for how to embed data. This gem defines a DOM structure for the embedding, which we call "storage":

```erb
<div data-flash-storage style="display: none;">
  <ul>
    <% flash.each do |type, message| %>
      <li data-type="<%= type %>"><%= message %></li>
    <% end %>
  </ul>
</div>
```

Because storage is a hidden element, it can be placed anywhere in the rendered page. For Turbo Frames, place it inside the frame.

The "container" (where Flash messages are displayed) and the "templates" used for formatting are independent of the storage location and can be placed anywhere. This means that even when storage is inside a Turbo Frame, the rendering can target a Flash display area outside the frame.

For client-side handling of cases like proxy errors on form submission, instead of rendering an error message directly from JavaScript, embed the message into a storage element first and let the same templates and processing flow render the Flash message.

Controller-side procedures for setting Flash are unchanged:

```ruby
if @user.save
  redirect_to @user, notice: "Created successfully."
else
  flash.now[:alert] = "Could not create."
  render :new, status: :unprocessable_content
end
```

Introducing this gem does not require changes to existing controllers. There are almost no changes needed to existing page layouts either. The DOM elements to be set in views are hidden elements, and you'll mostly just need to slightly adjust the container area for Flash message display.

The main implementation task when using this gem is determining when the embedded data should be rendered as Flash messages. Typically this is done with events. Specific handling is left to the implementer, but helpers for automatic event setup are also provided. You can also explicitly call display methods within arbitrary processing.

## Main features

This gem provides the mechanism organized according to defined rules and helper tools to support implementation.

Server-side:
- View helpers that render DOM fragments expected by the client:
  - Hidden storage elements for temporarily saving messages in the page
  - Templates for the actual display elements
  - A container element indicating where templates should be inserted
- Localized messages for HTTP status (for advanced usage)

Client-side:
- A minimal library in `flash_unified.js`.
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

### 1. File placement (only if customization is needed)

This gem provides JavaScript, template, and locale translation files from within the engine. Only copy files using the generator if you want to customize them. Details are described below.

### 2. JavaScript library setup

**Importmap:**

Pin the JavaScript modules you use to `config/importmap.rb`:

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
```

Use `auto.js` to set up rendering timing automatically. `auto.js` automatically handles Turbo integration event registration, custom event registration, and initial page rendering.

If you want to control or implement such events yourself, use the core library `flash_unified.js` to implement rendering processing independently. In that case, `auto.js` is not needed. The helpers `turbo_helpers.js` and `network_helpers.js` are optional, so pin only the ones you will use.

**Asset pipeline (Propshaft / Sprockets):**

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

**Automatic initialization (simple implementation case):**

When using `auto.js`, import `auto` in your JavaScript entry point (e.g., `app/javascript/application.js`):
```js
import "flash_unified/auto";
```

Initialization processing is executed simultaneously with import. The behavior at that time can be controlled with data attributes on `<html>`. Details are described below.

**Semi-automatic control (Turbo events are set up automatically):**

When using `turbo_helpers.js`, initialization is not run automatically after import. Call the methods from the imported module:
```js
import { installInitialRenderListener } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
installInitialRenderListener();
```

This ensures Flash messages are rendered when page changes (Turbo events) are detected.

**Manual control (implementing event handlers yourself):**

When implementing event registration and other aspects yourself, you'll typically need to call `renderFlashMessages()` at least on initial page load to process messages that may have been embedded by the server. This has been prepared as `installInitialRenderListener()` since it's a standard procedure:

```js
import { installInitialRenderListener } from "flash_unified";
installInitialRenderListener();
```

Set up calls to rendering processing at appropriate timing to handle storage elements containing Flash messages embedded by the server. You'll probably write calls to `renderFlashMessages()` within some event handler:

```js
renderFlashMessages();
```

## Server setup

### Helpers

Server-side view helpers render the DOM fragments (templates, storage, containers, etc.) that the client expects. There are corresponding partial templates for each helper, but generally you don't need to change anything except the partial template for `flash_templates`.

- `flash_global_storage` — a globally placed general-purpose storage element (note: includes `id="flash-storage"`).
- `flash_storage` — a storage element; include it inside the content you return.
- `flash_templates` — display element templates used by the client (`<template>` elements).
- `flash_container` — the container element to place at the target location where users will actually see messages.
- `flash_general_error_messages` — an element that defines messages for HTTP status codes.

Important: the JavaScript relies on specific DOM contracts defined by the gem (for example, adding `id="flash-storage"` to global storage elements and template IDs in the form `flash-message-template-<type>`). Changing these IDs or selectors will break integration, so if you make changes, you must also update the corresponding JavaScript code.

### Minimal layout example

These are hidden elements so they can be placed anywhere. Typically placing them directly under `<body>` is sufficient:
```erb
<%= flash_general_error_messages %>
<%= flash_global_storage %>
<%= flash_templates %>
```

Place this where you want Flash messages to be displayed:
```erb
<%= flash_container %>
```

Embed the Flash message content in the response content. Since this is a hidden element, it can be placed anywhere within that content. If responding to a Turbo Frame, place it so it renders within the target frame:
```erb
<%= flash_storage %>
```

### Template customization

To customize the appearance and markup of Flash elements, first copy the templates to your host app with:

```bash
bin/rails generate flash_unified:install --templates
```

You can freely customize by editing the copied `app/views/flash_unified/_templates.html.erb`.

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

Template IDs like `flash-message-template-notice` correspond to Flash "types" (e.g., `:notice`, `:alert`, `:warning`). The client references the type contained in messages to select the corresponding template.

The client inserts the message string into the `.flash-message-text` element within the template. Otherwise there are no constraints. Feel free to add additional elements (e.g., dismiss buttons) as needed.

## JavaScript API and extensions

The JavaScript is split into a core library and optional helpers. Use only what you need.

### Core (`flash_unified`)

- `renderFlashMessages()` — scan storages, render to containers, and remove storages.
- `setFlashMessageRenderer(fn | null)` — replace the default DOM-based renderer with your own; pass `null` to restore default.
- `appendMessageToStorage(message, type = 'notice')` — append to the global storage.
- `clearFlashMessages(message?)` — remove rendered messages (all or exact-match only).
- `processMessagePayload(payload)` — accept `{ type, message }[]` or `{ messages: [...] }`.
- `installCustomEventListener()` — subscribe to `flash-unified:messages` and process payloads.
- `installInitialRenderListener()` — call `renderFlashMessages()` once after DOM is ready.
- `storageHasMessages()` — utility to detect existing messages in storage.
- `startMutationObserver()` — (optional / experimental) monitor insertion of storages/templates and render them.
 - `consumeFlashMessages(keep = false)` — scan all `[data-flash-storage]` elements on the current page and return an array of messages ({ type, message }[]). By default this operation is destructive and removes the storage elements; pass `keep = true` to read without removing.
- `aggregateFlashMessages()` — a thin wrapper over `consumeFlashMessages(true)` that returns the aggregated messages without removing storage elements. Useful for forwarding messages to external notifier libraries.
- `getFlashMessageContainers(options = {})` — collect candidate container elements (defaults to all `[data-flash-message-container]`). See “Container selection (client-only)” for options and usage.
- `getHtmlContainerOptions()` — read `<html>` data attributes to guide container selection (firstOnly/sortByPriority/visibleOnly/primaryOnly) used by the default renderer.

To display client-generated Flash messages at arbitrary timing, embed the message first and then perform rendering:

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("File size too large.", "notice");
renderFlashMessages();
```

To pass server-embedded messages to external libraries like toast instead of rendering them in the page, use `consumeFlashMessages()` to get messages and pass them to your notification library:

```js
import { consumeFlashMessages } from "flash_unified";

document.addEventListener('turbo:load', () => {
  const msgs = consumeFlashMessages();
  msgs.forEach(({ type, message }) => {
    YourNotifier[type](message); // like toastr.info(message)
  });
});
```

### Custom renderer (setFlashMessageRenderer)

By default, `renderFlashMessages()` inserts DOM built from templates into `[data-flash-message-container]`. You can replace this behavior with your own renderer function (for example, to integrate a third-party notifier like Notyf). The function receives an array of `{ type, message }`.

Pass `null` instead of a function to restore the default renderer.

- Signature: `setFlashMessageRenderer(fn: (messages: { type: string, message: string }[]) => void | null)`
- Throws: `TypeError` if `fn` is neither a function nor `null`.

Example with Notyf:

```js
import { setFlashMessageRenderer } from "flash_unified";

setFlashMessageRenderer((messages) => {
  const notyf = new Notyf();
  messages.forEach(({ type, message }) => {
    const level = type === 'info' || type === 'notice' ? 'success' : 'error';
    notyf.open({ type: level, message });
  });
});
```

Important when using `auto.js`: register your custom renderer before importing `auto` so the first render uses it.

Importmap/asset pipeline layout example (order matters — renderer first, then auto):

```erb
<script type="module">
  import { setFlashMessageRenderer } from "flash_unified";
  setFlashMessageRenderer((messages) => {
    ...
  });
</script>
<script type="module">
  import "flash_unified/auto";
</script>
```

Alternatively, you can disable auto and initialize manually after setting the renderer:

```erb
<html data-flash-unified-auto-init="false">
  ...
  <script type="module">
    import { setFlashMessageRenderer, installInitialRenderListener } from "flash_unified";
    setFlashMessageRenderer((msgs) => { /* custom */ });
    installInitialRenderListener(); // or call renderFlashMessages() at your timing
  </script>
</html>
```

Note: If you set a custom renderer after the first render has already run, only subsequent renders will use it. To avoid mixed behavior, prefer registering the renderer before the first render (or disable auto-init and render manually).

### Container selection (client-only)

You can choose where messages are rendered without changing the server. By default, the default renderer renders into all `[data-flash-message-container]`, so you don't need to implement any selection logic unless you want custom routing. When needed, use `getFlashMessageContainers()` to collect candidates and apply your own logic. If you don't want a custom renderer, you can still guide the default renderer via `<html>` data attributes (see below).

Note: A custom renderer is free to ignore the container convention and render anywhere (e.g., a toast library). `getFlashMessageContainers()` is just a convenience when you want to keep using the gem’s container convention and filter within it; it’s optional for custom renderers.

Options for `getFlashMessageContainers(options)`:
- `primaryOnly?: boolean` — include only elements with `data-flash-primary` present (and not "false").
- `visibleOnly?: boolean` — include only elements considered visible (basic heuristic: display/visibility/opacity).
- `sortByPriority?: boolean` — sort ascending by numeric `data-flash-message-container-priority` (missing treated as Infinity).
- `firstOnly?: boolean` — return at most one element after filtering/sorting.
- `filter?: (el) => boolean` — extra predicate to filter elements.

Example: render only into the highest-priority visible container (does nothing if none found).

```js
import { setFlashMessageRenderer, getFlashMessageContainers } from "flash_unified";

setFlashMessageRenderer((messages) => {
  const container = getFlashMessageContainers({ sortByPriority: true, visibleOnly: true, firstOnly: true })[0];
  if (!container) return;
  messages.forEach(({ type, message }) => {
    if (!message) return;
    // Use your own node creation, or replicate the default template-based node creation.
  });
});
```

Guide the default renderer without code using `<html>` data attributes:

```erb
<html
  data-flash-unified-container-first-only="true"
  data-flash-unified-container-sort-by-priority="true"
  data-flash-unified-container-visible-only="true">
```

These toggle the same options the collector understands:

- `data-flash-unified-container-first-only`: at most one target
- `data-flash-unified-container-sort-by-priority`: sort ascending by `data-flash-message-container-priority`
- `data-flash-unified-container-visible-only`: visible containers only
- `data-flash-unified-container-primary-only`: require `data-flash-primary`

Values accepted: presence (no value), `true`, or `1` → true; `false` or `0` → false.

### Custom event

When using custom events, run `installCustomEventListener()` during initialization:

```js
import { installCustomEventListener } from "flash_unified";
installCustomEventListener();
```

Then, at any desired timing, dispatch a `flash-unified:messages` event to the document:

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

When using Turbo for partial page updates, you need to perform rendering processing triggered by partial update events. A helper is provided to register those event listeners in bulk:

- `installTurboRenderListeners()` — register events for rendering according to Turbo lifecycle.
- `installTurboIntegration()` — intended for use by `auto.js`, combines `installTurboRenderListeners()` and `installCustomEventListener()`.
- `installNetworkErrorListeners()` — enable listeners that detect Turbo form submission/network errors, append the appropriate error message, and trigger rendering.

```js
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
installTurboRenderListeners();
```

### Network/HTTP error helpers (`flash_unified/network_helpers`)

When using network/HTTP error helpers:
```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError(); // Set and render generic network error message
notifyHttpError(413); // Set and render HTTP status-specific message
```

- `notifyNetworkError()` — uses generic network error text from `#general-error-messages` for rendering.
- `notifyHttpError(status)` — similarly uses HTTP status-specific text for rendering.

The text used here is written as hidden elements by the server-side view helper `flash_general_error_messages`, and the original text is placed as I18n translation files in `config/locales/http_status_messages.*.yml`.

To customize the default translation content, copy translation files to your host app with the following command and edit them:

```bash
bin/rails generate flash_unified:install --locales
```

### Auto initialization entry (`flash_unified/auto`)

Importing `flash_unified/auto` automatically runs Turbo integration initialization after DOM ready. The behavior at that time can be controlled with data attributes on `<html>`:

- `data-flash-unified-auto-init="false"` — disable automatic initialization.
- `data-flash-unified-enable-network-errors="true"` — also enable listeners for network/HTTP errors.

```erb
<html data-flash-unified-enable-network-errors="true">
```

## Development

For detailed development and testing procedures, see [DEVELOPMENT.md](DEVELOPMENT.md) (English) or [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese).

## Changelog

See all release notes on the [GitHub Releases page](https://github.com/hiroaki/flash-unified/releases).

## License

This project is licensed under 0BSD (Zero-Clause BSD). See `LICENSE` for details.
