require 'test_helper'

class EngineInitializationTest < Minitest::Test
  def test_view_helper_is_included_into_action_controller
    # Use the public API: ActionController::Base.helpers returns a view context
    # proxy that should respond to helper methods when included.
    helpers = ActionController::Base.helpers
    assert_respond_to helpers, :flash_container
    assert_respond_to helpers, :flash_templates
    assert_respond_to helpers, :flash_storage
    assert_respond_to helpers, :flash_global_storage
    assert_respond_to helpers, :flash_general_error_messages
  end
end
