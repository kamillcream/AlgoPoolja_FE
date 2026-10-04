<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getCurrentUser, logout, startGoogleLogin } from './api/auth'
import { apiFetch } from './api/client'
import { getDashboardSummary, getQuizAttempts, getWrongQuizzes } from './api/dashboard'
import logoUrl from './assets/algopoolja_logo.png'

const categories = [
  '전체', '구현/시뮬레이션', '스택/큐', '해시/정렬', '이분 탐색',
  '힙/우선순위 큐', '완전탐색/백트래킹', '그래프', '문자열/파싱',
  'Greedy', 'DP', 'BFS', 'DFS',
]
const difficulties = ['쉬움', '보통', '어려움']
const languages = [
  { value: 'PYTHON', label: 'Python 3' },
  { value: 'JAVASCRIPT', label: 'JavaScript (Node.js)' },
  { value: 'JAVA', label: 'Java 17' },
  { value: 'CPP', label: 'C++17' },
]

const category = ref('전체')
const difficulty = ref('보통')
const language = ref('PYTHON')
const quiz = ref(null)
const answers = ref([])
const loading = ref(false)
const checking = ref(false)
const error = ref('')
const result = ref(null)
const activeTab = ref('problem')
const showSolution = ref(false)
const initialView = new URLSearchParams(window.location.search).get('view')
const currentView = ref(['dashboard', 'ranking'].includes(initialView) ? initialView : 'quiz')
const currentUser = ref(null)
const authLoading = ref(true)

const dashboard = ref(null)
const dashboardLoading = ref(false)
const dashboardError = ref('')
const attemptsPage = ref(null)
const wrongPage = ref(null)
const loadingAttempts = ref(false)
const loadingWrong = ref(false)
const retryingQuizId = ref(null)
const quizStartedAt = ref(null)
const categoryColors = ['#4ade80', '#60a5fa', '#c084fc', '#fbbf24', '#fb7185']

const dashboardStats = computed(() => {
  const summary = dashboard.value?.summary ?? {}
  return [
    { label: '푼 문제', value: summary.solvedCount ?? 0, unit: '문제', trend: signed(summary.solvedChange, ' 이번 주') },
    { label: '정답률', value: round(summary.accuracyRate), unit: '%', trend: signed(summary.accuracyRateChange, '%') },
    { label: '연속 학습', value: summary.currentStreakDays ?? 0, unit: '일', trend: `최고 ${summary.bestStreakDays ?? 0}일` },
    { label: '학습 시간', value: formatStudyTime(summary.studyMinutes), unit: '', trend: '이번 달' },
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
const weeklyRankings = computed(() => dashboard.value?.weeklyRankings ?? [])
const myWeeklyRanking = computed(() => dashboard.value?.myWeeklyRanking ?? null)

const difficultyClass = computed(() => ({ '쉬움': 'easy', '보통': 'normal', '어려움': 'hard' })[difficulty.value])
const languageLabel = computed(() => languages.find((item) => item.value === (quiz.value?.language || language.value))?.label || language.value)
const isComplete = computed(() => quiz.value
  && answers.value.length === quiz.value.blankCount
  && answers.value.every((answer) => answer.trim().length > 0))
const filledCode = computed(() => {
  if (!quiz.value) return ''
  let index = 0
  return quiz.value.blankCode.replaceAll('<BLANK>', () => answers.value[index++]?.trim() || '____')
})

function round(value = 0, digits = 0) {
  const factor = 10 ** digits
  return Math.round(Number(value) * factor) / factor
}

function formatStudyTime(minutes) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes ?? 0)))
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  if (hours === 0) return `${remainingMinutes}분`
  if (remainingMinutes === 0) return `${hours}시간`
  return `${hours}시간 ${remainingMinutes}분`
}

function signed(value, suffix = '') {
  const number = Number(value ?? 0)
  return `${number > 0 ? '+' : ''}${round(number, 1)}${suffix}`
}

function difficultyLabel(value) {
  return ({ EASY: '쉬움', NORMAL: '보통', HARD: '어려움' })[value] || value
}

function badgeLabel(value) {
  return ({ GOLD: 'GOLD', SILVER: 'SILVER', BRONZE: 'BRONZE', TOP_10: 'TOP 10' })[value] || ''
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
    if (['dashboard', 'ranking'].includes(currentView.value) && currentUser.value.authenticated) await loadDashboard()
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
  if (['dashboard', 'ranking'].includes(view) && currentUser.value?.authenticated && !dashboard.value && !dashboardLoading.value) loadDashboard()
})

onMounted(loadCurrentUser)

async function generateQuiz() {
  loading.value = true
  error.value = ''
  result.value = null
  showSolution.value = false

  try {
    const response = await apiFetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category.value, difficulty: difficulty.value, language: language.value }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || '문제를 생성하지 못했습니다.')

    quiz.value = body
    language.value = body.language || language.value
    quizStartedAt.value = new Date().toISOString()
    answers.value = Array.from({ length: body.blankCount }, () => '')
    activeTab.value = 'problem'
  } catch (requestError) {
    error.value = requestError.message || '서버에 연결할 수 없습니다.'
  } finally {
    loading.value = false
  }
}

function startQuiz() {
  if (!currentUser.value?.authenticated) {
    startGoogleLogin()
    return
  }
  generateQuiz()
}

async function openWrongQuiz(problem) {
  retryingQuizId.value = problem.quizId
  dashboardError.value = ''

  try {
    const response = await apiFetch(`/api/quizzes/${problem.quizId}`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || '오답 문제를 불러오지 못했습니다.')

    quiz.value = body
    category.value = categories.includes(body.category) ? body.category : category.value
    difficulty.value = difficulties.includes(body.difficulty) ? body.difficulty : difficulty.value
    language.value = body.language || language.value
    answers.value = Array.from({ length: body.blankCount }, () => '')
    result.value = null
    showSolution.value = false
    activeTab.value = 'problem'
    quizStartedAt.value = new Date().toISOString()
    currentView.value = 'quiz'
  } catch (requestError) {
    dashboardError.value = requestError.message || '오답 문제를 불러오지 못했습니다.'
  } finally {
    retryingQuizId.value = null
  }
}

function updateAnswer(index, value) {
  answers.value[index] = value
  result.value = null
}

function resetAnswers() {
  if (!quiz.value) return
  answers.value = Array.from({ length: quiz.value.blankCount }, () => '')
  result.value = null
}

async function checkAnswer() {
  if (!isComplete.value) return
  checking.value = true
  error.value = ''

  try {
    const response = await apiFetch(`/api/quizzes/${quiz.value.quizId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers.value.map((answer) => answer.trim()), startedAt: quizStartedAt.value }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || '채점하지 못했습니다.')
    result.value = body
    if (body.correct) {
      dashboard.value = null
      attemptsPage.value = null
      wrongPage.value = null
    }
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
        <img class="brand-logo" :src="logoUrl" alt="">
        <span>AlgoPoolja</span>
      </a>
      <nav aria-label="주 메뉴">
        <button :class="{ active: currentView === 'quiz' }" @click="currentView = 'quiz'">문제 풀이</button>
        <button :class="{ active: currentView === 'dashboard' }" @click="currentView = 'dashboard'">학습 대시보드</button>
        <button :class="{ active: currentView === 'ranking' }" @click="currentView = 'ranking'">주간 랭킹</button>
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
          <select v-model="category" :disabled="loading || authLoading || !currentUser?.authenticated">
            <option v-for="item in categories" :key="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>난이도</span>
          <select v-model="difficulty" :disabled="loading || authLoading || !currentUser?.authenticated">
            <option v-for="item in difficulties" :key="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>언어</span>
          <select v-model="language" :disabled="loading || authLoading || !currentUser?.authenticated">
            <option v-for="item in languages" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <button class="primary-button" :disabled="loading || authLoading" @click="startQuiz">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '문제 생성 중…' : !currentUser?.authenticated ? '로그인 후 문제 생성' : quiz ? '다른 문제 생성' : '문제 생성' }}
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
            <div><span class="language-dot"></span><strong>{{ languageLabel }}</strong></div>
            <span>{{ answers.length }} / {{ quiz.blankCount }} 완성</span>
          </div>
          <div class="code-editor">
            <div class="line-numbers" aria-hidden="true"><span v-for="line in filledCode.split('\n').length" :key="line">{{ line }}</span></div>
            <pre><code>{{ filledCode }}</code></pre>
          </div>

          <div class="answer-dock">
            <div class="dock-heading">
              <div><span class="step-number">02</span><div><strong>단답형 입력</strong><small>빈칸 순서대로 코드 조각을 직접 입력하세요</small></div></div>
              <button v-if="answers.some((answer) => answer)" class="text-button" @click="resetAnswers">초기화</button>
            </div>

            <div class="answer-inputs" aria-label="빈칸 답안 입력">
              <label v-for="index in quiz.blankCount" :key="index" class="answer-input">
                <span>{{ index }}</span>
                <input
                  :value="answers[index - 1]"
                  :placeholder="`빈칸 ${index}의 코드 조각`"
                  autocomplete="off"
                  spellcheck="false"
                  @input="updateAnswer(index - 1, $event.target.value)"
                >
              </label>
            </div>
            <div v-if="result" :class="['result-box', result.correct ? 'correct' : 'wrong']" role="status">
              <span>{{ result.correct ? '✓' : '!' }}</span>
              <div><strong>{{ result.correct ? '정답입니다' : '아직 정답이 아닙니다' }}</strong><p>{{ result.message }}</p></div>
            </div>

            <div class="submit-row">
              <span v-if="!isComplete">빈칸 {{ answers.filter((answer) => !answer.trim()).length }}개가 남았습니다.</span>
              <span v-else>모든 빈칸을 채웠습니다.</span>
              <button class="submit-button" :disabled="!isComplete || checking" @click="checkAnswer">{{ checking ? '채점 중…' : '정답 제출' }}</button>
            </div>

            <details class="hint">
              <summary>힌트 보기</summary>
              <p>{{ quiz.hint || '문제의 입력 크기와 자료구조 선택을 먼저 확인해보세요.' }}</p>
            </details>

            <details class="solution" @toggle="showSolution = $event.target.open">
              <summary>{{ showSolution ? '정답 코드 접기' : '정답 코드 보기' }}</summary>
              <pre><code>{{ quiz.answerCode }}</code></pre>
              <div class="explanation">
                <h3>풀이 과정</h3>
                <p>{{ quiz.explanation || '풀이 설명이 준비되지 않았습니다.' }}</p>
                <p v-if="quiz.algorithm"><strong>핵심 알고리즘</strong> {{ quiz.algorithm }}</p>
                <div class="complexity" v-if="quiz.timeComplexity || quiz.spaceComplexity">
                  <span v-if="quiz.timeComplexity"><strong>시간</strong> {{ quiz.timeComplexity }}</span>
                  <span v-if="quiz.spaceComplexity"><strong>공간</strong> {{ quiz.spaceComplexity }}</span>
                </div>
                <template v-if="quiz.commonMistakes?.length">
                  <h3>자주 하는 실수</h3>
                  <ul><li v-for="mistake in quiz.commonMistakes" :key="mistake">{{ mistake }}</li></ul>
                </template>
              </div>
            </details>
          </div>
        </section>
      </section>

      <section v-else class="empty-stage">
        <div class="landing-preview">
          <div class="preview-topline"><span class="eyebrow">AI GENERATED PREVIEW</span><span>DP · 보통</span></div>
          <h2>연속 부분 배열의 최대 합</h2>
          <p>배열에서 연속한 구간을 선택해 얻을 수 있는 최대 합을 구해보세요.</p>
          <div class="preview-code">
            <span class="muted">01</span> <b>def</b> solution(numbers):<br>
            <span class="muted">02</span> &nbsp;&nbsp;current = <em>&lt;BLANK&gt;</em><br>
            <span class="muted">03</span> &nbsp;&nbsp;best = numbers[<em>&lt;BLANK&gt;</em>]<br>
            <span class="muted">04</span> &nbsp;&nbsp;<b>for</b> number <b>in</b> numbers[<em>&lt;BLANK&gt;</em>:]:<br>
            <span class="muted">05</span> &nbsp;&nbsp;&nbsp;&nbsp;current = <em>&lt;BLANK&gt;</em>
          </div>
          <div class="preview-test"><span>예시</span><code>[-2, 3, -1, 5] → 7</code></div>
        </div>
        <div>
          <span class="eyebrow">AI GENERATED CHALLENGE</span>
          <h1>코드를 읽고,<br><em>빈칸을 완성하세요.</em></h1>
          <p>알고리즘 유형과 난이도를 선택하면 새로운 문제와 코드 블록 퀴즈를 생성합니다.</p>
          <button class="primary-button start-button" :disabled="authLoading" @click="startQuiz">{{ currentUser?.authenticated ? '첫 문제 생성하기' : 'Google 로그인 후 시작하기' }} <span>→</span></button>
        </div>
      </section>
    </main>

    <main v-else-if="currentView === 'dashboard'" class="dashboard" id="dashboard">
      <section v-if="authLoading" class="loading-stage dashboard-loading" aria-live="polite">
        <div class="loader-orbit"><span></span></div>
        <strong>로그인 정보를 확인하고 있습니다</strong>
      </section>
      <section v-else-if="!currentUser?.authenticated" class="auth-required">
        <img class="brand-logo auth-logo" :src="logoUrl" alt="">
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
            <button v-for="problem in wrongProblems" :key="problem.quizId" :disabled="retryingQuizId === problem.quizId" @click="openWrongQuiz(problem)">
              <span class="retry-icon">!</span>
              <div><strong>{{ problem.title }}</strong><small>{{ problem.category }} · {{ difficultyLabel(problem.difficulty) }}</small></div>
              <span>{{ retryingQuizId === problem.quizId ? '불러오는 중…' : '다시 풀기 →' }}</span>
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

    <main v-else class="ranking-page" id="ranking">
      <section v-if="authLoading" class="loading-stage dashboard-loading" aria-live="polite">
        <div class="loader-orbit"><span></span></div>
        <strong>랭킹을 불러오고 있습니다</strong>
      </section>
      <section v-else-if="!currentUser?.authenticated" class="auth-required">
        <img class="brand-logo auth-logo" :src="logoUrl" alt="">
        <h1>로그인하고 주간 랭킹을 확인하세요.</h1>
        <p>이번 주 학습 성과를 다른 사용자와 비교해 보세요.</p>
        <button class="google-login large" @click="startGoogleLogin">Google로 계속하기</button>
      </section>
      <template v-else>
        <section v-if="dashboardLoading" class="loading-stage dashboard-loading" aria-live="polite">
          <div class="loader-orbit"><span></span></div>
          <strong>주간 랭킹을 불러오고 있습니다</strong>
        </section>
        <section v-else class="ranking-page-content">
          <div class="dashboard-hero">
            <div>
              <span class="eyebrow">WEEKLY RANKING</span>
              <h1>이번 주 <em>랭킹</em></h1>
              <p>최근 7일 동안 맞힌 문제 수를 기준으로 순위를 집계합니다.</p>
            </div>
            <button class="primary-button" @click="currentView = 'quiz'">오늘의 문제 풀기 <span>→</span></button>
          </div>
          <article class="dashboard-card ranking-page-card">
            <div v-if="myWeeklyRanking" class="my-ranking">
              <span>내 순위 <b>{{ myWeeklyRanking.rank }}위</b></span>
              <span>{{ myWeeklyRanking.solvedCount }}문제 해결</span>
              <span v-if="myWeeklyRanking.badge !== 'NONE'" :class="['badge', myWeeklyRanking.badge.toLowerCase()]">{{ badgeLabel(myWeeklyRanking.badge) }}</span>
            </div>
            <div class="ranking-list">
              <div v-for="item in weeklyRankings" :key="item.userId" class="ranking-row" :class="{ current: item.userId === currentUser?.userId }">
                <strong class="ranking-position">{{ item.rank }}</strong>
                <span class="ranking-medal">{{ item.badge === 'GOLD' ? '🏆' : item.badge === 'SILVER' ? '🥈' : item.badge === 'BRONZE' ? '🥉' : '·' }}</span>
                <div><b>{{ item.nickname }}</b><small>{{ item.solvedCount }}문제 해결 · 정답률 {{ round(item.accuracyRate) }}%</small></div>
                <span v-if="item.badge !== 'NONE'" :class="['badge', item.badge.toLowerCase()]">{{ badgeLabel(item.badge) }}</span>
              </div>
              <p v-if="!weeklyRankings.length" class="dashboard-empty">이번 주 랭킹 데이터가 아직 없습니다.</p>
            </div>
          </article>
        </section>
      </template>
    </main>

    <footer><span>AlgoPoolja</span><p>AI로 연습하는 알고리즘 코드 퀴즈</p><nav class="policy-links"><a href="/privacy">개인정보처리방침</a><a href="/terms">서비스 이용약관</a></nav></footer>
  </div>
</template>

<style scoped>
.landing-preview {
  padding: 25px;
  border: 1px solid #303640;
  border-radius: 11px;
  background: #111419;
  box-shadow: 0 30px 80px #0008;
  transform: perspective(1200px) rotateY(4deg);
}

.preview-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #7f8793;
  font: .68rem var(--mono);
}

.preview-topline .eyebrow {
  color: var(--bright);
  font-size: .65rem;
}

.landing-preview h2 {
  margin: 24px 0 10px;
  color: #f1f4f2;
  font-size: 1.35rem;
  letter-spacing: -.04em;
}

.landing-preview > p {
  margin: 0 0 20px;
  color: #9ca3ad;
  font-size: .8rem;
  line-height: 1.6;
}

.preview-code {
  padding: 17px;
  border: 1px solid #252b32;
  border-radius: 7px;
  color: #d8dce3;
  background: #0d1014;
  font: .72rem/1.9 var(--mono);
  white-space: nowrap;
  overflow: hidden;
}

.preview-code b {
  color: #c084fc;
  font-weight: 500;
}

.preview-code em {
  padding: 2px 4px;
  color: #07110b;
  background: var(--bright);
  border-radius: 3px;
  font-style: normal;
}

.preview-code .muted {
  display: inline-block;
  width: 24px;
  color: #505762;
}

.preview-test {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  color: #727b88;
  font-size: .7rem;
}

.preview-test code {
  color: #b9f8cf;
  font-family: var(--mono);
}

.brand-logo {
  width: 30px;
  height: 30px;
  display: block;
  object-fit: contain;
  border-radius: 7px;
}

.auth-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 24px;
}

.answer-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin: 15px 0 18px;
}

.answer-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  background: #111419;
  border: 1px solid #363d47;
  border-radius: 5px;
}

.answer-input > span {
  width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  border-radius: 3px;
  background: #262c34;
  color: #8e97a4;
  font: .65rem var(--mono);
  flex: 0 0 auto;
}

.answer-input input {
  min-width: 0;
  width: 100%;
  height: 29px;
  padding: 0;
  border: 0;
  outline: 0;
  color: #dce3df;
  background: transparent;
  font: .72rem var(--mono);
}

.answer-input:focus-within {
  border-color: var(--bright);
  box-shadow: 0 0 0 1px var(--bright);
}

.answer-input input::placeholder {
  color: #666e79;
}

.ranking-card {
  grid-column: 1 / -1;
}

.ranking-page {
  padding-top: 54px;
}

.ranking-page-content {
  max-width: 920px;
  margin: 0 auto;
}

.ranking-page-card {
  padding: 24px;
}

.my-ranking {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: -4px 0 14px;
  padding: 11px 13px;
  color: #b8c0ca;
  background: #111419;
  border: 1px solid #2d333b;
  border-radius: 6px;
  font-size: .75rem;
}

.my-ranking b {
  color: var(--bright);
  font: 600 .9rem var(--mono);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ranking-row {
  display: grid;
  grid-template-columns: 28px 25px 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 45px;
  padding: 7px 10px;
  color: #dce0e6;
  background: #111419;
  border: 1px solid #252b32;
  border-radius: 5px;
}

.ranking-row.current {
  border-color: #386149;
  background: #14241b;
}

.ranking-position {
  color: #aeb4bd;
  text-align: center;
  font: 600 .8rem var(--mono);
}

.ranking-medal {
  font-size: 1rem;
  text-align: center;
}

.ranking-row div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ranking-row small {
  color: #858d99;
  font-size: .66rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 4px 7px;
  border-radius: 4px;
  font: 600 .6rem var(--mono);
}

.badge.gold { color: #241b05; background: #f6c453; }
.badge.silver { color: #202329; background: #c7ced8; }
.badge.bronze { color: #2b180c; background: #d98b55; }
.badge.top_10 { color: #b9f8cf; background: #1e4d31; }

@media(max-width:720px) {
  .landing-preview { transform: none; }
  .ranking-card { grid-column: auto; }
  .my-ranking { flex-wrap: wrap; gap: 8px 14px; }
}
</style>
