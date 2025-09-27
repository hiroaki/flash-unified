require "application_system_test_case"

class DummyHomeTest < ApplicationSystemTestCase
  test "visiting the root path" do
    visit "/"
    assert_text "Hello from Dummy!"
  end
end
