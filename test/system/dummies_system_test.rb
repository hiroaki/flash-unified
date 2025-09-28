require "test_helper"

class DummiesSystemTest < ActionDispatch::SystemTestCase
  # Use the custom Capybara driver defined in test/support/capybara.rb
  driven_by :cuprite_custom

  test "visiting the Dummies index" do
    visit "/dummies"

    assert_selector "h1", text: "Dummies#index"
    assert_selector "[data-testid='flash-message-display-here']"
  end
end
