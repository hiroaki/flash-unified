require "application_system_test_case"

class LayoutWrapperSystemTest < ApplicationSystemTestCase
  test "wrapper layout: initial render and client append/consume flows" do
    visit "/flash/render_consume_wrapper"

    # Initial server-provided messages should be rendered by auto init
    assert_selector '[data-flash-message]', text: 'Server notice for render_consume_wrapper'
    assert_selector '[data-flash-message]', text: 'Server alert for render_consume_wrapper'

    # Remove rendered messages and test client append + render
    page.execute_script("document.querySelectorAll('[data-flash-message]').forEach(e => e.remove())")

    # Append a client-originated message then consume (destructive) without rendering
    click_button 'Add Hello'
    click_button 'Consume messages (remove)'
    raw = page.evaluate_script("document.getElementById('__lastConsumed').value")
    res = JSON.parse(raw)
    assert_equal 1, res.length
    assert_equal 'Hello', res.first['message']

    # Storages should be removed by default
    remaining = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_equal 0, remaining
  end
end
