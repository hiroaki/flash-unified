# FlashUnified

FlashUnified provides a unified Flash message rendering mechanism for Rails applications that can be used from both server-side and client-side code.

Server-side view helpers embed Flash messages as data in the page, and lightweight client-side JavaScript reads and displays them.

## Current status

This project is positioned as an alpha version through v1.0.0. Public APIs are not stable and may change in the next release.

## Motivation

There were two challenges simultaneously.

One was wanting to display client-side originated messages using the same UI representation as server-side Flash. For example, when a large request is blocked by a proxy, we want to display the 413 error as a Flash message. This must be handled on the client side because the request does not reach the Rails server, but we want to display it using the same Flash UI logic.

The other was wanting to display Flash messages from Turbo Frames. If displaying Flash inside the frame, there's no problem, but in most cases it would be displayed outside the frame.

## How it works

The key point to solving these challenges is that rendering must be done on the JavaScript side. So we designed a two-stage process where responsibilities are divided between server and client:

1. On the server, the Flash object is embedded in the page as hidden DOM elements, and the page is rendered and returned.
2. The client-side JavaScript detects page changes, scans those elements, reads the embedded messages, formats them with templates, and inserts (renders) them into the specified container element. At that time, the message elements are removed from the DOM to avoid duplicate displays.

The mechanism is simple this way; implementing it only requires deciding the rules for how to embed. This gem defines the embedding DOM structure and calls it "storage":

```erb
<div data-flash-storage style="display: none;">
  <ul>
    <% flash.each do |type, message| %>
      <li data-type="<%= type %>"><%= message %></li>
    <% end %>
  </ul>
</div>
```

Since storage is a hidden element, it can be placed anywhere in the page that the server renders. For Turbo Frames, place it inside the frame.

The "container" where Flash messages are displayed, and the "templates" for formatting, are placed anywhere independent of storage. This means even for Turbo Frames, it functions for Flash display areas placed outside the frame.

When handling cases like a proxy returning an error during form submission on the client side, rather than displaying the error message directly from JavaScript, by embedding the message first as a storage element, you can render Flash in the same way (using the same templates and same processing flow).

On the other hand, in controllers setting Flash, the procedure is no different from normal Flash message display:

```ruby
if @user.save
  redirect_to @user, notice: "Created successfully."
else
  flash.now[:alert] = "Could not create."
  render :new, status: :unprocessable_content
end
```

In other words, when introducing this gem, no changes are needed to current controllers. Also, there's almost no need to change conventional page layouts. The DOM elements to set in views are hidden elements, and you'll probably only need to slightly adjust the container area for displaying Flash messages.

What mainly needs to be implemented when introducing this gem is the timing for displaying embedded data as Flash messages. Normally events would be used. Specific processing is left to the implementer, but helpers for automatically setting up events are also provided. You can also explicitly call methods for display within arbitrary processing.

## Main features

What this gem provides is organizing the mechanism according to defined rules and utility classes to support the implementation.

Server-side:
- Several view helpers. These render elements such as:
  - Hidden elements (storage) to embed for temporarily saving messages in the page
  - Templates for the elements to actually display
  - Container elements to indicate where templates should be inserted
- Localized messages for HTTP status for advanced functionality

Client-side:
- Minimal library in `flash_unified.js`
- `auto.js` helper for automatic initialization (optional)
- `turbo_helpers.js` helper for Turbo integration (optional)
- `network_helpers.js` helper for displaying network/HTTP errors (optional)

Generator:
- Installation generator for placing each of the above files

## Installation

Add the following to your application's `Gemfile`:

```ruby
gem 'flash_unified'
```

Then run:

```bash
bundle install
```

## Setup (client-side)

### 1. File placement (only when customization is needed)

This gem provides JavaScript, templates and translation files from within the engine. Only if you want to customize them, copy the relevant files with the generator and edit them. Details are described later.

### 2. Installing the JavaScript library

**For Importmap (Quick start)**

Pin the bundled entry in `config/importmap.rb`:

```ruby
pin "flash_unified/all", to: "flash_unified/all.bundle.js"
```

Then import it once from your JavaScript entry point (for example `app/javascript/application.js`):

```js
import "flash_unified/all";
```

This single import installs the default Turbo wiring and renders embedded messages automatically. Control the behavior via `<html>` attributes when needed:

- `data-flash-unified-auto-init="false"` disables the automatic wiring.
- `data-flash-unified-enable-network-errors="true"` enables network error listeners.

**Advanced (Importmap)**

If you need more granular control (for example customizing build pipelines or opting out of auto initialization), you can still pin individual modules:

```ruby
pin "flash_unified", to: "flash_unified/flash_unified.js"
pin "flash_unified/auto", to: "flash_unified/auto.js"
pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"
```

Import whichever modules you need. The API surface remains unchanged.

**For asset pipeline (Propshaft / Sprockets)**

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

If you need direct access to individual modules, add them to the inline import map similarly.

### 3. JavaScript initialization processing

When using the bundled entry (`flash_unified/all`), initialization is automatic. If you import individual modules instead, follow the guidance below.

**Semi-automatic control (Turbo events are set automatically)**

When using `turbo_helpers.js`, it's similar, but initialization processing is not executed automatically. Execute each method from the loaded module as follows:
```js
import { installInitialRenderListener } from "flash_unified";
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";

installTurboRenderListeners();
installInitialRenderListener();
```

This renders Flash messages when page changes (Turbo events) are detected.

**Manual control (when implementing event handlers yourself)**

If you want to control everything including event registration yourself, load the core library and implement processing to render using its methods.

At minimum, normally when the page loads (initial display), you'll call `renderFlashMessages()` to process messages that the server side may have embedded in the page. This is provided as `installInitialRenderListener()` since it's a standard procedure:

```js
import { installInitialRenderListener } from "flash_unified";
installInitialRenderListener();
```

To process elements (storage) with Flash messages embedded by the server side, call rendering processing at appropriate times. Probably you'll write calls to `renderFlashMessages()` inside some event handlers:

```js
renderFlashMessages();
```

## Setup (server-side)

### 1. Placing message sources

Place elements that serve as sources for JavaScript to assemble Flash message elements in a global position. Since these are hidden elements, they can be placed anywhere, but placing them right after `<body>` is sufficient:
```erb
<body>
  <%= flash_unified_sources %>
```

For Turbo Frame responses, place the following helper inside the frame:
```erb
<turbo-frame id="foo">
  <%= flash_storage %>
```

And place the container where you want to display Flash messages:
```erb
<div class="notify">
  <%= flash_container %>
```

Multiple containers can be placed, but by default the same messages are inserted into all containers. If you want to control this, see the "Container selection" section described later.

#### Helper list (reference)

View helpers used on the server side render DOM fragments (templates, storage, containers, etc.) in the structure expected by the client.

- `flash_global_storage` General-purpose storage element placed globally (note: contains `id="flash-storage"`).
- `flash_storage` Storage element. Include in content to be rewritten.
- `flash_templates` Templates `<template>` used by the client for display elements.
- `flash_container` Container element placed as a target at the position to actually show to users.
- `flash_general_error_messages` Element that defines messages for HTTP status.

Among these, everything except `flash_container` is fixed, so there's a wrapper helper to output them together.

- `flash_unified_sources` Complete set of "sources" for assembling Flash messages. Hidden elements.

### 2. Customizing templates

If you want to customize the appearance and markup of Flash elements, first copy the templates to the host app with the following command:

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

Template IDs like `flash-message-template-notice` correspond to Flash "type" (e.g. `:notice`, `:alert`, `:warning`). The client selects the corresponding template by referencing the type included in the message.

The client inserts the message string into the `.flash-message-text` element within the template. There are no other restrictions. Feel free to express as needed, such as adding additional elements (for example a dismiss button).

## JavaScript API and extensions

The JavaScript is split into a core library and optional helpers. You can choose and use only what you need.

### Core (`flash_unified`)

- `renderFlashMessages()` — Scans storage, renders to containers, and removes storage.
- `setFlashMessageRenderer(fn | null)` — Replaces the default DOM rendering processing with an arbitrary renderer function. Resets to default with `null`.
- `appendMessageToStorage(message, type = 'notice')` — Appends a message to global storage.
- `clearFlashMessages(message?)` — Removes all rendered Flash messages, or only those matching exactly.
- `processMessagePayload(payload)` — Receives `{ type, message }[]` or `{ messages: [...] }`, appends and renders.
- `installCustomEventListener()` — Subscribes to `flash-unified:messages` and processes payloads.
- `installInitialRenderListener()` — Calls `renderFlashMessages()` only once during initial display (after DOM is ready).
- `storageHasMessages()` — Utility to determine if there are existing messages in storage.
- `startMutationObserver()` — (Optional: experimental) Monitors insertion of storage/templates and renders.
- `consumeFlashMessages(keep = false)` — Scans all storage embedded in the current page and returns a message array ({ type, message }[]). By default performs destructive operation removing storage elements, but passing `keep = true` leaves storage and only retrieves.
- `aggregateFlashMessages()` — Thin wrapper for `consumeFlashMessages(true)` that non-destructively scans storage and returns message array.
- `getFlashMessageContainers(options = {})` — Collects candidate container elements. For details see "Container selection" described later.
- `getHtmlContainerOptions()` — Reads container selection options (firstOnly/sortByPriority/visibleOnly/primaryOnly) from `<html>` data attributes (used by default renderer).

To display a Flash message generated within the client at any timing, embed the message first then perform rendering processing:

```js
import { appendMessageToStorage, renderFlashMessages } from "flash_unified";

appendMessageToStorage("File size is too large.", "notice");
renderFlashMessages();
```

If you want to pass server-embedded messages to an external library like toast rather than rendering on the page, you can retrieve messages using `consumeFlashMessages()` and pass them to the notification library:

```js
import { consumeFlashMessages } from "flash_unified";

document.addEventListener('turbo:load', () => {
  const msgs = consumeFlashMessages();
  msgs.forEach(({ type, message }) => {
    YourNotifier[type](message); // Like toastr.info(message)
  });
});
```

However, for cases where you consistently use an external library overall, rather than implementing for each event handler, it's better to register a custom renderer with `setFlashMessageRenderer()` and replace the default rendering processing itself.

### Custom renderer (setFlashMessageRenderer)

The default `renderFlashMessages()` inserts DOM using templates into `[data-flash-message-container]` for display, but you can replace this processing with an arbitrary renderer function. For example, you can integrate with third-party notification libraries like Notyf.

An array of `{ type, message }[]` is passed as an argument to the function you set.

Passing `null` instead of a function returns to the default renderer.

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

Important note when using `auto.js`: To use a custom renderer for the initial rendering, register the custom renderer before `import "flash_unified/auto"`.

Layout example for Importmap/asset pipeline (order is important — register first, then load auto):

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

Or you can disable auto and manually initialize:

```erb
<html data-flash-unified-auto-init="false">
  ...
  <script type="module">
    import { setFlashMessageRenderer, installInitialRenderListener } from "flash_unified";
    setFlashMessageRenderer((msgs) => { /* custom */ });
    installInitialRenderListener(); // Or call renderFlashMessages() at appropriate times
  </script>
</html>
```

Note: If you register a custom renderer after initial rendering, it will be reflected from the next rendering onward. To avoid mixed behavior, we recommend registering before initial rendering (or disabling auto and implementing rendering processing manually).

### Container selection

By default, Flash messages formatted with templates are inserted into all container elements (`[data-flash-message-container]`), even when there are multiple containers. To narrow down to specific containers, create a custom renderer or set HTML data attributes.

#### Creating a custom renderer

When setting a custom renderer, you don't need to follow container conventions and can freely retrieve container elements and insert Flash messages. If you want to narrow down while following existing conventions, you can also collect and select candidates using the optional utility `getFlashMessageContainers()`.

Main options for `getFlashMessageContainers(options)`:
- `primaryOnly?: boolean` — Narrow down to only elements with `data-flash-primary` (excludes "false")
- `visibleOnly?: boolean` — Narrow down to only displayed elements (simple determination by display/visibility/opacity)
- `sortByPriority?: boolean` — Sort in ascending order by `data-flash-message-container-priority` numeric value (treats unspecified as Infinity)
- `firstOnly?: boolean` — Return only the first item after filtering/sorting
- `filter?: (el) => boolean` — Apply additional filtering predicate

Example) Render to only one container with high priority that is displayed:

```js
import { setFlashMessageRenderer, getFlashMessageContainers } from "flash_unified";

setFlashMessageRenderer((messages) => {
  const container = getFlashMessageContainers({ sortByPriority: true, visibleOnly: true, firstOnly: true })[0];
  if (!container) return;
  messages.forEach(({ type, message }) => {
    if (!message) return;
    // Reuse default template node creation logic / implement your own, etc., as you prefer.
  });
});
```

#### Guiding the default renderer with HTML data attributes

Without creating a custom renderer, you can instruct first-only / priority / visible / primary selection rules with data attributes on `<html>`.

Narrowing down default renderer output destination without code (data attributes on `<html>`):

```erb
<html
  data-flash-unified-container-first-only="true"
  data-flash-unified-container-sort-by-priority="true"
  data-flash-unified-container-visible-only="true">
```

Specifiable attributes (correspond to collection options):

- `data-flash-unified-container-first-only` — Limit to only the first item
- `data-flash-unified-container-sort-by-priority` — Sort in ascending order by `data-flash-message-container-priority`
- `data-flash-unified-container-visible-only` — Only displayed containers
- `data-flash-unified-container-primary-only` — Limit to elements with `data-flash-primary`

Value interpretation: Attribute presence (including empty value)/`true`/`1` is true, `false`/`0` is false. Unspecified leaves default values.

### Custom events

When using custom events, execute `installCustomEventListener()` during initialization:

```js
import { installCustomEventListener } from "flash_unified";
installCustomEventListener();
```

Then dispatch `flash-unified:messages` events to the document at any timing.

```js
// Example: passing as array
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: [
    { type: 'notice', message: 'Sent.' },
    { type: 'warning', message: 'Expiration is one week.' }
  ]
}));

// Example: passing as object
document.dispatchEvent(new CustomEvent('flash-unified:messages', {
  detail: { messages: [ { type: 'alert', message: 'Operation was cancelled.' } ] }
}));
```

### Turbo integration helpers (`flash_unified/turbo_helpers`)

When using Turbo to perform partial page updates, you need to perform rendering processing triggered by events of those partial updates occurring, and helpers for collectively registering those event listeners are provided.

- `installTurboRenderListeners()` — Registers events for rendering according to Turbo lifecycle.
- `installTurboIntegration()` — Intended to be used from `auto.js`, combines `installTurboRenderListeners()` and `installCustomEventListener()`.
- `installNetworkErrorListeners()` — Enables listener groups that detect Turbo form submission errors/network errors and add and render appropriate error messages.

```js
import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
installTurboRenderListeners();
```

### Network/HTTP error helpers (`flash_unified/network_helpers`)

When using network/HTTP error helpers, do the following:
```js
import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";

notifyNetworkError(); // Set and render generic message for network errors
notifyHttpError(413); // Set and render message by HTTP status
```

- `notifyNetworkError()` — Renders using generic network error text from `#general-error-messages`.
- `notifyHttpError(status)` — Similarly renders using text by HTTP status.

The text used for these is hidden elements written out by the server-side view helper `flash_general_error_messages`, and the original text is placed as I18n translation files in `config/locales/http_status_messages.*.yml`.

If you want to customize the default translation content, copy the translation files to the host app with the following command and edit:

```bash
bin/rails generate flash_unified:install --locales
```

### Auto initialization entry (`flash_unified/auto`)

Importing `flash_unified/auto` automatically executes Turbo integration initialization after DOM is ready. The behavior at that time can be controlled with data attributes on the `<html>` element:

- `data-flash-unified-auto-init="false"` — Disables automatic initialization.
- `data-flash-unified-enable-network-errors="true"` — Also enables listeners for network/HTTP errors.

```erb
<html data-flash-unified-enable-network-errors="true">
```

## Development

For detailed development and test procedures, see [DEVELOPMENT.md](DEVELOPMENT.md) (English) or [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) (Japanese).

## Changelog

See the [GitHub Releases page](https://github.com/hiroaki/flash-unified/releases).

## License

This project is released under the 0BSD (Zero-Clause BSD) license. See `LICENSE` for details.
