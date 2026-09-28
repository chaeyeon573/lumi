#!/usr/bin/env bash
# 폰(Expo Go)에서 AroundU 열기 — Mac / Linux.  사용: bash start-mobile.sh
# 모바일 전용 클론 폴더(~/AroundU-mobile)를 써서 다른 작업 폴더의 브랜치 전환에 영향받지 않는다.
set -e
BRANCH='claude/brave-galileo-23tdq1'
DIR="$HOME/AroundU-mobile"
if [ ! -d "$DIR/.git" ]; then git clone -b "$BRANCH" https://github.com/chaeyeon573/AroundU.git "$DIR"; fi
cd "$DIR"
git checkout -- . 2>/dev/null || true
git checkout "$BRANCH"
git pull origin "$BRANCH"
npm install --no-audit --no-fund
cd apps/mobile
# QR이 뜨면 폰의 Expo Go로 스캔. 같은 Wi-Fi면 --tunnel 없이도 되고, 회사·학교망이면 --tunnel 이 편하다.
npx expo start --tunnel --clear
