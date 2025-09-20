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
  end
end

