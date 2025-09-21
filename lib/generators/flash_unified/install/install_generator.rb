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

        unless File.directory?(source)
          say_status :error, "could not find source javascript directory: #{source}", :red
          return
        end
        FileUtils.mkdir_p("app/javascript") unless Dir.exist?("app/javascript")
        target = "app/javascript/flash_unified"
        if Dir.exist?(target)
          if options[:force]
            FileUtils.rm_rf(target)
            FileUtils.cp_r(File.join(source, "."), target)
            say_status :overwrite, target
          else
            say_status :skip, target
          end
        else
          FileUtils.cp_r(File.join(source, "."), target)
          say_status :create, target
        end
      end

      # View partials are copied into your host app so you can customize them.
      def copy_view_partials
        source_dir = File.expand_path(File.join("..", "..", "..", "..", "app", "views", "flash_unified"), __dir__)
        unless File.directory?(source_dir)
          say_status :error, "could not find source views directory: #{source_dir}", :red
          return
        end

        target_dir = "app/views/flash_unified"
        FileUtils.mkdir_p(target_dir) unless Dir.exist?(target_dir)

        # Copy templates, storage, global storage, container, general error
        # messages, and optional JSON/dispatch samples so host apps always have
        # the canonical markup available to customize.
        %w[
          _templates.html.erb
          _storage.html.erb
          _global_storage.html.erb
          _container.html.erb
          _general_error_messages.html.erb
          _storage_json.html.erb
          _dispatch_event.html.erb
        ].each do |fname|
          src = File.join(source_dir, fname)
          dst = File.join(target_dir, fname)
          if File.exist?(dst)
            if options[:force]
              FileUtils.cp(src, dst)
              say_status :overwrite, dst
            else
              say_status :skip, dst
            end
          else
            FileUtils.cp(src, dst)
            say_status :create, dst
          end
        end
      end

      def copy_locales
        source_dir = File.expand_path(File.join("..", "..", "..", "..", "config", "locales"), __dir__)
        return unless File.directory?(source_dir)

        target_dir = "config/locales"
        FileUtils.mkdir_p(target_dir) unless Dir.exist?(target_dir)

        Dir.glob(File.join(source_dir, "*.yml")).each do |src|
          dst = File.join(target_dir, File.basename(src))
          if File.exist?(dst)
            if options[:force]
              FileUtils.cp(src, dst)
              say_status :overwrite, dst
            else
              say_status :skip, dst
            end
          else
            FileUtils.cp(src, dst)
            say_status :create, dst
          end
        end
      end

      def show_importmap_instructions
        message = <<~MSG

          === FlashUnified installation instructions ===

          What this generator installs
          - JavaScript client: copied into `app/javascript/flash_unified` (skips unless `--force`).
          - View partials: copied into `app/views/flash_unified` (skips unless `--force`).
            - Core: `_templates.html.erb`, `_storage.html.erb`, `_global_storage.html.erb`, `_container.html.erb`, `_general_error_messages.html.erb`
            - Optional samples: `_storage_json.html.erb`, `_dispatch_event.html.erb`
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
          - Optional JSON + CustomEvent:
            - `<%= flash_storage_json %>` outputs messages as `script[type="application/json"][data-flash-unified]`.
            - `<%= flash_dispatch_event(payload: [...]) %>` dispatches the `flash-unified:messages` event inline (be mindful of CSP; a nonce is attached automatically when available).
            - To avoid inline scripts, enable `enableMutationObserver()` on the client.
          - Locale files are only copied if they do not already exist in the host app; with `--force` existing files are overwritten.

        MSG

        say message
      end
    end
  end
end
