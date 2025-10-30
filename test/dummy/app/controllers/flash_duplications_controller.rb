class FlashDuplicationsController < ApplicationController
  layout "flash_unified_frame_duplication"

  def frame
    flash.now[:notice] = "Layout + frame notice"
  end
end
