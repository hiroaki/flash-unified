require 'test_helper'

class LocalesTest < Minitest::Test
  def test_http_status_messages_keys_exist
    I18n.with_locale(:en) do
      assert I18n.exists?('http_status_messages.network'), 'network message should exist'
      assert I18n.exists?('http_status_messages.413'), '413 message should exist'
      assert_equal 'Payload Too Large', I18n.t('http_status_messages.413')
      assert_equal 'Network Error', I18n.t('http_status_messages.network')
    end
  end
end
