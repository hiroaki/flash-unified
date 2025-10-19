require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require_relative '../../lib/flash_unified/installer'

class InstallerTest < Minitest::Test
  def setup
    @src = Dir.mktmpdir('flash_unified_src')
    @dst = Dir.mktmpdir('app_dst')

    # Prepare all files expected by installer.rb
    FileUtils.mkdir_p(File.join(@src, 'app', 'javascript', 'flash_unified'))
    File.write(File.join(@src, 'app', 'javascript', 'flash_unified', 'flash_unified.js'), 'console.log("ok")')

    FileUtils.mkdir_p(File.join(@src, 'app', 'views', 'flash_unified'))
    %w[_templates.html.erb _storage.html.erb _global_storage.html.erb _container.html.erb _general_error_messages.html.erb].each do |fname|
      File.write(File.join(@src, 'app', 'views', 'flash_unified', fname), "<div>#{fname}</div>")
    end

    # helpers
    FileUtils.mkdir_p(File.join(@src, 'app', 'helpers', 'flash_unified'))
    File.write(File.join(@src, 'app', 'helpers', 'flash_unified', 'view_helper.rb'), "module FlashUnified; module ViewHelper; end; end")

    FileUtils.mkdir_p(File.join(@src, 'config', 'locales'))
    File.write(File.join(@src, 'config', 'locales', 'http_status_messages.en.yml'), "en:\n  flash: {}\n")
    File.write(File.join(@src, 'config', 'locales', 'http_status_messages.ja.yml'), "ja:\n  flash: {}\n")
  end

  def teardown
    FileUtils.rm_rf(@src)
    FileUtils.rm_rf(@dst)
  end

  def test_copy_javascript_creates_files
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_javascript
    assert File.exist?(File.join(@dst, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
    assert_equal 'console.log("ok")', File.read(File.join(@dst, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
  end

  def test_copy_views_creates_all_partials
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_views
    %w[_templates.html.erb _storage.html.erb _global_storage.html.erb _container.html.erb _general_error_messages.html.erb].each do |fname|
      path = File.join(@dst, 'app', 'views', 'flash_unified', fname)
      assert File.exist?(path), "#{fname} should be copied"
      assert_match(/<div>#{fname}.*<\/div>/, File.read(path))
    end
  end

  def test_copy_templates_only_copies_templates
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_templates
    # _templates exists
    templates_path = File.join(@dst, 'app', 'views', 'flash_unified', '_templates.html.erb')
    assert File.exist?(templates_path)
    # other partials do not
    %w[_storage.html.erb _global_storage.html.erb _container.html.erb _general_error_messages.html.erb].each do |fname|
      refute File.exist?(File.join(@dst, 'app', 'views', 'flash_unified', fname)), "#{fname} should not be copied by copy_templates"
    end
  end

  def test_copy_helpers_copies_view_helper
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_helpers
    helper_path = File.join(@dst, 'app', 'helpers', 'flash_unified', 'view_helper.rb')
    assert File.exist?(helper_path)
    assert_match(/module FlashUnified/, File.read(helper_path))
  end

  def test_copy_locales_creates_all_locale_files
    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst)
    installer.copy_locales
    %w[http_status_messages.en.yml http_status_messages.ja.yml].each do |fname|
      path = File.join(@dst, 'config', 'locales', fname)
      assert File.exist?(path), "#{fname} should be copied"
    end
  end

  def test_copy_with_force_overwrites_existing_files
    # Prepare destination with different content
    FileUtils.mkdir_p(File.join(@dst, 'app', 'javascript', 'flash_unified'))
    js_path = File.join(@dst, 'app', 'javascript', 'flash_unified', 'flash_unified.js')
    File.write(js_path, 'old')

    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst, force: true)
    installer.copy_javascript
    assert_equal 'console.log("ok")', File.read(js_path)
  end

  def test_copy_without_force_does_not_overwrite
    FileUtils.mkdir_p(File.join(@dst, 'app', 'javascript', 'flash_unified'))
    js_path = File.join(@dst, 'app', 'javascript', 'flash_unified', 'flash_unified.js')
    File.write(js_path, 'old')

    installer = FlashUnified::Installer.new(source_root: @src, target_root: @dst, force: false)
    installer.copy_javascript
    assert_equal 'old', File.read(js_path)
  end
end
