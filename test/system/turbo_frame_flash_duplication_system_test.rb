require "application_system_test_case"

class TurboFrameFlashDuplicationSystemTest < ApplicationSystemTestCase
	# When the layout renders flash_unified_sources (including storage) and the
	# page also embeds its own flash_storage inside a turbo-frame, a full reload
	# with a server-side flash will currently render the same message twice. This
	# expectation asserts the desired behavior (no duplication) so that the
	# regression is detectable.
	test "full page load with turbo frame storage does not duplicate server flash" do
		visit "/flash/frame_duplication"

		assert_selector "[data-flash-message]", text: "Layout + frame notice"
		assert_selector "[data-flash-message]", text: "Layout + frame notice", count: 1
		assert_no_selector "[data-flash-storage]"
	end
end
