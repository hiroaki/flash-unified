require 'minitest/autorun'
require_relative '../../lib/flash_unified'

class FlashUnifiedUnitTest < Minitest::Test
  def test_that_it_has_a_version_number
    refute_nil ::FlashUnified::VERSION
  end

  def test_module_is_defined
    assert defined?(FlashUnified)
  end
end
