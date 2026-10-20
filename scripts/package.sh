#!/bin/sh
# Builds installable zips for each browser in dist/.
# Chrome, Edge and Firefox all use the same Manifest V3 files.
set -e
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
mkdir -p dist
for browser in chrome edge firefox; do
  out="dist/cfp-helper-$browser-$VERSION.zip"
  rm -f "$out"
  zip -qr "$out" manifest.json src icons -x '*.DS_Store'
  echo "$out"
done
