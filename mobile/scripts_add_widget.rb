# Adds the native bridge files to the App target and creates the CapitolWidget (WidgetKit) extension target,
# embedded in the app. Idempotent: safe to run again. Run: ruby scripts_add_widget.rb (needs the xcodeproj gem).
require 'xcodeproj'
path = File.join(__dir__, 'ios/App/App.xcodeproj')
project = Xcodeproj::Project.open(path)
app = project.targets.find { |t| t.name == 'App' } or abort 'no App target'

app_group = project.main_group['App'] || project.main_group.find_subpath('App', true)
%w[CRNativePlugin.swift MainViewController.swift].each do |f|
  next if app.source_build_phase.files_references.any? { |r| r && r.path == f }
  ref = app_group.files.find { |r| r.path == f } || app_group.new_reference(f)
  app.add_file_references([ref])
end

unless project.targets.any? { |t| t.name == 'CapitolWidget' }
  w = project.new_target(:app_extension, 'CapitolWidget', :ios, '17.0', nil, :swift)
  w.product_reference.name = 'CapitolWidget.appex'
  grp = project.main_group.find_subpath('CapitolWidget', true)
  grp.set_source_tree('<group>'); grp.set_path('CapitolWidget')
  src = grp.new_reference('CapitolWidget.swift')
  grp.new_reference('Info.plist'); grp.new_reference('CapitolWidget.entitlements')
  w.add_file_references([src])
  %w[WidgetKit SwiftUI].each { |fw| w.add_system_framework(fw) }
  w.build_configurations.each do |c|
    s = c.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.capitolreceipts.app.widget'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = 'CapitolWidget/Info.plist'
    s['CODE_SIGN_ENTITLEMENTS'] = 'CapitolWidget/CapitolWidget.entitlements'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    s['TARGETED_DEVICE_FAMILY'] = '1'
    s['SWIFT_VERSION'] = '5.0'
    s['MARKETING_VERSION'] = '1.0'
    s['CURRENT_PROJECT_VERSION'] = '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = 'AccentColor'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['CODE_SIGN_STYLE'] = 'Automatic'
  end
  embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' } || app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.dst_subfolder_spec = '13' # PlugIns
  bf = embed.add_file_reference(w.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  app.add_dependency(w)
end
project.save
puts 'targets: ' + project.targets.map(&:name).join(', ')
