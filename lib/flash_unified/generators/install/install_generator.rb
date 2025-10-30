require "rails/generators"
require "rails/generators/base"

module FlashUnified
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc <<~DESC
        Copies FlashUnified javascript, view partials, locales and prints setup instructions (Importmap / asset pipeline).

        By default (no options), only templates and locales are copied.
        Use --all to copy all groups (javascript, templates, views, locales, helpers).
        Use --templates or --locales for fine-grained control.
      DESC

      class_option :force, type: :boolean, default: false, desc: "Overwrite existing files"
      class_option :all, type: :boolean, default: false, desc: "Install all files"
      class_option :templates, type: :boolean, default: false, desc: "Install only _templates.html.erb partial"
      class_option :views, type: :boolean, default: false, desc: "Install all view partials (views/flash_unified/*)"
      class_option :javascript, type: :boolean, default: false, desc: "Install only JavaScript files"
      class_option :locales, type: :boolean, default: false, desc: "Install only locale files"
      class_option :helpers, type: :boolean, default: false, desc: "Install only helper files"

      # Rails generator entrypoint (only task that performs copying)
      def install
        handle_installation
      end

      def show_importmap_instructions
        message = <<~MSG

          === FlashUnified installation instructions ===

          Quick start (Importmap)
          1) Add to `config/importmap.rb`:

              pin "flash_unified/all", to: "flash_unified/all.bundle.js"

          2) Import once in your JavaScript entry point (e.g. `app/javascript/application.js`):

              import "flash_unified/all";

          3) In your layout (inside `<body>`):

              <%= flash_unified_sources %>
              <%= flash_container %>

          Auto-initialization is enabled by default. Control it via `<html>` attributes:
            - `data-flash-unified-auto-init="false"` to disable all automatic wiring.
            - `data-flash-unified-enable-network-errors="true"` to enable network error listeners.

          Advanced usage (optional)
            Manual control:

              import { renderFlashMessages, appendMessageToStorage } from "flash_unified";
              import { installTurboRenderListeners } from "flash_unified/turbo_helpers";
              installTurboRenderListeners();

            Network helpers:

              import { notifyNetworkError, notifyHttpError } from "flash_unified/network_helpers";
              // notifyNetworkError();
              // notifyHttpError(413);

          Propshaft / Sprockets quick start
            Place in `<head>`:

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

            (Optionally map `flash_unified` or other modules if you need manual control APIs.)

          Layout helpers
            <%= flash_general_error_messages %>
            <%= flash_global_storage %>
            <%= flash_templates %>
            <%= flash_container %>
            <%= flash_storage %>

          Documentation
          - See README.md / README.ja.md for customization guidance and advanced scenarios.

        MSG

        say message
      end

      private

      no_tasks do
        # Print a clear start message so users see the generator run boundary.
        # Using `say_status :run` follows the Rails generator convention (colored label).
        # Print a start message once per generator run. An optional `note` will be
        # appended to the message to provide context (e.g. "copy javascript").
        def start_message(note = nil)
          return if @flash_unified_started
          message = "Installing FlashUnified"
          message += " — #{note}" if note
          say_status :run, message, :blue
          @flash_unified_started = true
        end

        # Resolve gem root robustly by walking up until we find the gemspec
        def gem_root
          return @gem_root if defined?(@gem_root)
          path = Pathname.new(__dir__)
          path.ascend do |p|
            if (p + 'flash_unified.gemspec').exist?
              @gem_root = p
              break
            end
          end
          @gem_root ||= Pathname.new(File.expand_path('../../../../', __dir__))
        end

        def installer
          @installer ||= FlashUnified::Installer.new(source_root: gem_root.to_s, target_root: destination_root, force: options[:force])
        end

        def handle_installation
          # Determine which groups to install
          groups = []
          groups << :javascript if options[:javascript]
          groups << :templates if options[:templates]
          groups << :views if options[:views]
          groups << :locales if options[:locales]
          groups << :helpers if options[:helpers]
          # If --all was provided, install every group. Otherwise, when no
          # explicit groups are requested, install a sensible minimal set:
          # templates + locales. This avoids unexpectedly copying JavaScript,
          # helpers or full view partial sets into the host app when the user
          # runs the generator without options.
          if options[:all]
            groups = [:javascript, :templates, :views, :locales, :helpers]
          elsif groups.empty?
            groups = [:templates, :locales]
          end

          groups.each do |group|
            send("copy_#{group}")
          end
        end

        def copy_javascript
          start_message("copy javascript")
          installer.copy_javascript do |status, path|
            say_status status, display_path(path)
          end
        end

        def copy_templates
          start_message("copy _templates.html.erb")
          installer.copy_templates do |status, path|
            say_status status, display_path(path)
          end
        end

        def copy_views
          start_message("copy all view partials")
          installer.copy_views do |status, path|
            say_status status, display_path(path)
          end
        end

        def copy_locales
          start_message("copy locales")
          installer.copy_locales do |status, path|
            say_status status, display_path(path)
          end
        end

        def copy_helpers
          start_message("copy helpers")
          installer.copy_helpers do |status, path|
            say_status status, display_path(path)
          end
        end
      end

      # Return a user-friendly path for display in generator output. If the
      # provided path is under the current working directory (Rails root), show
      # it as a relative path; otherwise show the original path.
      def display_path(path)
        path = Pathname.new(path.to_s)
        begin
          root = Pathname.new(Dir.pwd)
          relative = path.relative_path_from(root)
          relative.to_s
        rescue ArgumentError
          # Path not under Dir.pwd — fall back to full path
          path.to_s
        end
      end
    end
  end
end
