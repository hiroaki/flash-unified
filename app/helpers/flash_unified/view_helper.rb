module FlashUnified
  module ViewHelper
    # General flash-storage using by Turbo Stream
    def flash_global_storage
      content_tag(:div, "", id: "flash-storage", style: "display: none;")
    end

    # flash message storage
    def flash_storage
      content_tag(:div, data: { flash_storage: true }, style: "display: none;") do
        content_tag(:ul, data: { testid: "flash-storage-list" }) do
          flash.map do |type, message|
            content_tag(:li, message, data: { type: type })
          end.join.html_safe
        end
      end
    end

    # flash message display container
    def flash_container
      content_tag(:div, "", data: { flash_message_container: true })
    end

    # General error messages
    def flash_general_error_messages
      status_codes = %w[
        400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418
        421 422 423 424 425 426 428 429 431 451
        500 501 502 503 504 505 506 507 508 510 511
        network
      ]

      content_tag(:ul, id: "general-error-messages", style: "display: none;") do
        safe_join(
          status_codes.map do |code|
            content_tag(:li, t("http_status_messages.#{code}"), data: { status: code })
          end
        )
      end
    end
  end
end

