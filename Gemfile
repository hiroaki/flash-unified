source "https://rubygems.org"

# Specify your gem's dependencies in flash_unified.gemspec
gemspec

rails_version = ENV.fetch("RAILS_VERSION", "7.2")

if rails_version == "main"
  rails_constraint = { github: "rails/rails" }
else
  rails_constraint = "~> #{rails_version}.0"
end

gem "rails", rails_constraint
gem "turbo-rails"
