#!/usr/bin/env bash
# Push local main to https://github.com/abhinav429/cropaiplus
# Requires: permission to that repo (SSH key on GitHub, or HTTPS + PAT / GCM login).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE_NAME="${1:-abhinav}"
BRANCH="${2:-main}"

if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
  echo "Adding remote $REMOTE_NAME -> https://github.com/abhinav429/cropaiplus.git"
  git remote add "$REMOTE_NAME" https://github.com/abhinav429/cropaiplus.git
fi

echo "Remote:"
git remote -v | grep -E "^$REMOTE_NAME" || true
echo ""
echo "Commits to push (vs $REMOTE_NAME/$BRANCH if it exists):"
git log --oneline -3
echo ""
echo "Pushing $BRANCH -> $REMOTE_NAME ..."
git push -u "$REMOTE_NAME" "$BRANCH"
echo ""
echo "Done. Open: https://github.com/abhinav429/cropaiplus"
