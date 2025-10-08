require "rails/railtie"

module FlashUnified
  class Railtie < Rails::Railtie
    # Ensure the gem's generators are required so `rails generate` lists
    # them when the gem is installed into a host application. Using the
    # `generators` block defers the `require` until generator loading
    # time and avoids loading Rails-only code during normal gem require.
    generators do
      require_relative "generators/install/install_generator"
    end
  end
end
