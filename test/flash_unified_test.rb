require "test_helper"

class FlashUnifiedTest < Minitest::Test
  def test_that_it_has_a_version_number
    refute_nil ::FlashUnified::VERSION
  end

  def test_it_does_something_useful
    # Basic smoke: module should be defined
    assert defined?(FlashUnified)
  end
end
