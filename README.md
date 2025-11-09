# FlashUnified

FlashUnified provides a unified Flash message rendering mechanism for Rails applications that can be used from both server-side and client-side code.

Server-side view helpers embed Flash messages as data in the page, and a lightweight client-side JavaScript library reads those storage elements and renders messages into visible containers using templates.

## Current status

This project is considered alpha through v1.0.0. Public APIs are not yet stable and may change in future releases.

## Motivation

We had two challenges at the same time.

One was to display messages originating from the client-side with the same UI representation as Flash from the server-side. For example, when a large request is blocked by a proxy, we want to display a 413 error as a Flash message. Since the request never reaches the Rails server, this must be handled on the client-side, but we want to display it with the same UI logic as normal Flash.

The other was to display Flash messages from Turbo Frames as well. It's not a problem if Flash is displayed within the frame, but in most cases it will be displayed outside the frame.

## How it works

The key point to solving these challenges is that rendering needs to be performed on the JavaScript side. Therefore, we devised a two-stage process that divides responsibilities between the server-side and client-side:

1. The server embeds the Flash object as a hidden DOM element within the page, renders the page, and returns it.
2. When the client-side JavaScript detects a page change, it scans those elements, reads the embedded messages, formats them using templates, and inserts (renders) them into the specified container elements. At that time, message elements are removed from the DOM to avoid duplicate displays.

The mechanism is simple; to implement it, we only need to define the rules for embedding. In this gem, we define the embedded DOM structure below and refer to it as a "storage element":
```erb
<div data-flash-storage style="display: none;">
  <ul>
    <% flash.each do |type, message| %>
      <li data-type="<%= type %>"><%= message %></li>
    <% end %>
  </ul>
</div>
```

Since a storage element is hidden, it can be placed anywhere in the page rendered by the server. For Turbo Frames, place a storage element inside the frame.

The "container" where Flash messages are displayed and the "templates" for formatting can be placed anywhere, regardless of the storage element. This means that even with Turbo Frames, it works with Flash rendering areas placed outside the frame.

When handling cases on the client-side where a proxy returns an error when a form is submitted, instead of displaying the error message directly from JavaScript, you can render Flash in the same way (using the same templates and processing flow) by temporarily embedding the message as a storage element.

On the other hand, in controllers that set Flash, there is no difference from the normal Flash message display procedure:
```ruby
if @user.save
  redirect_to @user, notice: "Created successfully."
else
  flash.now[:alert] = "Could not create."
  render :new, status: :unprocessable_content
end
```

In other words, when introducing this gem, **no changes are required to existing controllers**. Also, there is almost no need to change existing page layouts. The DOM elements to be set in views are hidden elements, and you only need to slightly adjust the container area where Flash messages are displayed.

The main thing to implement when introducing this gem is the timing to display embedded data as Flash messages. Normally, you will use events. While the specific implementation is left to the implementer, helpers are provided to automatically set up events. You can also explicitly call methods for display within arbitrary processes.

## Quick Start

### 1. Installation

When using Bundler, add the gem entry to your Gemfile:
```ruby
gem 'flash_unified'
```

Run the command:
```bash
bundle install
```

Or install it directly:
```bash
gem install flash_unified
```

### 2. Client-side setup (Importmap)

Add to `config/importmap.rb`:
```ruby
pin "flash_unified/all", to: "flash_unified/all.bundle.js"
```

Import in your JavaScript entry point (e.g., `app/javascript/application.js`):
```javascript
import "flash_unified/all";
```

### 3. Server-side setup

Place the "sources" helper right after `<body>` in your layout. This emits hidden elements and therefore does not affect your layout:
```erb
<body>
  <%= flash_unified_sources %>
  ...
```

Place the "container" helper at the location where you want to display messages:
```erb
<div class="notify">
  <%= flash_container %>
  ...
```

When using Turbo, you need to place storage elements (hidden elements) within the content that updates.

**Turbo Frame**

Place a storage element inside the frame:
```erb
<turbo-frame id="foo">
  <%= flash_storage %>
```

**Turbo Stream**

Add a stream to append a storage element to the global storage:
```erb
<%= flash_turbo_stream %>
```


Or in a controller:
```ruby
render turbo_stream: helpers.flash_turbo_stream
```

That's it. Event handlers that monitor page changes will scan storage elements and render messages into containers.

## Detailed usage

For customization options, API references, Turbo/network helpers, templates, locales, generators, and more, see [`ADVANCED.md`](ADVANCED.md). Examples for using asset pipelines like Sprockets are also provided.

## Development

For detailed development and testing procedures, see [`DEVELOPMENT.md`](DEVELOPMENT.md).

## Changelog

See the [GitHub Releases page](https://github.com/hiroaki/flash-unified/releases).

## License

This project is released under the 0BSD (Zero-Clause BSD) license. For details, see [LICENSE](LICENSE).
