require "rails/generators"
require "rails/generators/base"

module FlashUnified
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc "Copies FlashUnified javascript, view partials, locales and prints setup instructions (Importmap / asset pipeline)."

      class_option :force, type: :boolean, default: false, desc: "Overwrite existing files"

      def copy_javascript
        say_status :copy, "app/javascript/flash_unified"
        installer = FlashUnified::Installer.new(source_root: File.expand_path('../../../../', __dir__), target_root: Dir.pwd, force: options[:force])
        result = installer.copy_javascript
        case result
        when :created
          say_status :create, "app/javascript/flash_unified"
        when :overwritten
          say_status :overwrite, "app/javascript/flash_unified"
        else
          say_status :skip, "app/javascript/flash_unified"
        end
      end

      # View partials are copied into your host app so you can customize them.
      def copy_view_partials
        say_status :copy, "app/views/flash_unified"
        installer = FlashUnified::Installer.new(source_root: File.expand_path('../../../../', __dir__), target_root: Dir.pwd, force: options[:force])
        installer.copy_views
        say_status :create, "app/views/flash_unified"
      end

      def copy_locales
        say_status :copy, "config/locales"
        installer = FlashUnified::Installer.new(source_root: File.expand_path('../../../../', __dir__), target_root: Dir.pwd, force: options[:force])
        installer.copy_locales
        say_status :create, "config/locales"
      end

      def show_importmap_instructions
        message = <<~MSG

          === FlashUnified installation instructions ===

          Importing the JavaScript
          - Importmap: add to `config/importmap.rb`:

              pin "flash_unified", to: "flash_unified/flash_unified.js"
              pin "flash_unified/auto", to: "flash_unified/auto.js"
              pin "flash_unified/turbo_helpers", to: "flash_unified/turbo_helpers.js"
              pin "flash_unified/network_helpers", to: "flash_unified/network_helpers.js"

            Quick start (auto init):

              Importing `flash_unified/auto` sets up Turbo listeners and triggers an initial render.

              import "flash_unified/auto";
              // Configure via <html data-flash-unified-*>:
              //   data-flash-unified-auto-init="false" (opt-out)
              //   data-flash-unified-enable-network-errors="true" (install Turbo network error listeners)

            Manual control:

              import { renderFlashMessages, appendMessageToStorage } from "flash_unified";
              import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
              installTurboRenderListeners();

            Network helpers (optional, framework-agnostic):

              import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";
              // notifyNetworkError();
              // notifyHttpError(413);

          - Asset pipeline (Propshaft / Sprockets): the engine adds its `app/javascript` to the asset paths; add modulepreload links and an inline importmap in your layout's `<head>` and import the bare specifier.

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

              Remove the `import "flash_unified/auto";` line if you don't want automatic initialization.

          How to place partials in your layout
          - The gem's view helpers render engine partials. After running this generator you'll have the partials available under `app/views/flash_unified` and can customize them as needed.

          Recommended layout snippet (inside `<body>`, global helpers):

            <%= flash_general_error_messages %>
            <%= flash_global_storage %>
            <%= flash_templates %>

          Place the visible container wherever messages should appear:

            <%= flash_container %>

          Embed per-response storage inside content (e.g. Turbo Frame responses):

            <%= flash_storage %>

          Documentation
          - For full details and customization guidance, see README.md / README.ja.md in the gem.

        MSG

        say message
      end
    end
  end
end
