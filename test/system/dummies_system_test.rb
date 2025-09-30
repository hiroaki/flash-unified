require "test_helper"

class DummiesSystemTest < ActionDispatch::SystemTestCase
  # Use the custom Capybara driver defined in test/support/capybara.rb
  driven_by :cuprite_custom

  test "visiting the Dummies index" do
    visit "/dummies"

    assert_selector "h1", text: "Dummies#index"
    assert_selector "[data-testid='flash-message-display-here']"
  end

  # Helper: read the layout timestamp shown in #time-current
  def layout_timestamp
    find('#time-current').text.strip
  end

  test "turbo drive: success flash shows and full page reloads" do
    visit "/dummies"
    before_time = layout_timestamp

    click_on "Success flash"

    # After a Turbo Drive redirect, the flash message should be rendered into the
    # flash container and the layout timestamp should change (full navigation).
    assert_selector '[data-flash-message-container] .flash-notice', text: 'Saved successfully'
    after_time = layout_timestamp
    assert_not_equal before_time, after_time, "Expected full page reload to change layout timestamp"
  end

  test "turbo drive: failure flash shows and full page reloads" do
    visit "/dummies"
    before_time = layout_timestamp

    click_on "Failure flash"

    # For failure route (render :index), the server returns the index template
    # and the flash.now[:alert] should be rendered into the storage which the
    # client picks up and shows. Since this is a regular response (not a frame),
    # the page will be fully rendered and timestamp should change.
    assert_selector '[data-flash-message-container] .flash-alert', text: 'Could not create.'
    after_time = layout_timestamp
    assert_not_equal before_time, after_time, "Expected full page render to change layout timestamp"
  end

  test "turbo frame: success shows flash and only frame updates" do
    visit "/dummies"
    before_time = layout_timestamp

    # Click a link that targets the turbo frame
    click_on "Success (frame)"

  # Frame update should render flash into the visible flash container and NOT change the outer layout timestamp
  assert_selector "[data-testid='flash-message-display-here'] .flash-notice", text: 'Saved successfully'
    after_time = layout_timestamp
    assert_equal before_time, after_time, "Expected only frame update, layout timestamp must remain unchanged"
  end

  test "turbo frame: failure shows flash and only frame updates" do
    visit "/dummies"
    before_time = layout_timestamp

    click_on "Failure (frame)"

  assert_selector "[data-testid='flash-message-display-here'] .flash-alert", text: 'Could not create.'
    after_time = layout_timestamp
    assert_equal before_time, after_time, "Expected only frame update, layout timestamp must remain unchanged"
  end

  test "network error: turbo:fetch-request-error shows general network message" do
    visit "/dummies"

    # The general errors list is rendered but hidden in the layout; read it using visible: :all
    assert_selector '#general-error-messages', visible: :all

    # Trigger a turbo:fetch-request-error event to simulate a fetch/network failure
    page.execute_script(<<~JS)
      const ev = new Event('turbo:fetch-request-error');
      document.dispatchEvent(ev);
    JS

    # The client JS should pick the network message and append it as an alert
    # into the visible flash message container
    assert_selector "[data-testid='flash-message-display-here'] .flash-alert", text: "Network Error"
  end

  test "turbo:submit-end with undefined fetchResponse acts as network error" do
    visit "/dummies"

    # Read the network message from the hidden list
    network_message = find('#general-error-messages li[data-status="network"]', visible: :all).text.strip

    # Ensure any previous flash messages/storages are removed so the handler will add the network message
    page.execute_script("document.querySelectorAll('[data-flash-storage]').forEach(e => e.remove())")
    page.execute_script("document.getElementById('flash-storage').innerHTML = ''")
    page.execute_script("document.querySelectorAll('[data-flash-message-container]').forEach(c => c.innerHTML = '')")

    # Dispatch turbo:submit-end with no fetchResponse (undefined in detail)
    page.execute_script(<<~JS)
      const ev = new CustomEvent('turbo:submit-end', { detail: {} });
      document.dispatchEvent(ev);
    JS

    assert_selector "[data-testid='flash-message-display-here'] .flash-alert", text: network_message
  end

  test "http error status: turbo:submit-end with 413 shows payload-too-large message" do
    visit "/dummies"

    # Ensure we have the 413 message available in the hidden general list
    assert_selector '#general-error-messages li[data-status="413"]', visible: :all

    # Dispatch turbo:submit-end with a fake fetchResponse having statusCode 413
    page.execute_script(<<~JS)
      const ev = new CustomEvent('turbo:submit-end', { detail: { fetchResponse: { statusCode: 413 } } });
      document.dispatchEvent(ev);
    JS

    assert_selector "[data-testid='flash-message-display-here'] .flash-alert", text: "Payload Too Large"
  end
end
