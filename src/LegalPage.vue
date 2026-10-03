<script setup>
import { computed } from 'vue'
import logoUrl from './assets/algopoolja_logo.png'

const props = defineProps({ type: { type: String, required: true } })
const isPrivacy = computed(() => props.type === 'privacy')
</script>

<template>
  <div class="legal-shell">
    <header class="legal-header">
      <a class="brand" href="/" aria-label="AlgoPoolja 홈">
        <img class="brand-logo" :src="logoUrl" alt=""><span>AlgoPoolja</span>
      </a>
      <a href="/">서비스로 돌아가기 →</a>
    </header>

    <main class="legal-page">
      <p class="eyebrow">ALGOPoolja POLICY</p>
      <h1>{{ isPrivacy ? '개인정보처리방침' : '서비스 이용약관' }}</h1>
      <p class="legal-intro">
        {{ isPrivacy
          ? 'AlgoPoolja는 이용자의 개인정보를 소중히 여기며, 필요한 정보만 최소한으로 처리합니다.'
          : 'AlgoPoolja를 이용하기 전에 아래 내용을 확인해 주세요.' }}
      </p>
      <p class="effective-date">시행일: 2026년 9월 20일</p>

      <template v-if="isPrivacy">
        <section>
          <h2>1. 수집하는 개인정보</h2>
          <p>Google 로그인을 사용하는 경우 Google로부터 다음 정보를 제공받을 수 있습니다.</p>
          <ul>
            <li>Google 계정 고유 식별자</li>
            <li>이름 또는 닉네임</li>
            <li>이메일 주소</li>
            <li>프로필 이미지</li>
          </ul>
          <p>서비스 이용 과정에서 문제 풀이 기록, 제출 답안, 정답 여부, 풀이 시각 및 서비스 접속 로그가 생성될 수 있습니다.</p>
        </section>

        <section>
          <h2>2. 개인정보 이용 목적</h2>
          <ul>
            <li>사용자 로그인 및 계정 식별</li>
            <li>사용자별 학습 기록, 정답률, 오답 노트 제공</li>
            <li>서비스 오류 확인, 보안 유지 및 기능 개선</li>
          </ul>
          <p>Google 사용자 데이터는 위 목적에만 사용하며 광고, 판매 또는 신용 평가에 사용하지 않습니다.</p>
        </section>

        <section>
          <h2>3. 보유 및 파기</h2>
          <p>개인정보는 서비스 제공에 필요한 기간 동안만 보유하고, 이용 목적이 달성되거나 삭제 요청을 받으면 지체 없이 파기합니다. 법령상 보존 의무가 있는 경우에는 해당 기간 동안 분리하여 보관합니다.</p>
        </section>

        <section>
          <h2>4. 제3자 제공 및 처리 위탁</h2>
          <p>AlgoPoolja는 이용자의 개인정보를 판매하지 않으며, 법령에 근거하거나 이용자의 동의를 받은 경우를 제외하고 제3자에게 제공하지 않습니다. Google 로그인 과정에는 Google의 개인정보처리방침과 약관이 적용됩니다.</p>
        </section>

        <section>
          <h2>5. 쿠키 및 세션</h2>
          <p>로그인 상태 유지와 보안을 위해 세션 쿠키를 사용합니다. 이 쿠키는 로그인 인증에 필요하며 브라우저 설정 또는 로그아웃을 통해 삭제할 수 있습니다.</p>
        </section>

        <section>
          <h2>6. 이용자의 권리</h2>
          <p>이용자는 자신의 개인정보에 대한 열람, 수정, 삭제 및 처리 정지를 요청할 수 있습니다. Google 계정 설정에서 AlgoPoolja의 접근 권한을 직접 철회할 수도 있습니다.</p>
        </section>

        <section>
          <h2>7. 문의 및 삭제 요청</h2>
          <p>개인정보 또는 계정 데이터 삭제에 관한 요청은 프로젝트의 <a href="https://github.com/kamillcream/AlgoPoolja_FE/issues" target="_blank" rel="noreferrer">GitHub 문의 창구</a>를 통해 접수할 수 있습니다.</p>
        </section>

        <section>
          <h2>8. 방침 변경</h2>
          <p>본 방침이 변경되는 경우 시행 전에 서비스 화면 또는 저장소를 통해 안내합니다.</p>
        </section>
      </template>

      <template v-else>
        <section>
          <h2>1. 목적</h2>
          <p>본 약관은 AlgoPoolja가 제공하는 AI 기반 알고리즘 학습 및 코드 퀴즈 서비스의 이용 조건을 정합니다.</p>
        </section>

        <section>
          <h2>2. 서비스 내용</h2>
          <ul>
            <li>AI가 생성한 알고리즘 문제 및 코드 빈칸 퀴즈</li>
            <li>답안 채점과 해설</li>
            <li>사용자별 풀이 기록, 학습 통계 및 오답 관리</li>
          </ul>
          <p>서비스의 구체적인 내용은 운영상 필요에 따라 변경될 수 있습니다.</p>
        </section>

        <section>
          <h2>3. 계정과 이용자의 책임</h2>
          <p>이용자는 본인의 Google 계정을 통해 로그인하며, 계정 정보를 안전하게 관리해야 합니다. 다른 사람의 계정을 무단으로 사용하거나 서비스 운영을 방해해서는 안 됩니다.</p>
        </section>

        <section>
          <h2>4. 금지 행위</h2>
          <ul>
            <li>서비스 또는 서버에 대한 비정상적인 접근과 자동화된 과도한 요청</li>
            <li>타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용하는 행위</li>
            <li>서비스의 취약점을 악용하거나 운영을 방해하는 행위</li>
            <li>생성 결과를 허위 사실 유포, 부정행위 등 부적절한 목적으로 사용하는 행위</li>
          </ul>
        </section>

        <section>
          <h2>5. AI 생성 콘텐츠</h2>
          <p>AI가 생성한 문제, 코드 및 해설에는 오류가 포함될 수 있습니다. 학습 보조 목적으로 활용해야 하며, 중요한 판단이나 실제 시스템 적용 전에는 이용자가 직접 정확성을 확인해야 합니다.</p>
        </section>

        <section>
          <h2>6. 서비스 변경 및 중단</h2>
          <p>점검, 장애, 외부 API 변경 또는 운영상 필요에 따라 서비스의 일부 또는 전부가 변경되거나 일시 중단될 수 있습니다.</p>
        </section>

        <section>
          <h2>7. 책임의 제한</h2>
          <p>AlgoPoolja는 고의 또는 중대한 과실이 없는 한 무료로 제공되는 서비스의 일시적 중단, AI 생성 결과의 오류, 이용자의 사용으로 발생한 간접 손해에 대해 책임을 부담하지 않습니다. 관계 법령상 제한할 수 없는 책임은 제외합니다.</p>
        </section>

        <section>
          <h2>8. 약관 변경 및 문의</h2>
          <p>약관을 변경하는 경우 시행 전에 서비스 화면 또는 저장소를 통해 안내합니다. 서비스 관련 문의는 <a href="https://github.com/kamillcream/AlgoPoolja_FE/issues" target="_blank" rel="noreferrer">GitHub 문의 창구</a>를 이용해 주세요.</p>
        </section>
      </template>
    </main>

    <footer class="legal-footer">
      <span>AlgoPoolja</span>
      <nav><a href="/privacy">개인정보처리방침</a><a href="/terms">서비스 이용약관</a></nav>
    </footer>
  </div>
</template>

<style scoped>
.legal-shell{min-height:100vh;background:#0d0f12}.legal-header{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 920px)/2));border-bottom:1px solid var(--border)}.legal-header>a:last-child{color:#8d95a1;text-decoration:none;font-size:.78rem}.legal-header>a:last-child:hover{color:#fff}.legal-page{width:min(800px,calc(100% - 40px));padding:72px 0 96px}.legal-page h1{margin:16px 0 18px;font-size:clamp(2.5rem,6vw,4.5rem);letter-spacing:-.06em}.legal-intro{max-width:650px;color:#b4bac3;font-size:1.05rem;line-height:1.8}.effective-date{margin:24px 0 55px;color:#69717d;font:.72rem var(--mono)}section{padding:30px 0;border-top:1px solid var(--border)}section h2{margin:0 0 16px;font-size:1.08rem}section p,section li{color:#aab1bc;font-size:.9rem;line-height:1.85}section p{margin:0 0 12px}section ul{margin:0 0 12px;padding-left:20px}section a{color:var(--bright)}.legal-footer{width:min(800px,calc(100% - 40px));min-height:86px}.legal-footer nav{display:flex;gap:18px;margin-left:auto}.legal-footer a{color:#7e8692;text-decoration:none}.legal-footer a:hover{color:#fff}@media(max-width:600px){.legal-header{padding:0 20px}.legal-page{padding-top:48px}.legal-footer{align-items:flex-start;flex-direction:column;justify-content:center}.legal-footer nav{margin-left:0}}
</style>

<style scoped>
.brand-logo {
  width: 30px;
  height: 30px;
  display: block;
  object-fit: contain;
  border-radius: 7px;
}
</style>
