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

    # Optional: Render flash messages as JSON script for client-side consumption.
    # This does NOT auto-dispatch; pair with a custom event dispatch (see below)
    # or enableMutationObserver on the client if you plan to watch insertions.
    #
    # Usage:
    #   <%= flash_storage_json %>
    #   <%= flash_storage_json(messages: [{ type: :notice, message: "Hi" }]) %>
    def flash_storage_json(messages: nil)
      msgs = messages || flash.to_hash.map { |type, msg| { type: type, message: msg } }
      render partial: "flash_unified/storage_json", locals: { payload: msgs }
    end

    # Optional: Inline dispatch of the custom event with a given payload.
    # NOTE: Inline scripts may be blocked by strict CSP. We attach a nonce when available.
    #
    # Usage:
    #   <%= flash_dispatch_event(payload: [{ type: :notice, message: "Saved" }]) %>
    #   <%= flash_dispatch_event(payload: payload_from_json, nonce: content_security_policy_nonce) %>
    def flash_dispatch_event(payload:, nonce: nil)
      render partial: "flash_unified/dispatch_event", locals: { payload: payload, nonce: nonce || (respond_to?(:content_security_policy_nonce) ? content_security_policy_nonce : nil) }
    end
  end
end

