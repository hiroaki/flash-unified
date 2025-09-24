# Rails application template for propshaft-based sandbox wiring
# Docs: https://guides.rubyonrails.org/rails_application_templates.html
# Assumes Rails app created with `--asset-pipeline=propshaft` and without Importmap.

after_bundle do
  # Inject module script into application layout to import via asset pipeline
  layout_file = 'app/views/layouts/application.html.erb'
  module_script = <<~ERB
    <link rel="modulepreload" href="<%= asset_path('flash_unified/flash_unified.js') %>">
    <script type="module">
      import { initializeFlashMessageSystem } from "<%= asset_path('flash_unified/flash_unified.js') %>";
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFlashMessageSystem);
      } else {
        initializeFlashMessageSystem();
      }
    </script>
  ERB

  # Add helpers to layout body (avoid duplicates)
  helper_block = <<~ERB
    <%= flash_general_error_messages %>
    <%= flash_global_storage %>
    <%= flash_templates %>

    <%= flash_storage %>
  ERB

  if File.exist?(layout_file)
    content = File.read(layout_file)
    # Insert helpers once
    unless content.include?('flash_global_storage')
      if content =~ /<body[^>]*>/
        gsub_file layout_file, /(\s*<body[^>]*>)/ do |match|
          match + "\n" + helper_block
        end
      else
        append_to_file layout_file, "\n<body>\n" + helper_block + "</body>\n"
      end
    end
    # Insert module script once (prefer inside <head>)
    unless File.read(layout_file).include?('initializeFlashMessageSystem')
      head_content = File.read(layout_file)
      if head_content =~ /<\/head>/
        gsub_file layout_file, /<\/head>/, module_script + "\n</head>"
      elsif head_content =~ /<head[^>]*>/
        gsub_file layout_file, /(<head[^>]*>)/ do |match|
          match + "\n" + module_script
        end
      elsif head_content =~ /<body[^>]*>/
        # Fallback: insert at the start of <body>
        gsub_file layout_file, /(\s*<body[^>]*>)/ do |match|
          match + "\n" + module_script
        end
      else
        # Last resort: append to file
        append_to_file layout_file, module_script
      end
    end
  end

  # Optional scaffold
  if ENV['FLASH_UNIFIED_SCAFFOLD'] == '1'
    generate 'scaffold', 'Memo', 'title:string', 'description:text'
    rails_command 'db:migrate'

    files = Dir.glob('app/views/**/*.erb')
    files.uniq.each do |file|
      next unless File.exist?(file)

      content = File.read(file)

      rx_notice_p = /<p[^>]*>\s*<%=\s*notice\s*%>\s*<\/p>\s*\n?/m
      if content.match?(rx_notice_p)
        gsub_file file, rx_notice_p, "<div style=\"color: green\"><%= flash_container %></div>\n"
      end
      rx_notice_bare = /^\s*<%=\s*notice\s*%>\s*$\n?/
      if content.match?(rx_notice_bare)
        gsub_file file, rx_notice_bare, "<div style=\"color: green\"><%= flash_container %></div>\n"
      end

      rx_alert_p = /<p[^>]*>\s*<%=\s*alert\s*%>\s*<\/p>\s*\n?/m
      if content.match?(rx_alert_p)
        gsub_file file, rx_alert_p, "<div style=\"color: green\"><%= flash_container %></div>\n"
      end
      rx_alert_bare = /^\s*<%=\s*alert\s*%>\s*$\n?/
      if content.match?(rx_alert_bare)
        gsub_file file, rx_alert_bare, "<div style=\"color: green\"><%= flash_container %></div>\n"
      end
    end
  end

  say "Sandbox wiring for flash_unified (propshaft) completed.", :green
end
