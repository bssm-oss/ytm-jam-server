# ytm-jam-server

YTM Jam용 WebSocket 동기화 서버입니다.

## 이 모듈이 하는 일
- 룸 재생 상태를 단일 소스(SSOT)로 관리
- 클라이언트 이벤트를 받아 상태 전이 적용
- 같은 룸 클라이언트에게 `STATE` 브로드캐스트

## 시작 전에
- Node.js 20+
- npm

## 설치
```bash
npm install
```

## 실행
개발 실행:
```bash
npm run dev
```

빌드 후 실행:
```bash
npm run build
npm start
```

포트:
- 기본값 `3000`
- `PORT`로 변경 가능:
```bash
PORT=3010 npm run dev
```

## 현재 이벤트 프로토콜
Client -> Server:
- `JOIN { roomId }`
- `PLAY { trackId }`
- `PAUSE`
- `SEEK { time }`
- `QUEUE_ADD { trackId }`
- `SKIP`

Server -> Client:
- `STATE { state }`

## 로컬 스모크 테스트
1. 서버 실행:
```bash
npm run dev
```
2. `ytm-jam-cli`에서:
```bash
./target/debug/ytmjam create study
./target/debug/ytmjam play "https://music.youtube.com/watch?v=abc123" --room study
```

## 문제 해결
- `EADDRINUSE`: 포트 충돌, `PORT` 변경
- 동기화 안 됨: 클라이언트가 동일 `roomId`로 JOIN했는지 확인
