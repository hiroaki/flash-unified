require 'test_helper'
require 'generators/flash_unified/install/install_generator'
require 'flash_unified/installer'

class InstallGeneratorTest < Rails::Generators::TestCase
  tests FlashUnified::Generators::InstallGenerator

  destination File.expand_path('../../tmp', __dir__)
  setup :prepare_destination

  def test_generator_runs_without_error
    # run_generator will raise if generator invocation fails
    run_generator
    assert true
  end
end
