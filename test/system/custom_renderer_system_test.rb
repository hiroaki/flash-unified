require "application_system_test_case"

class CustomRendererSystemTest < ApplicationSystemTestCase
  test "custom renderer displays messages and bypasses default DOM renderer" do
    visit "/flash/custom_renderer"

    # Custom renderer should populate the target list with messages
    assert_selector "#custom-render-target li[data-type='alert']", text: "Custom renderer alert"
    assert_selector "#custom-render-target li[data-type='notice']", text: "Custom renderer notice"

    # Default DOM-based renderer should not have produced any [data-flash-message] nodes
    assert_no_selector "[data-flash-message]"

    # Storages should be consumed (removed) after rendering
    assert_no_selector "[data-flash-storage]"
  end
end
