require "rails/generators"
require "rails/generators/base"

module FlashUnified
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc "Copies FlashUnified javascript, view partials, locales and prints importmap instructions."

      class_option :force, type: :boolean, default: false, desc: "Overwrite existing files"

      def copy_javascript
        say_status :copy, "app/javascript/flash_unified"
        source = File.expand_path(
          File.join("..", "..", "..", "..", "app", "javascript", "flash_unified"),
          __dir__
        )
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

          What this generator installs
          - JavaScript client: copied into `app/javascript/flash_unified` (skips unless `--force`).
          - View partials: copied into `app/views/flash_unified` (skips unless `--force`).
            - Core: `_templates.html.erb`, `_storage.html.erb`, `_global_storage.html.erb`, `_container.html.erb`, `_general_error_messages.html.erb`
          - Locale files: any `config/locales/*.yml` from the gem are copied into your app's `config/locales` (skips unless `--force`).

          Importing the JavaScript
          - Importmap: add to `config/importmap.rb`:

              pin "flash_unified", to: "flash_unified/flash_unified.js"

            then initialize it in your JavaScript entrypoint (idempotent):

              import { initializeFlashMessageSystem } from "flash_unified";
              addEventListener('DOMContentLoaded', () => initializeFlashMessageSystem());
              addEventListener('turbo:load', () => initializeFlashMessageSystem());

          - Propshaft/Sprockets: the engine adds its `app/javascript` to the asset paths so you can include the script with:

              <%= javascript_include_tag "flash_unified/flash_unified" %>

          How to place partials in your layout
          - The gem's view helpers render engine partials. After running this generator you'll have the partials available under `app/views/flash_unified` and can customize them as needed.

          Recommended layout snippet (inside `<body>`):

            <%= flash_global_storage %>
            <%= flash_container %>
            <%= flash_templates %>
            <%= flash_general_error_messages %>

          Notes
          - The client JS expects a storage element with `id="flash-storage"` (the `_global_storage.html.erb` partial provides this). Do not rename this id unless you update the client code.
          - Locale files are only copied if they do not already exist in the host app; with `--force` existing files are overwritten.

        MSG

        say message
      end
    end
  end
end
