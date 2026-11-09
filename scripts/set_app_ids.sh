#!/usr/bin/env bash
# Fill in the public app IDs once the store accounts exist. Both values are public (not secrets).
#   scripts/set_app_ids.sh <APPLE_TEAM_ID> <PLAY_APP_SIGNING_SHA256>
# Team ID: developer.apple.com > Membership (10 characters). SHA-256: Play Console > Test and release > App integrity > App signing.
set -euo pipefail
team="${1:?Apple Team ID}"; sha="${2:?Play app signing SHA-256}"
[[ "$team" =~ ^[A-Z0-9]{10}$ ]] || { echo "Team ID should be 10 letters/digits"; exit 1; }
[[ "$sha" =~ ^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$ ]] || { echo "SHA-256 should look like AB:CD:... (32 pairs)"; exit 1; }
for d in .well-known site/.well-known; do
  sed -i "s/TEAMID\./${team}./g" "$d/apple-app-site-association"
  sed -i "s/REPLACE_WITH_PLAY_APP_SIGNING_SHA256/${sha^^}/g" "$d/assetlinks.json"
done
grep -q "DEVELOPMENT_TEAM" mobile/ios/App/App.xcodeproj/project.pbxproj && \
  sed -i "s/DEVELOPMENT_TEAM = [A-Z0-9]*;/DEVELOPMENT_TEAM = ${team};/g" mobile/ios/App/App.xcodeproj/project.pbxproj || true
echo "Done. Commit and push; the roadmap ticks off 'aasa' and 'assetlinks' on its next hourly check."
