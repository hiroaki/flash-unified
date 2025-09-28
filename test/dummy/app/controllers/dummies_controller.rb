class DummiesController < ApplicationController
  def index
  end

  def success
    redirect_to dummies_path, notice: "Saved successfully"
  end

  def failure
    flash.now[:alert] = "Could not create."
    render :index
  end
end
