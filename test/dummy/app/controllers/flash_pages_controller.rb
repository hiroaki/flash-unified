class FlashPagesController < ApplicationController
  layout :resolve_layout

  protect_from_forgery with: :null_session

  def basic
    flash.now[:alert] = 'Basic alert'
    flash.now[:notice] = 'Basic notice'
  end

  def custom; end

  # Page to verify custom renderer integration
  def custom_renderer
    flash.now[:alert]  = 'Custom renderer alert'
    flash.now[:notice] = 'Custom renderer notice'
  end

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

  # Page that demonstrates using the `flash_turbo_stream` helper
  def stream_helper; end

  def stream_update_helper
    flash.now[:notice] = 'From stream helper'
    respond_to do |format|
      format.turbo_stream do
        # Use the new helper to render the turbo_stream action
        render turbo_stream: helpers.flash_turbo_stream
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

  # A dedicated test page used by system tests to exercise render vs consume flows
  def render_consume
    # Provide both a storage (server-embedded) and buttons for client actions
    flash.now[:notice] = 'Server notice for render_consume'
    flash.now[:alert]  = 'Server alert for render_consume'
  end

  # Same as render_consume but uses a layout that has the storage fixed under <body>
  def render_consume_fixed
    flash.now[:notice] = 'Server notice for render_consume_fixed'
    flash.now[:alert]  = 'Server alert for render_consume_fixed'
  end

  # Render a page that relies on the new wrapper helper placed in the layout
  def render_consume_wrapper
    flash.now[:notice] = 'Server notice for render_consume_wrapper'
    flash.now[:alert]  = 'Server alert for render_consume_wrapper'
  end

  # Target used by Turbo Frame tests. Render without the outer layout so the frame
  # content can include a page-local storage partial.
  def frame_target
    flash.now[:notice] = 'Frame notice'
    render layout: false
  end

  # For testing container selection: priority + visible-only + first-only
  def container_priority
    flash.now[:notice] = 'Priority notice'
    flash.now[:alert]  = 'Priority alert'
  end

  # For testing container selection: primary-only filter
  def container_primary
    flash.now[:notice] = 'Primary notice'
    flash.now[:alert]  = 'Primary alert'
  end

  private

  def resolve_layout
    case action_name
    when 'missing_template'
      'flash_unified_test_nowarning'
    when 'auto_off'
      'flash_unified_auto_off'
    when 'custom_renderer'
      'flash_unified_custom_renderer'
    when 'container_priority'
      'flash_unified_select_priority'
    when 'container_primary'
      'flash_unified_select_primary'
    when 'render_consume_fixed'
      'flash_unified_test_fixed'
    when 'render_consume_wrapper'
      'flash_unified_test_wrapper'
    else
      'flash_unified_test'
    end
  end
end
