require "rails/generators"
require "rails/generators/base"

module FlashUnified
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc "Copies FlashUnified javascript and view partials to your host app and prints importmap instructions."

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
        FileUtils.cp_r(File.join(source, "."), "app/javascript/flash_unified")
      end

      # View partials are intentionally NOT copied by default. The helper
      # `flash_container` renders the storage element for you and the engine
      # provides the canonical partials. If you explicitly want to copy the
      # partials into your host app for customization, run the generator with
      # `--views` which will copy them into `app/views/flash_unified/`.
      def copy_view_partials
        source_dir = File.expand_path(File.join("..", "..", "..", "..", "app", "views", "flash_unified"), __dir__)
        unless File.directory?(source_dir)
          say_status :error, "could not find source views directory: #{source_dir}", :red
          return
        end

        target_dir = "app/views/flash_unified"
        FileUtils.mkdir_p(target_dir) unless Dir.exist?(target_dir)

        # Copy templates, storage, global storage, container and general error
        # message partials by default so host apps always have the canonical
        # markup available to customize.
        %w[_templates.html.erb _storage.html.erb _container.html.erb _global_storage.html.erb _general_error_messages.html.erb].each do |fname|
          src = File.join(source_dir, fname)
          dst = File.join(target_dir, fname)
          if File.exist?(dst)
            say_status :skip, dst
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
            say_status :skip, dst
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
          - JavaScript client: copied into `app/javascript/flash_unified`.
          - View partials: `_templates.html.erb`, `_storage.html.erb`, `_global_storage.html.erb`, `_container.html.erb`, and `_general_error_messages.html.erb` are copied into `app/views/flash_unified`.
          - Locale files: any `config/locales/*.yml` from the gem are copied into your app's `config/locales` (existing files are skipped).

          Importing the JavaScript
          - Importmap: add to `config/importmap.rb`:

              pin "flash_unified", to: "flash_unified/flash_unified.js"

            then import it in your JavaScript entrypoint:

              import "flash_unified"

          - Propshaft/Sprockets: the engine adds its `app/javascript` to the asset paths so you can include the script with:

              <%= javascript_include_tag "flash_unified/flash_unified" %>

          How to place partials in your layout
          - The gem's view helpers render engine partials. After running this
            generator you'll have the partials available under
            `app/views/flash_unified` and can customize them as needed.

          Recommended layout snippet (inside `<body>`):

            <%= flash_global_storage %>
            <%= flash_container %>
            <%= flash_templates %>
            <%= flash_general_error_messages %>

          Notes
          - The client JS expects a storage element with `id="flash-storage"` (the `_global_storage.html.erb` partial provides this). Do not rename this id unless you update the client code.
          - Locale files are only copied if they do not already exist in the host app; if you want to overwrite, edit the files in your host app's `config/locales`.

        MSG

        say message
      end
    end
  end
end
