require 'sketchup.rb'
require 'extensions.rb'

module MebliSpecPRES
  unless file_loaded?(__FILE__)
    ext = SketchupExtension.new('MebliSpec PRES', 'meblispec_pres/main')
    ext.description = 'Презентація меблів у SketchUp за лічені хвилини.'
    ext.version     = '1.0.2'
    ext.creator     = 'Lavka&SketchLab.pro'
    ext.copyright   = '2026'
    
    Sketchup.register_extension(ext, true)
    file_loaded(__FILE__)
  end
end
