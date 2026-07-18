/* global quizTopics */
const app = document.querySelector('#app');
const state = { screen: 'home', topic: null, mode: null, order: [], current: 0, answers: {}, navigatorOpen: false, formulaFlipped: {}, formulaCardIndex: 0 };

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
const formatText = (text) => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const getQuestion = (index) => state.topic.questions[index];
const renderMath = () => window.renderMathInElement?.(app, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
new MutationObserver(() => requestAnimationFrame(renderMath)).observe(app, { childList: true });
window.addEventListener('load', renderMath);

function home() {
  state.screen = 'home'; state.topic = null; state.mode = null; state.answers = {}; state.order = []; state.navigatorOpen = false; state.formulaFlipped = {};
  app.innerHTML = `
    <section class="hero"><div class="eyebrow">HỌC NHANH · NHỚ LÂU</div><h1>AI Sprint<br /><span>Quiz</span></h1><p>Ôn kiến thức cốt lõi, trả lời ngay và hiểu lý do phía sau từng đáp án.</p><div class="hero-orb orb-one"></div><div class="hero-orb orb-two"></div></section>
    <section class="topics"><div class="section-heading"><div><p class="eyebrow">CHỌN CHỦ ĐỀ</p><h2>Bạn muốn luyện gì?</h2></div><span>${quizTopics.length} chủ đề</span></div>
    <div class="topic-grid">${quizTopics.map((topic) => `<button class="topic-card ${topic.color}" data-topic="${topic.id}"><span class="topic-icon">${topic.icon}</span><span class="topic-copy"><strong>${topic.title}</strong><small>${topic.description}</small></span><span class="topic-arrow">→</span></button>`).join('')}</div></section>`;
  app.querySelectorAll('[data-topic]').forEach((button) => button.addEventListener('click', () => chooseTopic(button.dataset.topic)));
}

function chooseTopic(id) {
  state.topic = quizTopics.find((topic) => topic.id === id); state.screen = 'mode'; state.formulaFlipped = {};
  if (state.topic.kind === 'formula') { chooseFormulaMode(); return; }
  app.innerHTML = `<header class="sub-header"><button class="back" data-home aria-label="Quay về trang chủ">←</button><span>${state.topic.questions.length} câu hỏi</span></header>
  <section class="mode-screen"><div class="topic-mark ${state.topic.color}">${state.topic.icon}</div><p class="eyebrow">${state.topic.title}</p><h1>Chọn cách<br />làm bài</h1><p class="lead">Bạn luôn nhận phản hồi ngay sau mỗi lựa chọn.</p>
  <div class="mode-list">
    <button class="mode-card" data-mode="sequential"><span>01</span><div><strong>Làm tuần tự</strong><small>Từng câu một, có tiến độ rõ ràng.</small></div><b>→</b></button>
    <button class="mode-card" data-mode="free"><span>02</span><div><strong>Tự do khám phá</strong><small>Xem và trả lời mọi câu trên cùng một trang.</small></div><b>→</b></button>
    <button class="mode-card" data-mode="random"><span>03</span><div><strong>Thử thách ngẫu nhiên</strong><small>Mỗi lượt là một câu chưa lặp lại.</small></div><b>→</b></button>
  </div></section>`;
  app.querySelector('[data-home]').addEventListener('click', home);
  app.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => startQuiz(button.dataset.mode)));
}

function chooseFormulaMode() {
  state.screen = 'formula-mode'; state.mode = null; state.navigatorOpen = false;
  app.innerHTML = `<header class="sub-header"><button class="back" data-home aria-label="Quay về trang chủ">←</button><span>${state.topic.cards.length} công thức · ${state.topic.questions.length} câu hỏi</span></header>
  <section class="mode-screen formula-mode-screen"><div class="topic-mark ${state.topic.color}">${state.topic.icon}</div><p class="eyebrow">${state.topic.title}</p><h1>Học theo<br />cách của bạn</h1><p class="lead">Chọn một lượt flashcard hoặc làm toàn bộ câu trắc nghiệm. Công thức được hiển thị theo chuẩn toán học.</p>
  <div class="mode-list"><button class="mode-card formula-choice" data-formula-mode="cards"><span>✦</span><div><strong>Flashcard công thức</strong><small>Xem toàn bộ thẻ, chạm để lật và xem ví dụ.</small></div><b>→</b></button><button class="mode-card formula-choice" data-formula-mode="quiz"><span>✓</span><div><strong>Quiz công thức</strong><small>Làm toàn bộ câu hỏi trắc nghiệm trong một trang.</small></div><b>→</b></button></div></section>`;
  app.querySelector('[data-home]').addEventListener('click', home);
  app.querySelector('[data-formula-mode="cards"]').addEventListener('click', startFormulaCards);
  app.querySelector('[data-formula-mode="quiz"]').addEventListener('click', startFormulaQuiz);
}

function attachSwipe(element, onPrevious, onNext) {
  let startX = 0; let startY = 0;
  element.addEventListener('pointerdown', (event) => { startX = event.clientX; startY = event.clientY; });
  element.addEventListener('pointerup', (event) => {
    const deltaX = event.clientX - startX; const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX > 0) onPrevious(); else onNext();
  });
}

function startFormulaCards() {
  state.screen = 'formula-cards'; state.formulaCardIndex = 0; state.formulaFlipped = {};
  renderFormulaCards();
}

function moveFormulaCard(delta) {
  const next = state.formulaCardIndex + delta;
  if (next < 0 || next >= state.topic.cards.length) return;
  state.formulaCardIndex = next; renderFormulaCards();
}

function renderFormulaCardsLegacy() {
  app.innerHTML = `<header class="sub-header"><button class="back" data-formula-back aria-label="Quay về lựa chọn học">←</button><span>Flashcard · ${state.topic.cards.length} thẻ</span></header><section class="formula-cards"><div class="formula-intro"><p class="eyebrow">FLASHCARD CÔNG THỨC</p><h1>Chạm từng thẻ<br />để lật</h1><p>Mặt sau có công thức, diễn giải và ví dụ số để trực quan hóa.</p></div><div class="formula-grid">${state.topic.cards.map((card, index) => `<article class="formula-card ${state.formulaFlipped[index] ? 'is-flipped' : ''}"><button class="formula-flip" data-flip-card="${index}" aria-pressed="${Boolean(state.formulaFlipped[index])}" aria-label="Lật thẻ ${card.title}"><span class="formula-front"><small>THẺ ${index + 1}</small><strong>${card.title}</strong><em>Chạm để xem công thức →</em></span><span class="formula-back"><small>${card.title}</small><span class="formula-math">${formatText(card.formula)}</span><span class="formula-explanation">${formatText(card.explanation)}</span><span class="formula-example"><b>Ví dụ</b>${formatText(card.example)}</span><em>Chạm để lật lại</em></span></button></article>`).join('')}</div></section>`;
  app.querySelector('[data-formula-back]').addEventListener('click', chooseFormulaMode);
  app.querySelectorAll('[data-flip-card]').forEach((button) => button.addEventListener('click', () => { const index = Number(button.dataset.flipCard); state.formulaFlipped[index] = !state.formulaFlipped[index]; renderFormulaCards(); }));
}

function renderFormulaCards() {
  const index = state.formulaCardIndex; const card = state.topic.cards[index]; const flipped = Boolean(state.formulaFlipped[index]);
  app.innerHTML = `<header class="formula-study-header"><button class="back" data-formula-back aria-label="Back to formula modes">←</button><div><small>FLASHCARD CÔNG THỨC</small><div class="formula-progress"><i style="width:${((index + 1) / state.topic.cards.length) * 100}%"></i></div></div><span>${index + 1}/${state.topic.cards.length}</span></header><main class="formula-study formula-card-study"><div class="formula-card-shell"><article class="formula-card ${flipped ? 'is-flipped' : ''}"><button class="formula-flip" data-flip-card aria-pressed="${flipped}" aria-label="Flip ${card.title}"><span class="formula-front"><small>THẺ ${index + 1}</small><strong>${card.title}</strong><span class="formula-prompt">Bạn còn nhớ công thức và khi nào dùng nó?</span><em>Chạm để lật thẻ</em></span><span class="formula-back"><small>${card.title}</small><span class="formula-math">${formatText(card.formula)}</span><span class="formula-explanation">${formatText(card.explanation)}</span><span class="formula-example"><b>Ví dụ trực quan</b>${formatText(card.example)}</span><em>Chạm để lật lại</em></span></button></article></div></main><footer class="formula-study-footer"><button class="secondary" data-formula-prev ${index === 0 ? 'disabled' : ''}>← Trước</button><button class="formula-flip-action" data-flip-card>${flipped ? '↺ Xem mặt trước' : '↻ Lật thẻ'}</button><button class="primary" data-formula-next ${index === state.topic.cards.length - 1 ? 'disabled' : ''}>Sau →</button></footer>`;
  app.querySelector('[data-formula-back]').addEventListener('click', chooseFormulaMode);
  app.querySelectorAll('[data-flip-card]').forEach((button) => button.addEventListener('click', () => { state.formulaFlipped[index] = !state.formulaFlipped[index]; renderFormulaCards(); }));
  app.querySelector('[data-formula-prev]').addEventListener('click', () => moveFormulaCard(-1));
  app.querySelector('[data-formula-next]').addEventListener('click', () => moveFormulaCard(1));
  attachSwipe(app.querySelector('.formula-card-shell'), () => moveFormulaCard(-1), () => moveFormulaCard(1));
}

function startFormulaQuiz() {
  state.screen = 'formula-quiz'; state.mode = 'formula-quiz'; state.answers = {}; state.current = 0; state.navigatorOpen = false;
  state.order = state.topic.questions.map((_, index) => index);
  renderFormulaQuiz();
}

function moveFormulaQuiz(delta) {
  const next = state.current + delta;
  if (next < 0 || next >= state.order.length) return;
  state.current = next; renderFormulaQuiz();
}

function renderFormulaQuiz() {
  const questionIndex = state.order[state.current]; const answered = Object.keys(state.answers).length; const last = state.current === state.order.length - 1;
  app.innerHTML = `<header class="formula-study-header"><button class="back" data-formula-back aria-label="Back to formula modes">←</button><div><small>QUIZ CÔNG THỨC</small><div class="formula-progress"><i style="width:${(answered / state.order.length) * 100}%"></i></div></div><button class="navigator-toggle" data-toggle-navigator aria-label="Open question menu" aria-expanded="${state.navigatorOpen}">☷<span>Câu hỏi</span></button><span>${state.current + 1}/${state.order.length}</span></header>${navigatorPanel()}<main class="formula-study formula-quiz-study"><div class="formula-quiz-card">${questionCard(questionIndex, state.current)}</div></main><footer class="formula-study-footer formula-quiz-footer"><button class="secondary" data-formula-quiz-prev ${state.current === 0 ? 'disabled' : ''}>← Trước</button>${last ? `<button class="primary" data-finish ${answered !== state.order.length ? 'disabled' : ''}>${answered === state.order.length ? 'Xem kết quả →' : `Còn ${state.order.length - answered} câu`}</button>` : '<button class="primary" data-formula-quiz-next>Câu tiếp →</button>'}</footer>`;
  app.querySelector('[data-formula-back]').addEventListener('click', chooseFormulaMode);
  app.querySelector('[data-toggle-navigator]').addEventListener('click', () => { state.navigatorOpen = true; renderFormulaQuiz(); requestAnimationFrame(() => app.querySelector('.navigator-close')?.focus()); });
  app.querySelectorAll('[data-close-navigator]').forEach((button) => button.addEventListener('click', () => closeNavigator()));
  app.querySelectorAll('[data-go-question]').forEach((button) => button.addEventListener('click', () => goToQuestion(Number(button.dataset.goQuestion))));
  app.querySelectorAll('[data-question]').forEach((card) => card.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => answerQuestion(Number(card.dataset.question), Number(button.dataset.choice)))));
  app.querySelector('[data-formula-quiz-prev]')?.addEventListener('click', () => moveFormulaQuiz(-1));
  app.querySelector('[data-formula-quiz-next]')?.addEventListener('click', () => moveFormulaQuiz(1));
  app.querySelector('[data-finish]')?.addEventListener('click', results);
  attachSwipe(app.querySelector('.formula-quiz-study'), () => moveFormulaQuiz(-1), () => moveFormulaQuiz(1));
}

function startQuiz(mode) {
  state.screen = 'quiz'; state.mode = mode; state.answers = {}; state.current = 0; state.navigatorOpen = false;
  state.order = mode === 'random' ? shuffle(state.topic.questions.map((_, index) => index)) : state.topic.questions.map((_, index) => index);
  renderQuiz();
}

function questionCard(questionIndex, displayIndex) {
  const question = getQuestion(questionIndex); const selected = state.answers[questionIndex]; const done = selected !== undefined;
  return `<article class="question-card ${done ? 'answered' : ''}" data-question="${questionIndex}">
    <div class="question-meta"><span>CÂU ${displayIndex + 1}</span><span>${done ? (selected === question.answer ? '✓ Chính xác' : '× Cần ôn lại') : 'Chọn 1 đáp án'}</span></div>
    <h2>${formatText(question.q)}</h2>
    <div class="options">${question.choices.map((choice, index) => {
      let cls = ''; if (done && index === question.answer) cls = 'correct'; if (done && index === selected && selected !== question.answer) cls = 'wrong';
      return `<button class="option ${cls}" data-choice="${index}" ${done ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span><div>${formatText(choice)}</div><i>${done && index === question.answer ? '✓' : done && index === selected ? '×' : ''}</i></button>`;
    }).join('')}</div>
    ${done ? feedback(question, selected) : ''}
  </article>`;
}

function feedback(question, selected) {
  const correct = selected === question.answer;
  return `<aside class="feedback ${correct ? 'is-correct' : 'is-wrong'}"><strong>${correct ? 'Chính xác! Bạn đã nắm đúng ý.' : `Chưa đúng — đáp án là ${String.fromCharCode(65 + question.answer)}.`}</strong><p>${formatText(correct ? question.correct : question.wrong[selected])}</p>${!correct ? `<p><b>Vì sao đáp án đúng:</b> ${formatText(question.correct)}</p>` : ''}</aside>`;
}

function questionStatus(questionIndex, position) {
  const selected = state.answers[questionIndex];
  if (position === state.current && state.mode !== 'free') return { className: 'is-current', label: 'đang xem' };
  if (selected === undefined) return { className: 'is-unanswered', label: 'chưa trả lời' };
  return selected === getQuestion(questionIndex).answer
    ? { className: 'is-correct', label: 'đã trả lời đúng' }
    : { className: 'is-wrong', label: 'đã trả lời sai' };
}

function navigatorPanel() {
  if (!state.navigatorOpen) return '';
  const answered = Object.keys(state.answers).length;
  return `<div class="navigator-layer"><button class="navigator-backdrop" data-close-navigator aria-label="Đóng menu câu hỏi"></button>
    <aside class="question-navigator" role="dialog" aria-modal="true" aria-labelledby="navigator-title">
      <div class="navigator-heading"><div><p class="eyebrow">ĐIỀU HƯỚNG</p><h2 id="navigator-title">Chọn câu hỏi</h2><small>${answered}/${state.order.length} câu đã trả lời</small></div><button class="navigator-close" data-close-navigator aria-label="Đóng menu câu hỏi">×</button></div>
      <div class="navigator-grid">${state.order.map((questionIndex, position) => {
        const status = questionStatus(questionIndex, position);
        return `<button class="navigator-item ${status.className}" data-go-question="${position}" aria-label="Câu ${position + 1}, ${status.label}" ${position === state.current && state.mode !== 'free' ? 'aria-current="step"' : ''}>${position + 1}</button>`;
      }).join('')}</div>
      <p class="navigator-legend"><span class="legend-current"></span>Đang xem <span class="legend-correct"></span>Đúng <span class="legend-wrong"></span>Sai</p>
    </aside></div>`;
}

function closeNavigator(returnFocus = true) {
  state.navigatorOpen = false;
  if (state.mode === 'formula-quiz') renderFormulaQuiz(); else renderQuiz();
  if (returnFocus) requestAnimationFrame(() => app.querySelector('[data-toggle-navigator]')?.focus());
}

function goToQuestion(position) {
  const questionIndex = state.order[position];
  state.navigatorOpen = false;
  if (state.mode === 'free') {
    renderQuiz();
    requestAnimationFrame(() => {
      const card = app.querySelector(`[data-question="${questionIndex}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card?.setAttribute('tabindex', '-1');
      card?.focus({ preventScroll: true });
    });
    return;
  }
  state.current = position;
  if (state.mode === 'formula-quiz') renderFormulaQuiz(); else renderQuiz();
}

function renderQuiz() {
  const isFree = state.mode === 'free';
  const currentQuestion = state.order[state.current]; const answered = Object.keys(state.answers).length;
  app.innerHTML = `<header class="quiz-header"><button class="back" data-back aria-label="Đổi chế độ làm bài">←</button><div><small>${state.topic.title}</small><div class="progress"><i style="width:${(answered / state.order.length) * 100}%"></i></div></div><button class="navigator-toggle" data-toggle-navigator aria-label="Mở menu chọn câu hỏi" aria-expanded="${state.navigatorOpen}">☷<span>Câu hỏi</span></button><span>${answered}/${state.order.length}</span></header>
  ${navigatorPanel()}
  <section class="quiz-content ${isFree ? 'free-mode' : ''}">${isFree ? state.order.map((index, position) => questionCard(index, position)).join('') : questionCard(currentQuestion, state.current)}</section>
  ${isFree ? `<footer class="quiz-footer"><button class="primary" data-finish ${answered !== state.order.length ? 'disabled' : ''}>Xem kết quả ${answered === state.order.length ? '→' : `(${state.order.length - answered} câu còn lại)`}</button></footer>` : `<footer class="quiz-footer nav-footer"><button class="secondary" data-prev ${state.current === 0 ? 'disabled' : ''}>← Trước</button>${state.current === state.order.length - 1 ? `<button class="primary" data-finish ${answered !== state.order.length ? 'disabled' : ''}>${answered === state.order.length ? 'Xem kết quả →' : 'Hoàn tất các câu'}</button>` : `<button class="primary" data-next>Câu tiếp →</button>`}</footer>`}`;
  app.querySelector('[data-back]').addEventListener('click', () => chooseTopic(state.topic.id));
  app.querySelector('[data-toggle-navigator]').addEventListener('click', () => { state.navigatorOpen = true; renderQuiz(); requestAnimationFrame(() => app.querySelector('.navigator-close')?.focus()); });
  app.querySelectorAll('[data-close-navigator]').forEach((button) => button.addEventListener('click', () => closeNavigator()));
  app.querySelectorAll('[data-go-question]').forEach((button) => button.addEventListener('click', () => goToQuestion(Number(button.dataset.goQuestion))));
  app.querySelectorAll('[data-question]').forEach((card) => card.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => answerQuestion(Number(card.dataset.question), Number(button.dataset.choice)))));
  app.querySelector('[data-prev]')?.addEventListener('click', () => { state.current--; renderQuiz(); });
  app.querySelector('[data-next]')?.addEventListener('click', () => { state.current++; renderQuiz(); });
  app.querySelector('[data-finish]')?.addEventListener('click', results);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.navigatorOpen) closeNavigator();
  if (state.navigatorOpen) return;
  const interactiveTarget = event.target.closest('button, a, input, select, textarea, [contenteditable], [role="button"]');
  if (interactiveTarget) return;
  if (state.screen === 'formula-cards') {
    if (event.key === 'ArrowLeft') moveFormulaCard(-1);
    if (event.key === 'ArrowRight') moveFormulaCard(1);
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); state.formulaFlipped[state.formulaCardIndex] = !state.formulaFlipped[state.formulaCardIndex]; renderFormulaCards(); }
  }
  if (state.screen === 'formula-quiz' && state.mode === 'formula-quiz') {
    if (event.key === 'ArrowLeft') moveFormulaQuiz(-1);
    if (event.key === 'ArrowRight') moveFormulaQuiz(1);
  }
});

function answerQuestion(questionIndex, choice) { if (state.answers[questionIndex] !== undefined) return; state.answers[questionIndex] = choice; if (state.mode === 'formula-quiz') renderFormulaQuiz(); else renderQuiz(); }

function results() {
  state.screen = 'results';
  const total = state.topic.questions.length; const wrong = state.order.filter((index) => state.answers[index] !== getQuestion(index).answer); const score = total - wrong.length; const percent = Math.round((score / total) * 100);
  app.innerHTML = `<section class="result-screen"><div class="result-badge">${percent >= 80 ? '✦' : percent >= 50 ? '↗' : '↻'}</div><p class="eyebrow">HOÀN THÀNH CHỦ ĐỀ</p><h1>${state.topic.title}</h1><div class="score"><strong>${score}<small>/${total}</small></strong><span>${percent}% chính xác</span></div><p class="lead">${percent >= 80 ? 'Rất tốt! Bạn đã có nền tảng vững vàng.' : percent >= 50 ? 'Khá tốt! Hãy ôn lại vài điểm còn lẫn lộn.' : 'Đừng lo — xem lại lời giải rồi thử lại nhé.'}</p>
  ${wrong.length ? `<section class="review"><h2>Ôn lại ${wrong.length} câu</h2>${wrong.map((index) => `<div class="review-item"><span>×</span><div><strong>${formatText(getQuestion(index).q)}</strong><p>${formatText(getQuestion(index).correct)}</p></div></div>`).join('')}</section>` : '<section class="review perfect"><h2>🎉 Hoàn hảo!</h2><p>Bạn đã trả lời đúng tất cả câu hỏi trong chủ đề này.</p></section>'}
  <div class="result-actions"><button class="secondary" data-topics>Chọn chủ đề</button><button class="primary" data-retry>Làm lại →</button></div></section>`;
  app.querySelector('[data-topics]').addEventListener('click', home); app.querySelector('[data-retry]').addEventListener('click', () => state.mode === 'formula-quiz' ? startFormulaQuiz() : startQuiz(state.mode));
}

home();
