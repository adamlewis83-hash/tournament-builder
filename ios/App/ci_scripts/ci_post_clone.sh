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

# Xcode Cloud's own resolve step runs with automatic dependency resolution
# DISABLED and errors if Package.resolved is missing or stale ("a resolved
# file is required..."). The file embeds an SPM-computed hash, so it can't be
# maintained from the Windows dev machine — generate it fresh here instead
# (our invocation is allowed to resolve), so the system step finds it current.
cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App
