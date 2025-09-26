require_relative 'lib/flash_unified/version'

Gem::Specification.new do |spec|
  spec.name          = "flash_unified"
  spec.version       = FlashUnified::VERSION
  spec.authors       = ["hiroaki"]
  spec.email         = ["176736+hiroaki@users.noreply.github.com"]

  spec.summary       = %q{Unified server/client flash messages for Rails with consistent templates}
  spec.description   = %q{Unified server/client flash messages for Rails with consistent templates—Turbo-ready, customizable, easy to integrate.}
  spec.homepage      = "https://github.com/hiroaki/flash-unified"
  spec.license       = "0BSD"
  spec.required_ruby_version = Gem::Requirement.new(">= 3.2.0")

  #spec.metadata["allowed_push_host"] = "TODO: Set to 'http://mygemserver.com'"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  # spec.metadata["changelog_uri"] = "#{spec.homepage}/blob/main/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files         = Dir.chdir(File.expand_path('..', __FILE__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features|gemfiles)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # turbo-rails is used by host apps to provide Turbo/Hotwire integration; include
  # it as a runtime dependency so the gem's JS + helpers work out of the box.
  spec.add_dependency "turbo-rails", ">= 1.0"

  #
  spec.add_development_dependency "appraisal"
  spec.add_development_dependency "capybara"
  spec.add_development_dependency "cuprite"
  spec.add_development_dependency "minitest"
  spec.add_development_dependency "puma", ">= 5.0"
  spec.add_development_dependency "rake"
  spec.add_development_dependency "sprockets-rails"
  spec.add_development_dependency "sqlite3", ">= 1.4"
end
