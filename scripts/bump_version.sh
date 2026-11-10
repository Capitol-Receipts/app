#!/bin/sh
# Bump the app's release version so browsers fetch fresh scripts AND styles.
# APP_VER lives in apps/web/app-shell/main.js; the app page reads it for the style sheet links too.
V=${1:-$(date +%Y%m%d%H%M)}
sed -i "s/const APP_VER='[^']*'/const APP_VER='$V'/" apps/web/app-shell/main.js
grep -o "APP_VER='[^']*'" apps/web/app-shell/main.js
