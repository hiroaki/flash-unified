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

  private

  def resolve_layout
    action_name == 'missing_template' ? 'flash_unified_test_nowarning' : 'flash_unified_test'
  end
end
