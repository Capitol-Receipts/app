#!/bin/sh
# Bump the app's release version so browsers fetch fresh scripts AND styles.
V=${1:-$(date +%Y%m%d%H%M)}
sed -i "s/const APP_VER='[^']*'/const APP_VER='$V'/; s/\(\/app\/css\/[a-z]*\.css?v=\)[0-9a-z]*/\1$V/g" index.html
grep -o "APP_VER='[^']*'\|css?v=[0-9a-z]*" index.html | sort | uniq -c
