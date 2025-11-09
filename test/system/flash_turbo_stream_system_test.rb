require "application_system_test_case"

class FlashTurboStreamSystemTest < ApplicationSystemTestCase
  test "renders messages from turbo stream helper" do
    visit "/flash/stream_helper"
    click_on "Add by stream (helper)"
    assert_selector "[data-flash-message]", text: "From stream helper"
  end
end
