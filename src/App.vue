<script setup>
import { computed, ref } from 'vue'

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

const difficultyClass = computed(() => ({ '쉬움': 'easy', '보통': 'normal', '어려움': 'hard' })[difficulty.value])
const isComplete = computed(() => quiz.value && answers.value.length === quiz.value.blankCount)
const filledCode = computed(() => {
  if (!quiz.value) return ''
  let index = 0
  return quiz.value.blankCode.replaceAll('<BLANK>', () => answers.value[index++] ?? '____')
})

async function generateQuiz() {
  loading.value = true
  error.value = ''
  result.value = null
  showSolution.value = false

  try {
    const response = await fetch('/api/quizzes', {
      method: 'POST',
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
    const response = await fetch(`/api/quizzes/${quiz.value.quizId}/check`, {
      method: 'POST',
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
        <a class="active" href="#workspace">문제 풀이</a>
        <span>AI 알고리즘 퀴즈</span>
      </nav>
      <div class="server-state"><i></i> API 연결</div>
    </header>

    <main id="workspace">
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

    <footer><span>AlgoPoolja</span><p>AI로 연습하는 알고리즘 코드 퀴즈</p><small>Spring AI · Vue.js</small></footer>
  </div>
</template>
