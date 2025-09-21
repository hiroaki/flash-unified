module FlashUnified
  class Engine < ::Rails::Engine
    isolate_namespace FlashUnified

    initializer "flash_unified.helpers" do
      # Ensure the view helper is registered with ActionController so
      # views in the host app (including the dummy app used for tests)
      # can call helpers like `flash_container`.
      # Use `config.to_prepare` so the helper is re-registered on each
      # code reload in development.
      config.to_prepare do
        ActionController::Base.helper FlashUnified::ViewHelper
      end
    end

    # Make the engine's `app/javascript` visible to asset pipelines like
    # Propshaft or Sprockets by adding it to the assets paths and
    # registering files for precompile if necessary.
    initializer "flash_unified.assets" do |app|
      js_path = root.join("app", "javascript").to_s
      if app.config.respond_to?(:assets)
        # Sprockets / Propshaft style
        app.config.assets.paths << js_path
        app.config.assets.precompile += %w[ flash_unified/flash_unified.js ]
      else
        # Fallback: still add to assets paths if available
        app.config.assets.paths << js_path if app.config.respond_to?(:assets)
      end
    end
  end
end
