require 'test_helper'
require 'flash_unified/generators/install/install_generator'
require 'flash_unified/installer'

class InstallGeneratorTest < Rails::Generators::TestCase
  tests FlashUnified::Generators::InstallGenerator

  destination File.expand_path('../../tmp', __dir__)
  setup :prepare_destination

  def test_generator_runs_without_error
    # run_generator will raise if generator invocation fails
    run_generator
    assert true
  end

  # Test that the generator is recognized by the `rails generate` command
  def test_generator_is_listed
    assert_includes Rails::Generators.public_namespaces, "flash_unified:install"
  end

  def test_default_installs_js_templates_locales_helpers
    # Default: templates + locales only (run without options)
    run_generator

    # Ensure JavaScript is NOT installed by default
    refute File.exist?(File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))

    # Templates only (not all views by default)
    assert_file File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb')
    %w[_container.html.erb _storage.html.erb _global_storage.html.erb _general_error_messages.html.erb].each do |fname|
      refute File.exist?(File.join(destination_root, 'app', 'views', 'flash_unified', fname)), "#{fname} should NOT be installed by default"
    end

    # Locales
    %w[http_status_messages.en.yml http_status_messages.ja.yml].each do |fname|
      assert_file File.join(destination_root, 'config', 'locales', fname)
    end

    # Helpers should NOT be installed by default
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end

  def test_option_all_installs_same_as_default_groups
    # --all should install everything (including templates and all views)
    run_generator %w[--all]

    # Sanity check a couple of files from each group
    assert_file File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js')
    assert_file File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb')
    assert_file File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml')
    assert_file File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb')
    assert_file File.join(destination_root, 'app', 'views', 'flash_unified', '_container.html.erb')
  end

  def test_option_views_installs_all_view_partials_only
    run_generator %w[--views]

    # All view partials should be installed
    %w[_templates.html.erb _container.html.erb _storage.html.erb _global_storage.html.erb _general_error_messages.html.erb].each do |fname|
      assert_file File.join(destination_root, 'app', 'views', 'flash_unified', fname)
    end

    # Other groups should not be installed
    refute File.exist?(File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
    refute File.exist?(File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml'))
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end

  def test_option_templates_only
    run_generator %w[--templates]

    assert_file File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb')
    # Ensure other view partials are not copied
    %w[_container.html.erb _storage.html.erb _global_storage.html.erb _general_error_messages.html.erb].each do |fname|
      refute File.exist?(File.join(destination_root, 'app', 'views', 'flash_unified', fname))
    end
    # Ensure no other groups are copied
    refute File.exist?(File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
    refute File.exist?(File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml'))
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end

  def test_option_javascript_only
    run_generator %w[--javascript]
    assert_file File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js')
    refute File.exist?(File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb'))
    refute File.exist?(File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml'))
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end

  def test_option_locales_only
    run_generator %w[--locales]
    assert_file File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml')
    refute File.exist?(File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb'))
    refute File.exist?(File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end

  def test_option_helpers_only
    run_generator %w[--helpers]
    assert_file File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb')
    refute File.exist?(File.join(destination_root, 'app', 'views', 'flash_unified', '_templates.html.erb'))
    refute File.exist?(File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js'))
    refute File.exist?(File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml'))
  end

  def test_combined_options_views_and_javascript
    run_generator %w[--views --javascript]

    # views + javascript are installed
    assert_file File.join(destination_root, 'app', 'javascript', 'flash_unified', 'flash_unified.js')
    %w[_templates.html.erb _container.html.erb _storage.html.erb _global_storage.html.erb _general_error_messages.html.erb].each do |fname|
      assert_file File.join(destination_root, 'app', 'views', 'flash_unified', fname)
    end
    # locales/helpers not installed
    refute File.exist?(File.join(destination_root, 'config', 'locales', 'http_status_messages.en.yml'))
    refute File.exist?(File.join(destination_root, 'app', 'helpers', 'flash_unified', 'view_helper.rb'))
  end
end
