require "application_system_test_case"

class LayoutFixedFlashStorageSystemTest < ApplicationSystemTestCase
  test "layout-level storage: consumeFlashMessages removes storages by default" do
    visit "/flash/render_consume_fixed"

    # Ensure no existing storages
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")

    # Append messages via test-only fixed buttons (no global test helpers)
    click_button 'Add Hello'
    click_button 'Add Oops'

    # Directly consume (destructive) without rendering first
    click_button 'Consume messages (remove)'

    # Read the JSON payload from the hidden textarea and parse it
    raw = page.evaluate_script("document.getElementById('__lastConsumed').value")
    res = JSON.parse(raw)

    assert_equal 2, res.length
    types = res.map { |m| m['type'] }
    messages = res.map { |m| m['message'] }
    assert_includes types, 'notice'
    assert_includes types, 'alert'
    assert_includes messages, 'Hello'
    assert_includes messages, 'Oops'

    # Storages should be removed by default
    remaining = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_equal 0, remaining
  end

  test "layout-level storage: renderFlashMessages renders messages and removes storages" do
    visit "/flash/render_consume_fixed"

    # Ensure no existing storages
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")

    # Append messages via fixed buttons
    click_button 'Add Hello'
    click_button 'Add Oops'

    # Render and assert DOM nodes appear
    click_button 'Render messages'
    assert_selector '[data-flash-message]', text: 'Hello'
    assert_selector '[data-flash-message]', text: 'Oops'

    # Storages should have been removed by renderFlashMessages
    remaining = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_equal 0, remaining
  end

  test "layout-level storage: consumeFlashMessages with keep=true preserves storages" do
    visit "/flash/render_consume_fixed"

    # Clean and append via fixed button
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")
    click_button 'Add Keep me'

    # Click the consume-keep button which calls consumeFlashMessages(true)
    click_button 'Consume messages (keep)'

    raw = page.evaluate_script("document.getElementById('__lastConsumed').value")
    res = JSON.parse(raw)

    assert_equal 1, res.length
    assert_equal 'Keep me', res.first['message']

    # Storages should still be present after keep=true
    remaining = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_equal 1, remaining
  end
end
