#!/usr/bin/env bash
# Vendor https://github.com/projectamazonph/amazon-ph-simulators at a pinned commit.
# Usage: scripts/vendor-simgrid.sh <commit-sha>
set -euo pipefail

SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "usage: $0 <commit-sha>" >&2
  exit 64
fi

DEST="public/simgrid-v1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "https://codeload.github.com/projectamazonph/amazon-ph-simulators/tar.gz/$SHA" \
  -o "$TMP/simgrid.tar.gz"
tar -xzf "$TMP/simgrid.tar.gz" -C "$TMP"
SRC="$(find "$TMP" -maxdepth 1 -type d -name 'amazon-ph-simulators-*' | head -n 1)"

rm -rf "$DEST"
mkdir -p "$DEST"

# Copy site, excluding VCS + build artifacts.
for entry in "$SRC"/* "$SRC"/.[!.]*; do
  [ -e "$entry" ] || continue
  name="$(basename "$entry")"
  case "$name" in
    .git|node_modules|.github) continue ;;
  esac
  cp -R "$entry" "$DEST/"
done

echo "sha:$SHA" > "$DEST/VERSION.txt"

echo "Vendored SimGrid $SHA into $DEST"
