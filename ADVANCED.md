# FlashUnified — Advanced usage

This document contains detailed usage, configuration, and examples for FlashUnified.

## Main features

This gem provides the mechanism organized into defined rules and supporting tools for its implementation.

Server-side:
- Several view helpers that render the following elements:
  - Hidden elements (storages) embedded to temporarily store messages within the page
  - Templates for actual display
  - Elements (containers) to indicate where templates should be inserted
- Localized messages for HTTP status codes for advanced features

Client-side:
- Minimal core library in `flash_unified.js`
- `auto.js` helper for automatic initialization (optional)
- `turbo_helpers.js` helper for Turbo integration (optional)
- `network_helpers.js` helper for network/HTTP error display (optional)

Generator:
- Installation generator to deploy each of the above files

## Installation

Add the gem to your application's `Gemfile`:
```ruby
gem 'flash_unified'
```

Then run:
```bash
bundle install
```

## Setup (client-side)

### 1. File placement (only when customization is needed)

The engine ships JavaScript, templates, and locale files. Only copy files into the host app when you want to customize them (use the generator described below).

### 2. Installing the JavaScript library

**For Importmap**

Add the bundled entry to `config/importmap.rb`:
```ruby
pin "flash_unified/all", to: "flash_unified/all.bundle.js"
```

Then import it from your JS entry (for example `app/javascript/application.js`):
```js
import "flash_unified/all";
```

Importing `flash_unified/all` enables the default Turbo integration and performs an initial render automatically. Behavior is configurable via `<html>` data attributes:
- `data-flash-unified-auto-init="false"` — disable automatic initialization (opt-out)
- `data-flash-unified-enable-network-errors="true"` — enable network error helpers (opt-in)

If you need finer control, pin individual modules instead (`all.bundle.js` bundles these four JavaScript modules). Import only the modules you need:
```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
```

**For Asset pipeline (Propshaft / Sprockets)**

```erb
<link rel="modulepreload" href="<%= asset_path('flash_unified/all.bundle.js') %>">
<script type="importmap">
  {
    "imports": {
      "flash_unified/all": "<%= asset_path('flash_unified/all.bundle.js') %>"
    }
  }
</script>
<script type="module">
  import "flash_unified/all";
</script>
```

If you want to access individual modules directly, add them to the import map in the same way.

### 3. JavaScript initialization

**Automatic initialization (for simple implementation cases)**

When using `auto.js`, import `auto` in your JavaScript entry point (e.g., `app/javascript/application.js`):
```js
import "flash_unified/auto";
```

The initialization process runs automatically upon import. Its behavior can be controlled via `<html>` data attributes (opt-in, opt-out).

**Semi-automatic control (automatic setup for Turbo events only)**

The same applies when using `turbo_helpers.js`, but if you don't use `auto.js`, the initialization process is not executed automatically. Call each method from the imported module as follows:
```js
import { installInitialRenderListener } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
installInitialRenderListener();
```

This will render Flash messages when page changes (Turbo events) are detected.

**Manual control (when implementing event handlers yourself)**

When implementing full manual control including event registration, import the core library and implement rendering processes using its methods.

At minimum, you will typically call `renderFlashMessages()` at page load (initial display) to process messages that may have been embedded in the page by the server-side. This routine procedure is provided as `installInitialRenderListener()`:
```js
import { installInitialRenderListener } from "flash_unified";
installInitialRenderListener();
```

To process elements (storages) with embedded Flash messages from the server-side, make sure to call the rendering process at the appropriate timing. You will likely write a call to `renderFlashMessages()` within some event handler:
```js
renderFlashMessages();
```

## Setup (server-side)

### 1. Message sources

Place the source elements for JavaScript to build Flash message elements at a global location. Since these are hidden elements, they can be placed anywhere, but place them right after `<body>`:
```erb
<body>
  <%= flash_unified_sources %>
  ...
```

For Turbo Frame responses, place the storage inside the frame:
```erb
<turbo-frame id="foo">
  <%= flash_storage %>
  ...
```

Then place the container at any location where you want to display Flash messages:
```erb
<div class="notify">
  <%= flash_container %>
  ...
```

Multiple containers can be placed, but by default, the same message is inserted into all containers. To control this, refer to "Container selection" described later.

#### Helper list (reference)

View helpers used on the server-side render DOM fragments (templates, storages, containers, etc.) with structures expected by the client.

- `flash_global_storage` — a general-purpose storage element placed globally (Note: contains `id="flash-storage"`).
- `flash_storage` — storage element to be included in content that will be replaced.
- `flash_templates` — `<template>` templates used by the client for display.
- `flash_container` — container element placed at the target position for actual display to users.
- `flash_general_error_messages` — element that defines messages for HTTP status codes.

Among these, all except `flash_container` are fixed elements, so there is a wrapper helper that outputs them together.

- `flash_unified_sources` — a complete set of "sources" for building Flash messages. Hidden elements.

### 2. Customizing templates

If you want to customize the appearance or markup of Flash elements, first copy the templates to your host app with the following command:
```bash
bin/rails generate flash_unified:install --templates
```

You can freely customize by editing the copied `app/views/flash_unified/_templates.html.erb`.

Below is a partial excerpt:
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

Template IDs like `flash-message-template-notice` correspond to Flash "types" (e.g., `:notice`, `:alert`, `:warning`). The client references the type included in the message to select the appropriate template.

The client inserts the message string into the `.flash-message-text` element within the template. There are no other constraints. Feel free to add additional elements (such as a dismiss button) as needed.

## JavaScript API and extensions

The JavaScript is divided into a core library and optional helper modules. Use only the pieces you need.

### Core API (`flash_unified`)

- `renderFlashMessages()` — scan storages, render into containers, and remove storages.
- `setFlashMessageRenderer(fn | null)` — replace the default DOM rendering process with a custom renderer function. Pass `null` to restore the default.
- `appendMessageToStorage(message, type = 'notice')` — append a message to the global storage.
- `clearFlashMessages(message?)` — clear all rendered Flash messages, or only those that exactly match `message`.
- `processMessagePayload(payload)` — accept `{ type, message }[]` or `{ messages: [...] }`, append, and render.
- `installCustomEventListener()` — subscribe to `flash-unified:messages` and process payloads.
- `installInitialRenderListener()` — call `renderFlashMessages()` once at initial display (after DOM ready).
- `storageHasMessages()` — utility to check if storages contain existing messages.
- `startMutationObserver()` — (optional: experimental) monitor insertion of storages/templates and render.
- `consumeFlashMessages(keep = false)` — scan all storages embedded in the current page and return an array of messages (`{ type, message }[]`). By default, performs destructive operation by removing storage elements, but passing `keep = true` retrieves without removing storages.
- `aggregateFlashMessages()` — thin wrapper for `consumeFlashMessages(true)`, non-destructively scans storages and returns message array.
- `getFlashMessageContainers(options = {})` — collect candidate container elements for rendering. See "Container selection" described later for details.
- `getHtmlContainerOptions()` — read container selection options (firstOnly/sortByPriority/visibleOnly/primaryOnly) from `<html>` data attributes (used by default renderer).

To display Flash messages generated within the client at any timing, embed the message first and then perform the rendering process as follows:
```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("File size is too large.", "notice");
renderFlashMessages();
```

If you want to pass server-embedded messages to an external library such as a toast notification instead of rendering to the page, you can use `consumeFlashMessages()` to retrieve messages and pass them to the notification library:
```js
import { consumeFlashMessages } from "flash_unified";

document.addEventListener('turbo:load', () => {
  const msgs = consumeFlashMessages();
  msgs.forEach(({ type, message }) => {
    YourNotifier[type](message); // like toastr.info(message)
  });
});
```

However, in cases where you consistently use an external library throughout, it is better to register a custom renderer with `setFlashMessageRenderer()` to replace the default rendering process itself, rather than implementing it in each event handler. This is explained in the next section.

### Custom renderer (`setFlashMessageRenderer`)

The default `renderFlashMessages()` uses templates to build DOM and inserts it into `[data-flash-message-container]` for display, but you can replace this process with a custom renderer function. For example, you can integrate with third-party notification libraries such as Notyf.

The function receives an array of `{ type, message }[]` as its argument.

Passing `null` instead of a function restores the default renderer.

- Signature: `setFlashMessageRenderer(fn: (messages: { type: string, message: string }[]) => void | null)`
- Exception: Throws `TypeError` if `fn` is neither a function nor `null`.

Example using Notyf:
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

Important note when using `auto.js`: To use the custom renderer for the initial render, register the custom renderer before `import "flash_unified/auto"`.

Importmap/Asset pipeline layout example (order is important — register first, then load auto):
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

Alternatively, you can disable auto and initialize manually:
```erb
<html data-flash-unified-auto-init="false">
  ...
  <script type="module">
    import { setFlashMessageRenderer, installInitialRenderListener } from "flash_unified";
    setFlashMessageRenderer((msgs) => { /* custom */ });
    installInitialRenderListener(); // or call renderFlashMessages() as appropriate
  </script>
</html>
```

Note: If you register a custom renderer after the initial render, it will be applied from subsequent renderings. To avoid mixed behavior, it is recommended to register before the initial render (or disable auto and implement rendering process manually).

### Container selection

By default, Flash messages formatted with templates are inserted into all container elements (`[data-flash-message-container]`) even when there are multiple containers. To narrow down to specific containers, create a custom renderer or set HTML data attributes.

#### Creating a custom renderer

When setting a custom renderer, you are not required to follow the container conventions and can retrieve container elements arbitrarily and insert Flash messages arbitrarily. If you want to narrow down while following existing conventions, you can also use the optional utility `getFlashMessageContainers()` to collect and filter candidates.

Main options for `getFlashMessageContainers(options)`:
- `primaryOnly?: boolean` — narrow down to only elements with `data-flash-primary` (excludes "false")
- `visibleOnly?: boolean` — narrow down to only visible elements (simple judgment by display/visibility/opacity)
- `sortByPriority?: boolean` — sort in ascending order by numeric value of `data-flash-message-container-priority` (unspecified treated as Infinity)
- `firstOnly?: boolean` — return only the first item after filtering/sorting
- `filter?: (el) => boolean` — apply additional filtering predicate

Example) Render to only one container with high priority and currently visible:
```js
import { setFlashMessageRenderer, getFlashMessageContainers } from "flash_unified";

setFlashMessageRenderer((messages) => {
  const container = getFlashMessageContainers({
    sortByPriority: true,
    visibleOnly: true,
    firstOnly: true
  })[0];
  if (!container) return;
  messages.forEach(({ type, message }) => {
    // Reuse default template node creation logic / create your own, etc., implement as you prefer.
  });
});
```

#### Guiding the default renderer with HTML data attributes

Without creating a custom renderer, you can specify first-only / priority / visible / primary selection rules via data attributes on `<html>`.

Narrow down the default renderer's output targets without code (`<html>` data attributes):
```erb
<html
  data-flash-unified-container-first-only="true"
  data-flash-unified-container-sort-by-priority="true"
  data-flash-unified-container-visible-only="true">
```

Specifiable attributes (corresponding to collection options):
- `data-flash-unified-container-first-only` — limit to only the first item
- `data-flash-unified-container-sort-by-priority` — sort in ascending order by `data-flash-message-container-priority`
- `data-flash-unified-container-visible-only` — only visible containers
- `data-flash-unified-container-primary-only` — limit to elements with `data-flash-primary`

Value interpretation: Attribute presence (including empty value) / `true` / `1` is true, `false` / `0` is false. Unspecified remains at default value.

### Custom events

To use custom events, run `installCustomEventListener()` during initialization:
```js
import { installCustomEventListener } from "flash_unified";
installCustomEventListener();
```

Then dispatch the `flash-unified:messages` event to the document at any timing.
```js
// Example: passing as array
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: [
    { type: 'notice', message: 'Saved.' },
    { type: 'warning', message: 'Expires in one week.' }
  ]
}));

// Example: passing as object
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: { messages: [ { type: 'alert', message: 'Operation was cancelled.' } ] }
}));
```

### Turbo integration helpers (`flash_unified/turbo_helpers`)

When performing partial page updates using Turbo, rendering needs to be triggered by events indicating that partial updates have occurred. A helper is provided to register these event listeners in batch.

- `installTurboRenderListeners()` — register events for rendering according to Turbo's lifecycle.
- `installTurboIntegration()` — combines `installTurboRenderListeners()` and `installCustomEventListener()`, intended to be used from `auto.js`.
- `installNetworkErrorListeners()` — detect Turbo form submission errors/network errors and enable listener groups that add and render appropriate error messages.

```js
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
installTurboRenderListeners();
```

### Network/HTTP error helpers (`flash_unified/network_helpers`)

To use network/HTTP error helpers, do the following:
```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError(); // Set and render generic message for network errors
notifyHttpError(413); // Set and render message for specific HTTP status
```

- `notifyNetworkError()` — use generic network error text from `#general-error-messages` and render.
- `notifyHttpError(status)` — similarly use text for specific HTTP status and render.

The text used by these is a hidden element written out by the server-side view helper `flash_general_error_messages`, and the source text is placed as I18n translation files in `config/locales/http_status_messages.*.yml`.

If you want to customize the default translation content, copy the translation files to your host app with the following command and edit them:
```bash
bin/rails generate flash_unified:install --locales
```

### Auto initialization entry (`flash_unified/auto`)

Importing `flash_unified/auto` automatically executes Turbo integration initialization after DOM readiness. Behavior at that time can be controlled by `<html>` data attributes:

- `data-flash-unified-auto-init="false"` — disable automatic initialization
- `data-flash-unified-enable-network-errors="true"` — also enable listeners for network/HTTP errors

```erb
<html data-flash-unified-enable-network-errors="true">
```
