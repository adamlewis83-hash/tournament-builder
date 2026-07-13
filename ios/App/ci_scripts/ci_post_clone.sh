#!/bin/sh
# Xcode Cloud runs this after cloning (cwd: ios/App/ci_scripts).
# capacitor.config.json, config.xml, and public/ are gitignored and
# regenerated per-machine, so recreate them before the archive step.
set -e

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci
npx cap sync ios

# Xcode Cloud requires a Package.resolved that exactly matches the package
# graph ("a resolved file is required when automatic dependency resolution is
# disabled"). The file embeds an SPM-computed hash, so it can't be maintained
# from the Windows dev machine. It also disables automatic resolution
# MACHINE-WIDE via Xcode defaults — flip those, then resolve to generate a
# fresh Package.resolved that the system resolve step will accept.
defaults write com.apple.dt.Xcode IDEPackageOnlyUseVersionsFromResolvedFile -bool NO
defaults write com.apple.dt.Xcode IDEDisableAutomaticPackageResolution -bool NO
cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App
