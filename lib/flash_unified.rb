require "flash_unified/version"

# Load the engine when running inside Rails. Using `require` (library
# path) is the conventional approach for gems; guard with
# `defined?(Rails)` so loading the gem in non-Rails contexts won't
# attempt to load the engine.
require "flash_unified/engine" if defined?(Rails)

# Installer is a small, framework-agnostic helper used by the generator
# and needs to be available when running generator code outside of Rails.
require "flash_unified/installer"

module FlashUnified
  class Error < StandardError; end
  # Your code goes here...
end
