require "application_system_test_case"

class FlashUnifiedPagesSystemTest < ApplicationSystemTestCase
  test "renders server-side storage on load" do
    visit "/flash/basic"
    assert_selector "[data-flash-message]", text: "Basic alert"
    assert_selector "[data-flash-message]", text: "Basic notice"
    assert_no_selector "[data-flash-storage]"
  end

  test "renders messages from custom event" do
    visit "/flash/custom"
    click_on "Dispatch custom"
    assert_selector "[data-flash-message]", text: "Custom A"
    assert_selector "[data-flash-message]", text: "Custom B"
  end

  test "renders messages from turbo stream append" do
    visit "/flash/stream"
    click_on "Add by stream"
    assert_selector "[data-flash-message]", text: "From stream"
  end

  test "network error fallback uses general-error-messages" do
    visit "/flash/events"
    click_on "Simulate network error"
    assert_selector "[data-flash-message]", text: I18n.t("http_status_messages.network")
  end

  test "submit-end 413 uses general-error-messages" do
    visit "/flash/events"
    click_on "Simulate 413"
    assert_selector "[data-flash-message]", text: I18n.t("http_status_messages.413")
  end

  test "falls back when template missing" do
    visit "/flash/missing_template"
    assert_selector "[data-flash-message]", text: "Warn without template"
  end

  test "auto init can be disabled via data attribute" do
    visit "/flash/auto_off"
    # Messages should not be rendered automatically
    assert_no_selector "[data-flash-message]", text: "Auto init disabled alert"
    assert_no_selector "[data-flash-message]", text: "Auto init disabled notice"
    # Manually render using the exposed hook on layout
    page.execute_script("window.__manualRenderFlash__()")
    assert_selector "[data-flash-message]", text: "Auto init disabled alert"
    assert_selector "[data-flash-message]", text: "Auto init disabled notice"
  end

  test "network listeners do not add fallback when messages already present" do
    visit "/flash/events_with_message"
    # Initial server message should render once
    assert_selector "[data-flash-message]", text: "Existing alert", count: 1
    # Trigger a network error; should NOT add fallback since a message is already present
    click_on "Simulate network error"
    assert_no_selector "[data-flash-message]", text: I18n.t("http_status_messages.network")
    assert_selector "[data-flash-message]", text: "Existing alert", count: 1
  end

  test "clearFlashMessages removes rendered nodes" do
    visit "/flash/clear"
    assert_selector "[data-flash-message]", text: "Clear me (alert)"
    assert_selector "[data-flash-message]", text: "Clear me (notice)"
    click_on "Clear All"
    assert_no_selector "[data-flash-message]"
  end
end
