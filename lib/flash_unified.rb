require "flash_unified/version"

# Load the engine when running inside Rails. Using `require` (library
# path) is the conventional approach for gems; guard with
# `defined?(Rails)` so loading the gem in non-Rails contexts won't
# attempt to load the engine.
require "flash_unified/engine" if defined?(Rails)

module FlashUnified
  class Error < StandardError; end
  # Your code goes here...
end
