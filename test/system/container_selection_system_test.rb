require "application_system_test_case"

class ContainerSelectionSystemTest < ApplicationSystemTestCase
  test "priority + visibleOnly + firstOnly selects highest priority visible container" do
    visit "/flash/container_priority"

    # Wait until any messages are rendered
    assert_selector "[data-flash-message]", count: 2

    # Invisible highest priority should not receive messages due to visibleOnly (use visible: false to check hidden element)
    within("#cont1", visible: false) do
      assert_no_selector "[data-flash-message]"
    end

    # Ensure messages rendered (2 in total)
    total = page.evaluate_script("document.querySelectorAll('[data-flash-message]').length")
    assert_equal 2, total
  end

  test "primaryOnly renders only into containers with data-flash-primary" do
    visit "/flash/container_primary"

    within("#primA") do
      assert_selector "[data-flash-message]", text: "Primary alert"
      assert_selector "[data-flash-message]", text: "Primary notice"
    end
    within("#primB") do
      assert_selector "[data-flash-message]", text: "Primary alert"
      assert_selector "[data-flash-message]", text: "Primary notice"
    end

    within("#nonPrim") do
      assert_no_selector "[data-flash-message]"
    end

    # Default container should also be excluded by primaryOnly
    # There should be no extra rendered nodes outside primA/primB
    rendered_count_outside = page.evaluate_script(<<~JS)
      Array.from(document.querySelectorAll('[data-flash-message]'))
        .filter(n => !document.getElementById('primA')?.contains(n) && !document.getElementById('primB')?.contains(n))
        .length
    JS
    assert_equal 0, rendered_count_outside
  end
end
