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
