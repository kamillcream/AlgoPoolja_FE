<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getCurrentUser, logout, startGoogleLogin } from './api/auth'
import { apiUrl } from './api/client'
import { getDashboardSummary, getQuizAttempts, getWrongQuizzes } from './api/dashboard'

const categories = ['전체', 'Greedy', 'DP', 'BFS', 'DFS']
const difficulties = ['쉬움', '보통', '어려움']

const category = ref('전체')
const difficulty = ref('보통')
const quiz = ref(null)
const answers = ref([])
const loading = ref(false)
const checking = ref(false)
const error = ref('')
const result = ref(null)
const activeTab = ref('problem')
const showSolution = ref(false)
const currentView = ref(new URLSearchParams(window.location.search).get('view') === 'dashboard' ? 'dashboard' : 'quiz')
const currentUser = ref(null)
const authLoading = ref(true)

const dashboard = ref(null)
const dashboardLoading = ref(false)
const dashboardError = ref('')
const attemptsPage = ref(null)
const wrongPage = ref(null)
const loadingAttempts = ref(false)
const loadingWrong = ref(false)
const categoryColors = ['#4ade80', '#60a5fa', '#c084fc', '#fbbf24', '#fb7185']

const dashboardStats = computed(() => {
  const summary = dashboard.value?.summary ?? {}
  return [
    { label: '푼 문제', value: summary.solvedCount ?? 0, unit: '문제', trend: signed(summary.solvedChange, ' 이번 주') },
    { label: '정답률', value: round(summary.accuracyRate), unit: '%', trend: signed(summary.accuracyRateChange, '%') },
    { label: '연속 학습', value: summary.currentStreakDays ?? 0, unit: '일', trend: `최고 ${summary.bestStreakDays ?? 0}일` },
    { label: '학습 시간', value: round((summary.studyMinutes ?? 0) / 60, 1), unit: '시간', trend: '이번 달' },
  ]
})

const categoryProgress = computed(() => (dashboard.value?.categoryStats ?? []).map((item, index) => ({
  name: item.label || item.category,
  solved: item.attemptedCount ?? 0,
  correct: item.correctCount ?? 0,
  color: categoryColors[index % categoryColors.length],
})))

const recentProblems = computed(() => (attemptsPage.value?.content ?? dashboard.value?.recentAttempts ?? []).map(mapAttempt))
const wrongProblems = computed(() => wrongPage.value?.content ?? dashboard.value?.wrongQuizzes ?? [])
const userNickname = computed(() => dashboard.value?.user?.nickname || '사용자')
const weeklySolvedCount = computed(() => dashboard.value?.summary?.weeklySolvedCount ?? 0)

const difficultyClass = computed(() => ({ '쉬움': 'easy', '보통': 'normal', '어려움': 'hard' })[difficulty.value])
const isComplete = computed(() => quiz.value && answers.value.length === quiz.value.blankCount)
const filledCode = computed(() => {
  if (!quiz.value) return ''
  let index = 0
  return quiz.value.blankCode.replaceAll('<BLANK>', () => answers.value[index++] ?? '____')
})

function round(value = 0, digits = 0) {
  const factor = 10 ** digits
  return Math.round(Number(value) * factor) / factor
}

function signed(value, suffix = '') {
  const number = Number(value ?? 0)
  return `${number > 0 ? '+' : ''}${round(number, 1)}${suffix}`
}

function difficultyLabel(value) {
  return ({ EASY: '쉬움', NORMAL: '보통', HARD: '어려움' })[value] || value
}

function formatAttemptedAt(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function mapAttempt(attempt) {
  return {
    ...attempt,
    result: attempt.correct ? 'correct' : 'wrong',
    difficultyLabel: difficultyLabel(attempt.difficulty),
    date: formatAttemptedAt(attempt.attemptedAt),
  }
}

async function loadDashboard() {
  dashboardLoading.value = true
  dashboardError.value = ''
  attemptsPage.value = null
  wrongPage.value = null
  try {
    dashboard.value = await getDashboardSummary()
  } catch (requestError) {
    dashboardError.value = requestError.status === 401
      ? '로그인 후 학습 기록을 확인할 수 있습니다.'
      : requestError.message
  } finally {
    dashboardLoading.value = false
  }
}

async function loadCurrentUser() {
  authLoading.value = true
  try {
    currentUser.value = await getCurrentUser()
    if (currentView.value === 'dashboard' && currentUser.value.authenticated) await loadDashboard()
  } catch (requestError) {
    currentUser.value = { authenticated: false }
    dashboardError.value = requestError.message
  } finally {
    authLoading.value = false
  }
}

async function handleLogout() {
  try {
    await logout()
    currentUser.value = { authenticated: false }
    dashboard.value = null
    attemptsPage.value = null
    wrongPage.value = null
    currentView.value = 'quiz'
  } catch (requestError) {
    error.value = requestError.message
  }
}

async function loadAllAttempts() {
  loadingAttempts.value = true
  dashboardError.value = ''
  try {
    attemptsPage.value = await getQuizAttempts()
  } catch (requestError) {
    dashboardError.value = requestError.message
  } finally {
    loadingAttempts.value = false
  }
}

async function loadAllWrongQuizzes() {
  loadingWrong.value = true
  dashboardError.value = ''
  try {
    wrongPage.value = await getWrongQuizzes()
  } catch (requestError) {
    dashboardError.value = requestError.message
  } finally {
    loadingWrong.value = false
  }
}

watch(currentView, (view) => {
  if (view === 'dashboard' && currentUser.value?.authenticated && !dashboard.value && !dashboardLoading.value) loadDashboard()
})

onMounted(loadCurrentUser)

async function generateQuiz() {
  loading.value = true
  error.value = ''
  result.value = null
  showSolution.value = false

  try {
    const response = await fetch(apiUrl('/api/quizzes'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category.value, difficulty: difficulty.value }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || '문제를 생성하지 못했습니다.')

    quiz.value = body
    answers.value = []
    activeTab.value = 'problem'
  } catch (requestError) {
    error.value = requestError.message || '서버에 연결할 수 없습니다.'
  } finally {
    loading.value = false
  }
}

function selectAnswer(block) {
  if (!quiz.value || answers.value.length >= quiz.value.blankCount) return
  answers.value.push(block)
  result.value = null
}

function removeAnswer(index) {
  answers.value.splice(index, 1)
  result.value = null
}

async function checkAnswer() {
  if (!isComplete.value) return
  checking.value = true
  error.value = ''

  try {
    const response = await fetch(apiUrl(`/api/quizzes/${quiz.value.quizId}/check`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers.value }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || '채점하지 못했습니다.')
    result.value = body
  } catch (requestError) {
    error.value = requestError.message || '서버에 연결할 수 없습니다.'
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="AlgoPoolja 홈">
        <span class="brand-mark">A</span>
        <span>AlgoPoolja</span>
      </a>
      <nav aria-label="주 메뉴">
        <button :class="{ active: currentView === 'quiz' }" @click="currentView = 'quiz'">문제 풀이</button>
        <button :class="{ active: currentView === 'dashboard' }" @click="currentView = 'dashboard'">학습 대시보드</button>
      </nav>
      <div class="auth-area">
        <span v-if="authLoading" class="auth-loading">로그인 확인 중…</span>
        <template v-else-if="currentUser?.authenticated">
          <img v-if="currentUser.picture" :src="currentUser.picture" alt="" referrerpolicy="no-referrer">
          <span>{{ currentUser.nickname }}</span>
          <button class="logout-button" @click="handleLogout">로그아웃</button>
        </template>
        <button v-else class="google-login" @click="startGoogleLogin">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 6Z"/></svg>
          Google로 로그인
        </button>
      </div>
    </header>

    <main v-if="currentView === 'quiz'" id="workspace">
      <section class="generator-bar" aria-label="문제 생성 설정">
        <div class="generator-title">
          <span class="step-number">01</span>
          <div><strong>새 문제</strong><small>조건을 고르고 AI 문제를 생성하세요</small></div>
        </div>
        <label>
          <span>알고리즘</span>
          <select v-model="category" :disabled="loading">
            <option v-for="item in categories" :key="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>난이도</span>
          <select v-model="difficulty" :disabled="loading">
            <option v-for="item in difficulties" :key="item">{{ item }}</option>
          </select>
        </label>
        <button class="primary-button" :disabled="loading" @click="generateQuiz">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '문제 생성 중…' : quiz ? '다른 문제 생성' : '문제 생성' }}
        </button>
      </section>

      <div v-if="error" class="alert error-alert" role="alert">
        <strong>요청을 완료하지 못했습니다.</strong><span>{{ error }}</span>
        <button aria-label="오류 닫기" @click="error = ''">×</button>
      </div>

      <section v-if="loading && !quiz" class="loading-stage" aria-live="polite">
        <div class="loader-orbit"><span></span></div>
        <strong>AI가 문제를 설계하고 있습니다</strong>
        <p>문제, 테스트케이스, 빈칸 코드를 순서대로 생성합니다.</p>
        <div class="loading-steps"><span class="done">문제 설계</span><span>테스트 생성</span><span>코드 빈칸화</span></div>
      </section>

      <section v-else-if="quiz" class="problem-layout">
        <article class="problem-panel">
          <div class="panel-tabs" role="tablist">
            <button :class="{ active: activeTab === 'problem' }" @click="activeTab = 'problem'">문제</button>
            <button :class="{ active: activeTab === 'tests' }" @click="activeTab = 'tests'">테스트케이스 <b>{{ quiz.testcases.length }}</b></button>
          </div>

          <div class="problem-content">
            <template v-if="activeTab === 'problem'">
              <div class="problem-meta">
                <span class="difficulty" :class="difficultyClass">{{ difficulty }}</span>
                <span>{{ category === '전체' ? '알고리즘' : category }}</span>
                <span>빈칸 {{ quiz.blankCount }}개</span>
              </div>
              <h1>{{ quiz.title }}</h1>
              <p class="description">{{ quiz.description }}</p>
              <h2>입출력 예시</h2>
              <div class="test-grid">
                <div v-for="(test, index) in quiz.testcases" :key="index" class="test-card">
                  <div><span>예제 {{ index + 1 }}</span></div>
                  <dl><dt>입력</dt><dd><code>{{ test.input }}</code></dd><dt>출력</dt><dd><code>{{ test.output }}</code></dd></dl>
                </div>
              </div>
            </template>
            <template v-else>
              <h1>테스트케이스</h1>
              <p class="section-caption">주어진 입력에 대해 정확한 출력을 만들어야 합니다.</p>
              <div v-for="(test, index) in quiz.testcases" :key="index" class="test-detail">
                <strong>테스트 {{ index + 1 }}</strong>
                <div><label>입력</label><pre>{{ test.input }}</pre></div>
                <div><label>출력</label><pre>{{ test.output }}</pre></div>
              </div>
            </template>
          </div>
        </article>

        <section class="solver-panel">
          <div class="editor-head">
            <div><span class="language-dot"></span><strong>Python 3</strong></div>
            <span>{{ answers.length }} / {{ quiz.blankCount }} 완성</span>
          </div>
          <div class="code-editor">
            <div class="line-numbers" aria-hidden="true"><span v-for="line in filledCode.split('\n').length" :key="line">{{ line }}</span></div>
            <pre><code>{{ filledCode }}</code></pre>
          </div>

          <div class="answer-dock">
            <div class="dock-heading">
              <div><span class="step-number">02</span><div><strong>코드 블록 선택</strong><small>빈칸 순서대로 선택하세요</small></div></div>
              <button v-if="answers.length" class="text-button" @click="answers = []; result = null">초기화</button>
            </div>

            <div class="slots" :aria-label="`선택한 답 ${answers.length}개`">
              <button v-for="index in quiz.blankCount" :key="index" :class="['answer-slot', { filled: answers[index - 1] }]" @click="answers[index - 1] && removeAnswer(index - 1)">
                <span>{{ index }}</span><code>{{ answers[index - 1] || '선택 대기' }}</code><b v-if="answers[index - 1]">×</b>
              </button>
            </div>

            <div class="block-pool">
              <button v-for="(block, index) in quiz.answerBlocks" :key="`${block}-${index}`" :disabled="answers.length >= quiz.blankCount" @click="selectAnswer(block)">
                <code>{{ block }}</code><span>+</span>
              </button>
            </div>

            <div v-if="result" :class="['result-box', result.correct ? 'correct' : 'wrong']" role="status">
              <span>{{ result.correct ? '✓' : '!' }}</span>
              <div><strong>{{ result.correct ? '정답입니다' : '아직 정답이 아닙니다' }}</strong><p>{{ result.message }}</p></div>
            </div>

            <div class="submit-row">
              <span v-if="!isComplete">빈칸 {{ quiz.blankCount - answers.length }}개가 남았습니다.</span>
              <span v-else>모든 빈칸을 채웠습니다.</span>
              <button class="submit-button" :disabled="!isComplete || checking" @click="checkAnswer">{{ checking ? '채점 중…' : '정답 제출' }}</button>
            </div>

            <details class="solution" @toggle="showSolution = $event.target.open">
              <summary>{{ showSolution ? '정답 코드 접기' : '정답 코드 보기' }}</summary>
              <pre><code>{{ quiz.answerCode }}</code></pre>
            </details>
          </div>
        </section>
      </section>

      <section v-else class="empty-stage">
        <div class="terminal-visual" aria-hidden="true">
          <div class="terminal-bar"><i></i><i></i><i></i><span>challenge.py</span></div>
          <pre><span class="muted">01</span> <b>def</b> solve(numbers):
<span class="muted">02</span>     answer = <em>&lt;BLANK&gt;</em>
<span class="muted">03</span>     <b>for</b> number <b>in</b> numbers:
<span class="muted">04</span>         answer += number
<span class="muted">05</span>     <b>return</b> answer</pre>
        </div>
        <div>
          <span class="eyebrow">AI GENERATED CHALLENGE</span>
          <h1>코드를 읽고,<br><em>빈칸을 완성하세요.</em></h1>
          <p>알고리즘 유형과 난이도를 선택하면 새로운 문제와 코드 블록 퀴즈를 생성합니다.</p>
          <button class="primary-button start-button" @click="generateQuiz">첫 문제 생성하기 <span>→</span></button>
        </div>
      </section>
    </main>

    <main v-else class="dashboard" id="dashboard">
      <section v-if="authLoading" class="loading-stage dashboard-loading" aria-live="polite">
        <div class="loader-orbit"><span></span></div>
        <strong>로그인 정보를 확인하고 있습니다</strong>
      </section>
      <section v-else-if="!currentUser?.authenticated" class="auth-required">
        <span class="brand-mark">A</span>
        <h1>로그인하고 학습 기록을 확인하세요.</h1>
        <p>풀이 기록, 오답 노트, 유형별 정답률을 계정에 안전하게 저장합니다.</p>
        <button class="google-login large" @click="startGoogleLogin">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 6Z"/></svg>
          Google로 계속하기
        </button>
      </section>
      <template v-else>
      <div v-if="dashboardError" class="alert error-alert" role="alert">
        <strong>대시보드를 불러오지 못했습니다.</strong><span>{{ dashboardError }}</span>
        <button aria-label="다시 시도" @click="loadDashboard">↻</button>
      </div>

      <section v-if="dashboardLoading" class="loading-stage dashboard-loading" aria-live="polite">
        <div class="loader-orbit"><span></span></div>
        <strong>학습 기록을 불러오고 있습니다</strong>
      </section>

      <template v-else>
      <section class="dashboard-hero">
        <div>
          <span class="eyebrow">MY LEARNING REPORT</span>
          <h1>안녕하세요, <em>{{ userNickname }} 님.</em></h1>
          <p>이번 주에는 {{ weeklySolvedCount }}문제를 풀었어요. 꾸준한 학습 기록을 이어가 보세요.</p>
        </div>
        <button class="primary-button" @click="currentView = 'quiz'">오늘의 문제 풀기 <span>→</span></button>
      </section>

      <section class="stat-grid" aria-label="학습 요약">
        <article v-for="stat in dashboardStats" :key="stat.label" class="stat-card">
          <div><span>{{ stat.label }}</span><small>{{ stat.trend }}</small></div>
          <strong>{{ stat.value }}<em>{{ stat.unit }}</em></strong>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="dashboard-card progress-card">
          <div class="card-heading">
            <div><span class="step-number">01</span><div><strong>유형별 성취도</strong><small>최근 30일 학습 기록</small></div></div>
            <span class="card-note">정답 / 풀이</span>
          </div>
          <div class="progress-list">
            <div v-for="item in categoryProgress" :key="item.name" class="progress-row">
              <strong>{{ item.name }}</strong>
              <div class="progress-track"><i :style="{ width: `${item.solved ? item.correct / item.solved * 100 : 0}%`, background: item.color }"></i></div>
              <span>{{ item.correct }} / {{ item.solved }}</span>
            </div>
            <p v-if="!categoryProgress.length" class="dashboard-empty">아직 유형별 학습 기록이 없습니다.</p>
          </div>
        </article>

        <article class="dashboard-card retry-card">
          <div class="card-heading">
            <div><span class="step-number">02</span><div><strong>다시 풀어볼 문제</strong><small>최근 틀린 문제 {{ wrongProblems.length }}개</small></div></div>
            <button class="text-button" :disabled="loadingWrong" @click="loadAllWrongQuizzes">{{ loadingWrong ? '불러오는 중…' : '전체 보기' }}</button>
          </div>
          <div class="retry-list">
            <button v-for="problem in wrongProblems" :key="problem.quizId" @click="currentView = 'quiz'">
              <span class="retry-icon">!</span>
              <div><strong>{{ problem.title }}</strong><small>{{ problem.category }} · {{ difficultyLabel(problem.difficulty) }}</small></div>
              <span>다시 풀기 →</span>
            </button>
          </div>
          <div v-if="!wrongProblems.length" class="retry-empty"><span>✓</span><p>복습할 오답 문제가 없습니다.<br>새로운 문제에 도전해 보세요.</p></div>
        </article>

        <article class="dashboard-card history-card">
          <div class="card-heading">
            <div><span class="step-number">03</span><div><strong>최근 풀이 기록</strong><small>맞힌 문제와 틀린 문제를 한눈에 확인하세요</small></div></div>
            <button class="text-button" :disabled="loadingAttempts" @click="loadAllAttempts">{{ loadingAttempts ? '불러오는 중…' : '전체 기록' }}</button>
          </div>
          <div class="history-table">
            <div class="history-head"><span>문제</span><span>유형</span><span>난이도</span><span>결과</span><span>풀이 시각</span></div>
            <div v-for="problem in recentProblems" :key="problem.attemptId" class="history-row">
              <strong>{{ problem.title }}</strong><span>{{ problem.category }}</span><span>{{ problem.difficultyLabel }}</span>
              <b :class="problem.result">{{ problem.result === 'correct' ? '정답' : '오답' }}</b><time>{{ problem.date }}</time>
            </div>
            <p v-if="!recentProblems.length" class="dashboard-empty">아직 풀이 기록이 없습니다.</p>
          </div>
        </article>
      </section>
      </template>
      </template>
    </main>

    <footer><span>AlgoPoolja</span><p>AI로 연습하는 알고리즘 코드 퀴즈</p><nav class="policy-links"><a href="/privacy">개인정보처리방침</a><a href="/terms">서비스 이용약관</a></nav><small>Spring AI · Vue.js</small></footer>
  </div>
</template>
