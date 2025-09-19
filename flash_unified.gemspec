require_relative 'lib/flash_unified/version'

Gem::Specification.new do |spec|
  spec.name          = "flash_unified"
  spec.version       = FlashUnified::VERSION
  spec.authors       = ["WATANABE Hiroaki"]
  spec.email         = ["176736+hiroaki@users.noreply.github.com"]

  spec.summary       = %q{Unified flash message system for Rails applications}
  spec.description   = %q{A Rails engine that provides a unified system for displaying both server-side and client-side flash messages with consistent templates and logic. Supports Hotwire/Turbo, customizable templates, and easy integration into any Rails app.}
  spec.homepage      = "https://github.com/hiroaki/flash-unified"
  spec.license       = "MIT"
  spec.required_ruby_version = Gem::Requirement.new(">= 2.3.0")

  #spec.metadata["allowed_push_host"] = "TODO: Set to 'http://mygemserver.com'"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  # spec.metadata["changelog_uri"] = "#{spec.homepage}/blob/main/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files         = Dir.chdir(File.expand_path('..', __FILE__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]
end
