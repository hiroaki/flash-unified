require "application_system_test_case"

class LayoutFixedEdgeCasesSystemTest < ApplicationSystemTestCase
  test "missing template still renders message text" do
    visit "/flash/missing_template"

    # The page embeds a warning flash type that intentionally lacks a template.
    # The client should still render the raw message text.
    assert_selector '[data-flash-message]', text: 'Warn without template'
  end

  test "consumeFlashMessages returns empty array when no storages" do
    visit "/flash/render_consume_fixed"

    # Ensure no storages exist
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")

    # Click the consume button which stores JSON in __lastConsumed
    click_button 'Consume messages (remove)'

    raw = page.evaluate_script("(function(){ const t=document.getElementById('__lastConsumed'); return t? t.value : ''; })()")
    res = raw.to_s.strip == '' ? [] : JSON.parse(raw)

    assert_equal [], res
  end

  test "appendMessageToStorage creates an inner storage under #flash-storage with li[data-type]" do
    visit "/flash/render_consume_fixed"

    # Remove any page-local storages but keep the global root
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")
    has_root = page.evaluate_script("!!document.getElementById('flash-storage')")
    assert has_root, 'expected #flash-storage root to exist in layout'

    # Append via client API
    click_button 'Add Hello'

    # Collect types from any li[data-type] under data-flash-storage
    types = page.evaluate_script("Array.from(document.querySelectorAll('[data-flash-storage] ul li[data-type]')).map(n => n.getAttribute('data-type'))")

    assert_includes types, 'notice'
  end

  test "turbo-stream append and client append both render when combined" do
    visit "/flash/render_consume_fixed"

    # Remove any pre-rendered messages to avoid false positives
    page.execute_script("document.querySelectorAll('[data-flash-message]').forEach(e => e.remove())")

    # Trigger the turbo-stream append (form submit) and immediately append via client
    click_button 'Trigger turbo-stream append'
    # Immediately append a client-originated message
    click_button 'Add Hello'

    # Render messages (if any storages remain) and assert both messages appear
    click_button 'Render messages'
    assert_selector '[data-flash-message]', text: 'From stream'
    assert_selector '[data-flash-message]', text: 'Hello'
  end
end
