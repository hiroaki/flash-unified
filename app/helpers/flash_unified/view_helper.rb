module FlashUnified
  module ViewHelper
    # General flash-storage using by Turbo Stream
    def flash_global_storage
      render partial: "flash_unified/global_storage"
    end

    # flash message storage
    def flash_storage
      render partial: "flash_unified/storage"
    end

    # Render templates partial (the <template> tags consumed by client-side JS).
    # The generator copies `_templates.html.erb` by default; if it's not
    # available, fall back to an inline set of templates so the helper always
    # returns usable markup.
    def flash_templates
      render partial: "flash_unified/templates"
    end

    # flash message display container
    def flash_container
      render partial: "flash_unified/container"
    end

    # General error messages
    def flash_general_error_messages
      render partial: "flash_unified/general_error_messages"
    end

    # Turbo Stream helper that appends flash storage to the global storage element.
    # This is a convenience helper for the common pattern of appending flash messages
    # via Turbo Stream to the global flash-storage container.
    #
    # Usage in views:
    #   <%= flash_turbo_stream %>
    #
    # Usage in controllers:
    #   render turbo_stream: flash_turbo_stream
    def flash_turbo_stream
      turbo_stream.append("flash-storage", partial: "flash_unified/storage")
    end

    # Wrapper helper that renders the common flash-unified pieces in a single
    # call. This is a non-destructive convenience helper which calls the
    # existing partial-rendering helpers in a sensible default order. Pass a
    # hash to disable parts, e.g. `flash_unified_sources(container: false)`.
    def flash_unified_sources(options = {})
      opts = {
        global_storage: true,
        templates: true,
        general_errors: true,
        storage: true,
        container: false
      }.merge(options.transform_keys(&:to_sym))

      parts = []
      parts << flash_global_storage if opts[:global_storage]
      parts << flash_templates if opts[:templates]
      parts << flash_general_error_messages if opts[:general_errors]
      parts << flash_storage if opts[:storage]
      parts << flash_container if opts[:container]

      safe_join(parts, "\n")
    end
  end
end
