# AlgoPoolja FE

Spring AI가 생성한 알고리즘 문제를 코드 블록 퀴즈로 풀 수 있는 Vue 3 프런트엔드입니다.

## 실행

백엔드(`AlgoPoolja_BE`)를 먼저 `localhost:8080`에서 실행한 뒤:

```bash
npm install
npm run dev
```

Vite 개발 서버가 `/api`와 Google 로그인 시작 경로인 `/oauth2` 요청을 `http://localhost:8080`으로 프록시합니다. 다른 백엔드 주소를 사용하려면 다음과 같이 실행하세요.

Google Cloud Console의 개발용 승인된 리디렉션 URI에는 `http://localhost:8080/login/oauth2/code/google`을 등록합니다.

```bash
VITE_API_TARGET=http://localhost:9090 npm run dev
```

프로덕션 번들은 다음 명령으로 생성합니다.

```bash
npm run build
```
# AlgoPoolja_FE
