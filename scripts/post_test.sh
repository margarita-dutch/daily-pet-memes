#!/usr/bin/env bash
# Convenience wrapper: trigger one manual test post.
# Usage: ./scripts/post_test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
exec node src/post.js --test
