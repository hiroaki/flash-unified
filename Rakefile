require "bundler/gem_tasks"
require "rake/testtask"

Rake::TestTask.new(:test) do |t|
  t.libs << "test"
  t.libs << "lib"

  # Run only unit-level tests by default (pure Ruby, no Rails boot).
  # Use TEST=... for ad-hoc files, or rake test:generators / test:system for other layers.
  t.test_files = FileList[
    "test/unit/**/*_test.rb",
    "test/lib/**/*_test.rb"
  ]
end

task :default => :test


# Suite-specific test tasks for convenience. Prefer these over TEST=... globs
# when running an entire layer. Use TEST=... only for single-file or ad-hoc runs.
namespace :test do
  desc "Run unit tests (fast; excludes generators/system/dummy/sandbox)"
  Rake::TestTask.new(:unit) do |t|
    t.libs << "test"
    t.libs << "lib"
    # Explicitly include unit-layer tests only (pure Ruby, no Rails boot).
    # Do not include top-level tests here, as some require test_helper (Rails).
    t.test_files = FileList[
      "test/unit/**/*_test.rb",
      "test/lib/**/*_test.rb"
    ]
  end

  desc "Run generator tests"
  Rake::TestTask.new(:generators) do |t|
    t.libs << "test"
    t.libs << "lib"
    # Scope strictly to generator tests. These intentionally load test/test_helper
    # (which boots the dummy app) to exercise Rails::Generators behavior.
    t.test_files = FileList[
      "test/generators/**/*_test.rb"
    ]
  end

  desc "Run system tests"
  Rake::TestTask.new(:system) do |t|
    t.libs << "test"
    t.libs << "lib"
    t.test_files = FileList["test/system/**/*_test.rb"]
  end
end

