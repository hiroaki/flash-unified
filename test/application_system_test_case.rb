require "test_helper"
require "capybara/rails"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  # Use cuprite driver to support JS execution in system tests
  driven_by :cuprite_custom
end
