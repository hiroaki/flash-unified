require 'test_helper'

class FlashUnifiedViewHelperTest < ActionView::TestCase
  tests FlashUnified::ViewHelper

  test 'flash_container renders container marker' do
    html = flash_container
    assert_includes html, 'data-flash-message-container'
  end

  test 'flash_global_storage renders global storage id' do
    html = flash_global_storage
    assert_includes html, 'id="flash-storage"'
  end

  test 'flash_templates renders required templates' do
    html = flash_templates
    assert_includes html, 'template id="flash-message-template-notice"'
    assert_includes html, 'template id="flash-message-template-alert"'
    assert_includes html, 'class="flash-message-text"'
  end

  test 'flash_general_error_messages contains network key' do
    html = flash_general_error_messages
    assert_includes html, 'id="general-error-messages"'
    assert_includes html, 'li data-status="network"'
  end

  test 'flash_storage renders storage wrapper even without flash' do
    # flash が空でも最低限の枠が出力されること
    html = flash_storage
    assert_includes html, 'data-flash-storage'
    assert_includes html, '<ul>'
  end

  test 'flash_storage renders li for flash entries' do
    # ActionView::TestCase では controller の flash を使える
    @controller.flash[:notice] = 'Hello'
    html = flash_storage
    assert_includes html, 'data-type="notice"'
    assert_includes html, 'Hello'
  end
end
