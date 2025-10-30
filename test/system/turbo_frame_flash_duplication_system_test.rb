require "application_system_test_case"

class TurboFrameFlashDuplicationSystemTest < ApplicationSystemTestCase
  # This test verifies that when the layout renders flash_unified_sources (including storage)
  # and the page also embeds its own flash_storage inside a turbo-frame, a full reload
  # with a server-side flash does not render the same message twice.
  # This ensures that the deduplication fix works correctly and prevents regression.
  test "full page load with turbo frame storage does not duplicate server flash" do
    visit "/flash/frame_duplication"

    assert_selector "[data-flash-message]", text: "Layout + frame notice"
    assert_selector "[data-flash-message]", text: "Layout + frame notice", count: 1
    assert_no_selector "[data-flash-storage]"
  end
end
