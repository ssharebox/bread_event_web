# 브레드이발쏘 XR — The BackStage

무대 뒤에서 공연을 준비하는 웹 게임입니다. 서버나 빌드 과정 없이
파일을 그대로 올리면 동작합니다.

## 올리는 방법 (GitHub Pages)

1. 저장소를 만들고 아래 세 가지를 **루트에** 올립니다.

   ```
   index.html
   img/            ← 폴더째로
   .nojekyll
   ```

2. 저장소 **Settings → Pages** 로 갑니다.
3. **Source** 를 `Deploy from a branch`,
   **Branch** 를 `main` / `/ (root)` 로 두고 저장합니다.
4. 1~2분 뒤 주소가 뜹니다. 새로고침이 안 먹으면 강력 새로고침(Ctrl+Shift+R)을 하세요.

`.nojekyll` 은 GitHub이 파일을 임의로 가공하지 않게 막는 빈 파일입니다.
지워도 대개 동작하지만 두는 편이 안전합니다.

## 폴더 구조

```
index.html                본체 (HTML · CSS · JS 전부)
img/
  room/lit-0 ~ lit-4.jpg  대기실 배경 5장 (조명 단계별)
  bg-stage.jpg            리허설 무대 뒤 배경
  logo.png                메인 로고
  silhouette.png          마지막에 나타나는 실루엣
  lane-left/right.png     운전 게임 차선 버튼
  judge-perfect/good/miss.png   리듬 게임 판정 표시
```

이미지 경로는 `index.html` 위쪽 `const IMG_...` 와 `ROOM_LIT` 에 모여 있습니다.
그림을 바꾸려면 같은 이름으로 덮어쓰거나 그 경로만 고치면 됩니다.

나머지 소품(스위치, 클립보드, 트렁크, 콘, 트럭 등)은 이미지가 아니라
코드로 그립니다. `PROP_SVG` 와 `PLAN_KINDS` 에 들어 있습니다.

## 로컬에서 열어 볼 때

`index.html` 을 더블클릭해도 대부분 동작하지만, 브라우저에 따라
이미지가 막힐 수 있습니다. 그럴 때는 폴더에서 아래를 실행하세요.

```
python3 -m http.server 8000
```

그리고 `http://localhost:8000` 으로 접속합니다.

## 용량

| 항목 | 크기 |
|---|---|
| index.html | 약 168KB |
| img/ 전체 | 약 734KB |

