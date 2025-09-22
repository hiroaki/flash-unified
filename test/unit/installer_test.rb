require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require_relative '../../lib/flash_unified/installer'

class InstallerTest < Minitest::Test
  def setup
    @src = Dir.mktmpdir('flash_unified_src')
    @dst = Dir.mktmpdir('app_dst')

    FileUtils.mkdir_p(File.join(@src, 'app', 'javascript', 'flash_unified'))
    File.write(File.join(@src, 'app', 'javascript', 'flash_unified', 'flash_unified.js'), 'console.log("ok")')
    FileUtils.mkdir_p(File.join(@src, 'app', 'views', 'flash_unified'))
    File.write(File.join(@src, 'app', 'views', 'flash_unified', '_templates.html.erb'), '<template></template>')
    FileUtils.mkdir_p(File.join(@src, 'config', 'locales'))
    File.write(File.join(@src, 'config', 'locales', 'http_status_messages.en.yml'), "en:\n  flash: {}\n")
  end

  def teardown
    FileUtils.rm_rf(@src)
    FileUtils.rm_rf(@dst)
  end

  def test_copy_javascript_creates_files
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_javascript
    assert File.exist?(File.join(@dst, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
  end

  def test_copy_views_creates_templates
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_views
    assert File.exist?(File.join(@dst, 'app', 'views', 'flash_unified', '_templates.html.erb'))
  end

  def test_copy_locales_creates_locale_file
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_locales
    assert File.exist?(File.join(@dst, 'config', 'locales', 'http_status_messages.en.yml'))
  end
end
