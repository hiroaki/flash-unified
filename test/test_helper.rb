$LOAD_PATH.unshift File.expand_path("../lib", __dir__)
require "flash_unified"

require "minitest/autorun"

ENV["RAILS_ENV"] ||= "test"
require_relative "dummy/config/environment"
require "rails/test_help"
require "capybara/rails"
