require 'fileutils'
require 'pathname'

module FlashUnified
  # Pure-Ruby installer logic extracted from the generator so it can be
  # unit-tested without loading Rails. Responsible for copying javascript,
  # view partials and locale files from the gem source into a target app.
  class Installer
    attr_reader :source_root, :target_root, :force

    def initialize(source_root:, target_root:, force: false)
      @source_root = Pathname.new(source_root)
      @target_root = Pathname.new(target_root)
      @force = !!force
    end

    def copy_javascript
      src = source_root.join('app', 'javascript', 'flash_unified')
      dst = target_root.join('app', 'javascript', 'flash_unified')
      copy_tree(src, dst)
    end

    def copy_views
      src_dir = source_root.join('app', 'views', 'flash_unified')
      dst_dir = target_root.join('app', 'views', 'flash_unified')
      files = %w[
        _templates.html.erb
        _storage.html.erb
        _global_storage.html.erb
        _container.html.erb
        _general_error_messages.html.erb
        _storage_json.html.erb
        _dispatch_event.html.erb
      ]
      copy_files(files, src_dir, dst_dir)
    end

    def copy_locales
      src_dir = source_root.join('config', 'locales')
      dst_dir = target_root.join('config', 'locales')
      return unless src_dir.directory?
      FileUtils.mkdir_p(dst_dir) unless dst_dir.exist?
      Dir.glob(src_dir.join('*.yml')).each do |src|
        dst = dst_dir.join(File.basename(src))
        if dst.exist?
          FileUtils.cp(src, dst) if force
        else
          FileUtils.cp(src, dst)
        end
      end
    end

    private

    def copy_tree(src, dst)
      raise "source missing: #{src}" unless src.directory?
      if dst.exist?
        if force
          FileUtils.rm_rf(dst)
          FileUtils.mkdir_p(dst)
          FileUtils.cp_r(File.join(src, '.'), dst)
          :overwritten
        else
          :skipped
        end
      else
        FileUtils.mkdir_p(dst)
        FileUtils.cp_r(File.join(src, '.'), dst)
        :created
      end
    end

    def copy_files(list, src_dir, dst_dir)
      return unless src_dir.directory?
      FileUtils.mkdir_p(dst_dir) unless dst_dir.exist?
      list.each do |fname|
        src = src_dir.join(fname)
        next unless src.file?
        dst = dst_dir.join(fname)
        if dst.exist?
          FileUtils.cp(src, dst) if force
        else
          FileUtils.cp(src, dst)
        end
      end
    end
  end
end
