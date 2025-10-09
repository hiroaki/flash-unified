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

    def copy_javascript(&block)
      src = source_root.join('app', 'javascript', 'flash_unified')
      dst = target_root.join('app', 'javascript', 'flash_unified')
      copy_tree(src, dst, &block)
    end

    def copy_views(&block)
      src_dir = source_root.join('app', 'views', 'flash_unified')
      dst_dir = target_root.join('app', 'views', 'flash_unified')
      files = %w[
        _templates.html.erb
        _storage.html.erb
        _global_storage.html.erb
        _container.html.erb
        _general_error_messages.html.erb
      ]
      copy_files(files, src_dir, dst_dir, &block)
    end

    def copy_locales(&block)
      src_dir = source_root.join('config', 'locales')
      dst_dir = target_root.join('config', 'locales')
      FileUtils.mkdir_p(dst_dir) unless dst_dir.exist?
      files = Dir.glob(src_dir.join('*.yml')).map { |p| File.basename(p) }
      copy_files(files, src_dir, dst_dir, &block)
    end

    private

    def copy_tree(src, dst, &block)
      raise "source missing: #{src}" unless src.directory?
      status = :skip
      if dst.exist?
        if force
          FileUtils.rm_rf(dst)
          FileUtils.mkdir_p(dst)
          FileUtils.cp_r(File.join(src, '.'), dst)
          status = :overwrite
        else
          status = :skip
        end
      else
        FileUtils.mkdir_p(dst)
        FileUtils.cp_r(File.join(src, '.'), dst)
        status = :create
      end
      # Report status for the whole directory
      block.call(status, dst) if block
      status
    end

    def copy_files(list, src_dir, dst_dir, &block)
      raise "source missing: #{src_dir}" unless src_dir.directory?
      FileUtils.mkdir_p(dst_dir) unless dst_dir.exist?
      status = :skip
      list.each do |fname|
        src = src_dir.join(fname)
        next unless src.file?
        dst = dst_dir.join(fname)
        file_status = :skip
        if dst.exist?
          if force
            FileUtils.cp(src, dst)
            file_status = :overwrite
          else
            file_status = :skip
          end
        else
          FileUtils.cp(src, dst)
          file_status = :create
        end
        block.call(file_status, dst) if block
        # Track overall status for return value
        status = file_status if file_status == :create || (file_status == :overwrite && status != :create)
      end
      status
    end
  end
end
