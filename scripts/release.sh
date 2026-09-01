#!/usr/bin/env bash
# npm 로그인이 끝난 뒤 한 번만 돌리면 되는 마무리 스크립트.
#
#   1) no-as-a-library 를 npm 에 배포
#   2) auto-chat 의존성을 로컬 tarball → 레지스트리 버전으로 교체
#   3) auto-chat 재설치 후 mac/win 바이너리 재빌드
#
# 사용법: npm login 후  bash scripts/release.sh
set -euo pipefail

LIB_DIR="$HOME/personal/no-as-a-library"
APP_DIR="$HOME/Developer/auto-chat"

echo "▸ npm 계정 확인"
npm whoami

echo "▸ 배포 전 검증 (build + test 는 prepublishOnly 에서도 한 번 더 돈다)"
cd "$LIB_DIR"
npm run build
npm test

echo "▸ npm 배포"
npm publish --access public

VERSION="$(node -p "require('$LIB_DIR/package.json').version")"
echo "▸ 배포됨: no-as-a-library@$VERSION"

echo "▸ 레지스트리에 올라올 때까지 대기"
for _ in $(seq 1 30); do
  if npm view "no-as-a-library@$VERSION" version >/dev/null 2>&1; then break; fi
  sleep 5
done
npm view "no-as-a-library@$VERSION" version

echo "▸ auto-chat 의존성을 vendor tarball → 레지스트리 버전으로 교체"
cd "$APP_DIR"
npm pkg set "dependencies.no-as-a-library=^$VERSION"
rm -rf node_modules/no-as-a-library vendor
npm install --no-audit --no-fund

echo "▸ 라이브러리가 레지스트리에서 설치됐는지 확인"
node -e "const {count}=require('no-as-a-library'); console.log('사유', count(), '개')"

echo "▸ 바이너리 재빌드 (mac arm64/x64, win)"
npm run dist

echo "▸ 완료"
ls -lh release/*.dmg release/*.exe 2>/dev/null | grep -v blockmap || true
