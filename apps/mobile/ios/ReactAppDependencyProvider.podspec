Pod::Spec.new do |s|
  s.name             = 'ReactAppDependencyProvider'
  s.version          = '1.0.0'
  s.summary          = 'Provides access to React Native app dependencies'
  s.homepage         = 'https://github.com/expo/expo'
  s.license          = 'MIT'
  s.author           = 'Expo'
  s.source           = { :git => 'https://github.com/expo/expo.git', :tag => s.version.to_s }
  s.platform         = :ios, '15.1'
  s.source_files     = 'ios/**/*.{h,m,mm,swift}'
  s.preserve_paths   = 'ios/**/*.{h,m,mm,swift}'
  
  s.dependency 'React-Core'
end