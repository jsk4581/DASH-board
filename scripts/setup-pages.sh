#!/usr/bin/env bash
# One-time GitHub Pages setup for a fork of DASH.
# Enables Pages with the "GitHub Actions" build source, so every push to `main`
# builds and deploys automatically via .github/workflows/deploy.yml.
#
# Requires the GitHub CLI, authenticated:  gh auth login
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "error: GitHub CLI (gh) is required — https://cli.github.com" >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Enabling GitHub Pages (Actions) for $repo …"

# Create the Pages site (POST); if it already exists, update it (PUT).
gh api -X POST "repos/$repo/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$repo/pages" -f build_type=workflow >/dev/null

url="$(gh api "repos/$repo/pages" -q .html_url)"
echo "Done. Push to 'main' to deploy → $url"
echo "(The build base path matches your repo name automatically.)"
