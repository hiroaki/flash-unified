require "bundler/gem_tasks"
require "rake/testtask"

Rake::TestTask.new(:test) do |t|
  t.libs << "test"
  t.libs << "lib"

  # Collect test files but exclude sandbox or dummy app tests which live
  # under test/dummy or sandbox/*/test. This keeps gem-level tests fast
  # and avoids requiring a full Rails app when running `rake test`.
  # NOTE: If ENV['TEST'] is set, Rake::TestTask will prioritize that file/glob
  #       over the default t.test_files. (Undocumented behavior but current default.)
  all_tests = FileList["test/**/*_test.rb"]
  filtered = all_tests.reject do |f|
    f.match(%r{^test/dummy/}) || f.match(%r{^sandbox/.+/test/}) || f.match(%r{^test/generators/})
  end

  t.test_files = FileList[*filtered]
end

task :default => :test

