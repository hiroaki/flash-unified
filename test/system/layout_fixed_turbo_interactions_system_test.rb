require "application_system_test_case"

class LayoutFixedTurboInteractionsSystemTest < ApplicationSystemTestCase
  test "A - initial page-load renders server-embedded flashes" do
    visit "/flash/render_consume_fixed"

    # The layout has server-provided flashes (flash.now in the controller). The auto
    # importer should have rendered them on DOM ready.
    assert_selector '[data-flash-message]', text: 'Server notice for render_consume_fixed'
    assert_selector '[data-flash-message]', text: 'Server alert for render_consume_fixed'

    # Storages should have been removed by the initial render
    remaining = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_equal 0, remaining
  end

  test "B - Turbo Drive navigation renders server-embedded flashes on visited page" do
    visit "/flash/render_consume_fixed"

    # Click the link to /flash/basic using Turbo Drive
    click_link 'Go to basic'

    # The basic action provides server-side flash.now messages; they should be rendered
    assert_selector '[data-flash-message]', text: 'Basic notice'
    assert_selector '[data-flash-message]', text: 'Basic alert'
  end

  test "C - Turbo Frame loads fragment with storage and client renders messages" do
    visit "/flash/render_consume_fixed"

    # Click the frame link which loads the fragment into the turbo-frame
    click_link 'Load frame (frame-target)'

    # Wait for frame to load and for the client to process storage -> rendered messages
    assert_selector '[data-flash-message]', text: 'Frame notice'
  end

  test "D - Turbo Stream append updates storage and client renders appended message" do
    visit "/flash/render_consume_fixed"

    # Ensure no existing rendered messages
    page.execute_script("document.querySelectorAll('[data-flash-message]').forEach(e => e.remove())")

    # Click the stream trigger; controller will respond with a turbo-stream append
    click_button 'Trigger turbo-stream append'

    # Wait for message appended via turbo-stream to be rendered
    assert_selector '[data-flash-message]', text: 'From stream'
  end

  test "E - Client append fallback: append to global storage then render" do
    visit "/flash/render_consume_fixed"

    # Remove any page-local storages but keep the layout-provided #flash-storage
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")

    # Ensure the global storage root exists (#flash-storage)
    has_root = page.evaluate_script("!!document.getElementById('flash-storage')")
    assert has_root

    # Append via client API (this should create an inner storage under #flash-storage)
    click_button 'Add Hello'

    # Confirm that a storage element was created in the DOM
    storage_count = page.evaluate_script("document.querySelectorAll('[data-flash-storage]').length")
    assert_operator storage_count, :>=, 1

    # Render the messages and assert they appear
    click_button 'Render messages'
    assert_selector '[data-flash-message]', text: 'Hello'
  end
end
