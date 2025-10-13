class FlashPagesController < ApplicationController
  layout :resolve_layout

  protect_from_forgery with: :null_session

  def basic
    flash.now[:alert] = 'Basic alert'
    flash.now[:notice] = 'Basic notice'
  end

  def custom; end

  def stream; end

  def stream_update
    flash.now[:notice] = 'From stream'
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.append(
          'flash-storage',
          partial: 'flash_unified/storage'
        )
      end
      format.html { head :ok }
    end
  end

  def events; end

  def missing_template
    flash.now[:warning] = 'Warn without template'
  end

  # For testing auto-init opt-out: server embeds messages but client should not auto-render
  def auto_off
    flash.now[:alert] = 'Auto init disabled alert'
    flash.now[:notice] = 'Auto init disabled notice'
  end

  # For testing duplicate prevention on network error listeners
  def events_with_message
    flash.now[:alert] = 'Existing alert'
  end

  # For testing clearFlashMessages()
  def clear
    flash.now[:alert] = 'Clear me (alert)'
    flash.now[:notice] = 'Clear me (notice)'
  end

  private

  def resolve_layout
    case action_name
    when 'missing_template'
      'flash_unified_test_nowarning'
    when 'auto_off'
      'flash_unified_auto_off'
    else
      'flash_unified_test'
    end
  end
end
