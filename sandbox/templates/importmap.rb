# Rails application template for importmap-based sandbox wiring
# Docs: https://guides.rubyonrails.org/rails_application_templates.html
# Note: Rails 8+ app template DSL does not include `gemfile`.
# We assume `--javascript=importmap` (default) so `importmap-rails` is already present.

after_bundle do
  # Ensure importmap is installed and application.js exists
  js_entry = 'app/javascript/application.js'
  unless File.exist?(js_entry)
    begin
      rails_command 'importmap:install'
    rescue StandardError
      # continue; we'll create minimal files below if still missing
    end
  end

  # Ensure app/javascript/application.js exists
  unless File.exist?(js_entry)
    empty_directory File.dirname(js_entry)
    create_file js_entry, <<~JS
      // Entry point for the application
    JS
  end

  # Ensure config/importmap.rb exists
  importmap_file = 'config/importmap.rb'
  unless File.exist?(importmap_file)
    create_file importmap_file, "pin \"application\"\n"
  end

  # Pin the module (insert after application pin if present, otherwise append)
  pin_snippet = "\n# flash_unified\npin \"flash_unified\", to: \"flash_unified/flash_unified.js\"\n"
  content = File.read(importmap_file)
  unless content.include?('pin "flash_unified"')
    if content =~ /pin \"application\".*\n/
      insert_into_file importmap_file, pin_snippet, after: /pin \"application\".*\n/
    else
      append_to_file importmap_file, pin_snippet
    end
  end

  # Initialize from application.js (idempotent)
  init_snippet = <<~JS

    import { initializeFlashMessageSystem } from "flash_unified";
    addEventListener('DOMContentLoaded', () => initializeFlashMessageSystem());
    addEventListener('turbo:load', () => initializeFlashMessageSystem());
  JS
  app_js_content = File.read(js_entry)
  unless app_js_content.include?('initializeFlashMessageSystem')
    append_to_file js_entry, init_snippet
  end

  # Add helpers to layout body (avoid duplicates) — keep storage/templates here, not the container
  layout_file = 'app/views/layouts/application.html.erb'
  helper_block = <<~ERB
    <%= flash_general_error_messages %>
    <%= flash_global_storage %>
    <%= flash_templates %>

    <%= flash_storage %>
  ERB

  if File.exist?(layout_file)
    content = File.read(layout_file)
    unless content.include?('flash_global_storage')
      if content =~ /<body[^>]*>/
        gsub_file layout_file, /(\s*<body[^>]*>)/ do |match|
          match + "\n" + helper_block
        end
      else
        append_to_file layout_file, "\n<body>\n" + helper_block + "</body>\n"
      end
    end
  end

  # Optionally generate a Memo scaffold and migrate
  if ENV['FLASH_UNIFIED_SCAFFOLD'] == '1'
    generate 'scaffold', 'Memo', 'title:string', 'description:text'
    rails_command 'db:migrate'

    # Replace scaffold inline notices with a green-styled container and remove alerts
    files = Dir.glob('app/views/**/*.erb')
    files.uniq.each do |file|
      next unless File.exist?(file)

      # <p ...><%= notice %></p> -> <div style="color: green"><%= flash_container %></div>
      gsub_file file, /<p[^>]*>\s*<%=\s*notice\s*%>\s*<\/p>\s*\n?/m, "<div style=\"color: green\"><%= flash_container %></div>\n"
      # bare <%= notice %> on its own line -> same green container
      gsub_file file, /^\s*<%=\s*notice\s*%>\s*$\n?/, "<div style=\"color: green\"><%= flash_container %></div>\n"

      # <p ...><%= alert %></p> -> <div style="color: green"><%= flash_container %></div>
      gsub_file file, /<p[^>]*>\s*<%=\s*alert\s*%>\s*<\/p>\s*\n?/m, "<div style=\"color: green\"><%= flash_container %></div>\n"
      # bare <%= alert %> on its own line -> same green container
      gsub_file file, /^\s*<%=\s*alert\s*%>\s*$\n?/, "<div style=\"color: green\"><%= flash_container %></div>\n"
    end
  end

  say "Sandbox wiring for flash_unified completed.", :green
end
