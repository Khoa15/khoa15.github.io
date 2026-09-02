(function () {
  "use strict";

  const STORAGE_KEY = "vinuni-ai20k-quiz-progress-v1";
  const EXPECTED_TOTAL = 476;
  const EXPECTED_ADVANCED = 264;
  const EXPECTED_CALCULATION = 60;
  const bank = window.VINUNI_QUESTION_BANK;

  const $ = (id) => document.getElementById(id);
  const elements = {
    bankTotal: $("bankTotal"),
    advancedTotal: $("advancedTotal"),
    calculationTotal: $("calculationTotal"),
    wrongTotal: $("wrongTotal"),
    answeredTotal: $("answeredTotal"),
    heroAccuracy: $("heroAccuracy"),
    calculationMetricTotal: $("calculationMetricTotal"),
    wrongPreviewCount: $("wrongPreviewCount"),
    reviewWrongCount: $("reviewWrongCount"),
    filteredCount: $("filteredCount"),
    filteredAdvancedCount: $("filteredAdvancedCount"),
    filteredCalculationCount: $("filteredCalculationCount"),
    theoryLevel: $("theoryLevel"),
    dayFilter: $("dayFilter"),
    topicFilter: $("topicFilter"),
    difficultyFilter: $("difficultyFilter"),
    typeFilter: $("typeFilter"),
    questionStyle: $("questionStyle"),
    questionLimit: $("questionLimit"),
    startQuizButton: $("startQuizButton"),
    startFromHeroButton: $("startFromHeroButton"),
    navigatorButton: $("navigatorButton"),
    reviewWrongButton: $("reviewWrongButton"),
    resetProgressButton: $("resetProgressButton"),
    dashboardView: $("dashboardView"),
    sessionView: $("sessionView"),
    resultView: $("resultView"),
    sessionLabel: $("sessionLabel"),
    sessionTitle: $("sessionTitle"),
    sessionModeBadge: $("sessionModeBadge"),
    backToDashboardButton: $("backToDashboardButton"),
    finishSessionButton: $("finishSessionButton"),
    questionNumber: $("questionNumber"),
    questionTotal: $("questionTotal"),
    progressBar: $("progressBar"),
    questionLevel: $("questionLevel"),
    questionDifficulty: $("questionDifficulty"),
    questionType: $("questionType"),
    questionStyleTag: $("questionStyleTag"),
    questionId: $("questionId"),
    questionMeta: $("questionMeta"),
    questionText: $("questionText"),
    optionList: $("optionList"),
    flashcardInputWrap: $("flashcardInputWrap"),
    flashcardNote: $("flashcardNote"),
    answerFeedback: $("answerFeedback"),
    feedbackState: $("feedbackState"),
    feedbackAnswer: $("feedbackAnswer"),
    explanationText: $("explanationText"),
    explanationWordCount: $("explanationWordCount"),
    sourceMeta: $("sourceMeta"),
    flashcardActions: $("flashcardActions"),
    masteredButton: $("masteredButton"),
    reviewFlashcardButton: $("reviewFlashcardButton"),
    liveMessage: $("liveMessage"),
    nextQuestionButton: $("nextQuestionButton"),
    resultAccuracy: $("resultAccuracy"),
    resultCorrect: $("resultCorrect"),
    resultIncorrect: $("resultIncorrect"),
    resultFlashcards: $("resultFlashcards"),
    resultWrongCount: $("resultWrongCount"),
    resultReviewButton: $("resultReviewButton"),
    resultNewSessionButton: $("resultNewSessionButton"),
    wrongList: $("wrongList"),
    resultEmptyState: $("resultEmptyState"),
    appError: $("appError"),
    appErrorMessage: $("appErrorMessage")
  };

  const defaultFilters = {
    theoryLevel: "all",
    day: "all",
    topic: "all",
    difficulty: "all",
    type: "all",
    questionStyle: "all",
    questionLimit: "20"
  };

  const defaultProgress = () => ({
    answeredIds: [],
    wrongIds: [],
    masteredFlashcardIds: [],
    reviewFlashcardIds: [],
    sessionStats: { attempted: 0, correct: 0 },
    lastFilters: { ...defaultFilters }
  });

  const state = {
    filters: { ...defaultFilters },
    progress: defaultProgress(),
    session: null
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function countWords(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function naturalSort(a, b) {
    return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
  }

  function validateBank(payload) {
    if (!payload || !Array.isArray(payload.questions)) throw new Error("Payload ngân hàng không có mảng questions.");
    const questions = payload.questions;
    if (questions.length !== EXPECTED_TOTAL) throw new Error(`Kỳ vọng ${EXPECTED_TOTAL} câu nhưng nhận được ${questions.length}.`);
    const advanced = questions.filter((question) => question.advanced_theory === true);
    if (advanced.length !== EXPECTED_ADVANCED) throw new Error(`Kỳ vọng ${EXPECTED_ADVANCED} câu advanced nhưng nhận được ${advanced.length}.`);
    const calculations = questions.filter((question) => question.calculation_required === true);
    if (calculations.length !== EXPECTED_CALCULATION) throw new Error(`Kỳ vọng ${EXPECTED_CALCULATION} câu tính toán nhưng nhận được ${calculations.length}.`);
    const ids = new Set();
    questions.forEach((question) => {
      if (!question.id || ids.has(question.id)) throw new Error(`ID câu hỏi bị thiếu hoặc trùng: ${question.id || "unknown"}.`);
      ids.add(question.id);
      if (!question.question || !question.answer) throw new Error(`Câu ${question.id} thiếu question hoặc answer.`);
      const explanationWords = countWords(question.explanation);
      if (explanationWords <= 100 || question.explanation_word_count !== explanationWords) throw new Error(`Explanation của ${question.id} phải trên 100 từ và có word count chính xác.`);
      if (!question.question_style || typeof question.calculation_required !== "boolean") throw new Error(`Câu ${question.id} thiếu metadata question_style/calculation_required.`);
      if (question.question_style === "calculation" && !question.calculation_required) throw new Error(`Câu calculation ${question.id} phải có calculation_required=true.`);
      if (question.type === "multiple_choice") {
        if (!Array.isArray(question.options) || question.options.length < 2) throw new Error(`Câu ${question.id} thiếu options.`);
        if (!question.options.includes(question.answer)) throw new Error(`Answer của ${question.id} không nằm trong options.`);
      } else if (question.type !== "short_answer") {
        throw new Error(`Loại câu hỏi không hỗ trợ ở ${question.id}: ${question.type}.`);
      }
    });
    return questions;
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return defaultProgress();
      const fresh = defaultProgress();
      return {
        ...fresh,
        ...saved,
        answeredIds: Array.isArray(saved.answeredIds) ? saved.answeredIds : fresh.answeredIds,
        wrongIds: Array.isArray(saved.wrongIds) ? saved.wrongIds : fresh.wrongIds,
        masteredFlashcardIds: Array.isArray(saved.masteredFlashcardIds) ? saved.masteredFlashcardIds : fresh.masteredFlashcardIds,
        reviewFlashcardIds: Array.isArray(saved.reviewFlashcardIds) ? saved.reviewFlashcardIds : fresh.reviewFlashcardIds,
        sessionStats: { ...fresh.sessionStats, ...(saved.sessionStats || {}) },
        lastFilters: { ...fresh.lastFilters, ...(saved.lastFilters || {}) }
      };
    } catch (error) {
      return defaultProgress();
    }
  }

  function persistProgress() {
    state.progress.lastFilters = { ...state.filters };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function addUnique(list, value) {
    if (!list.includes(value)) list.push(value);
  }

  function removeValue(list, value) {
    const index = list.indexOf(value);
    if (index >= 0) list.splice(index, 1);
  }

  function populateSelect(select, values, allLabel) {
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = allLabel;
    select.appendChild(allOption);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function initializeFilters(questions) {
    const days = unique(questions.map((question) => question.day)).sort(naturalSort);
    const topics = unique(questions.map((question) => question.topic)).sort(naturalSort);
    populateSelect(elements.dayFilter, days, "Tất cả Day");
    populateSelect(elements.topicFilter, topics, "Tất cả topic");
    state.filters = { ...defaultFilters, ...(state.progress.lastFilters || {}) };
    elements.theoryLevel.value = state.filters.theoryLevel;
    elements.dayFilter.value = state.filters.day;
    elements.topicFilter.value = state.filters.topic;
    elements.difficultyFilter.value = state.filters.difficulty;
    elements.typeFilter.value = state.filters.type;
    elements.questionStyle.value = state.filters.questionStyle;
    elements.questionLimit.value = state.filters.questionLimit;
  }

  function getFilteredQuestions(filters = state.filters) {
    return bankQuestions.filter((question) => {
      if (filters.theoryLevel !== "all" && question.theory_level !== filters.theoryLevel) return false;
      if (filters.day !== "all" && question.day !== filters.day) return false;
      if (filters.topic !== "all" && question.topic !== filters.topic) return false;
      if (filters.difficulty !== "all" && question.difficulty !== filters.difficulty) return false;
      if (filters.type !== "all" && question.type !== filters.type) return false;
      if (filters.questionStyle !== "all" && question.question_style !== filters.questionStyle) return false;
      return true;
    });
  }

  function updateFilterSummary() {
    const filtered = getFilteredQuestions();
    const advanced = filtered.filter((question) => question.advanced_theory).length;
    const calculations = filtered.filter((question) => question.calculation_required).length;
    elements.filteredCount.textContent = `${filtered.length} câu phù hợp`;
    elements.filteredAdvancedCount.textContent = `${advanced} advanced`;
    elements.filteredCalculationCount.textContent = `${calculations} tính toán`;
    elements.startQuizButton.disabled = filtered.length === 0;
  }

  function syncFilterState() {
    state.filters = {
      theoryLevel: elements.theoryLevel.value,
      day: elements.dayFilter.value,
      topic: elements.topicFilter.value,
      difficulty: elements.difficultyFilter.value,
      type: elements.typeFilter.value,
      questionStyle: elements.questionStyle.value,
      questionLimit: elements.questionLimit.value
    };
    updateFilterSummary();
    persistProgress();
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function formatAccuracy(correct, attempted) {
    return attempted ? `${Math.round((correct / attempted) * 100)}%` : "—";
  }

  function renderDashboard() {
    const answered = new Set(state.progress.answeredIds);
    const validIds = new Set(bankQuestions.map((question) => question.id));
    const answeredCount = [...answered].filter((id) => validIds.has(id)).length;
    const wrongIds = state.progress.wrongIds.filter((id) => validIds.has(id));
    elements.bankTotal.textContent = bankQuestions.length;
    elements.advancedTotal.textContent = bankQuestions.filter((question) => question.advanced_theory).length;
    elements.calculationTotal.textContent = bankQuestions.filter((question) => question.calculation_required).length;
    elements.calculationMetricTotal.textContent = bankQuestions.filter((question) => question.calculation_required).length;
    elements.answeredTotal.textContent = answeredCount;
    elements.wrongTotal.textContent = wrongIds.length;
    elements.wrongPreviewCount.textContent = wrongIds.length;
    elements.reviewWrongCount.textContent = wrongIds.length;
    elements.heroAccuracy.textContent = formatAccuracy(state.progress.sessionStats.correct, state.progress.sessionStats.attempted);
    elements.reviewWrongButton.disabled = wrongIds.length === 0;
    updateFilterSummary();
  }

  function showView(view) {
    elements.dashboardView.hidden = view !== "dashboard";
    elements.sessionView.hidden = view !== "session";
    elements.resultView.hidden = view !== "result";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sourceText(question) {
    const repos = Array.isArray(question.source_repos) ? question.source_repos.join(", ") : "Repository chưa khai báo";
    const range = question.source_line_range ? ` · dòng ${question.source_line_range}` : "";
    return `${question.source_section || question.day} · ${repos}${range} · ${question.provenance_scope || "synthesis"}`;
  }

  function renderExplanation(target, explanation) {
    target.replaceChildren();
    const text = String(explanation || "Chưa có explanation.").replace(/\s+/g, " ").trim();
    const parts = text.split(/(?=(?:Đáp án đúng là:|Phân tích cốt lõi:|Vì sao các phương án còn lại dễ gây nhầm:|Lỗi thường gặp là:|Ứng dụng ôn tập:|Phương án [A-D] —))/g).filter(Boolean);
    parts.forEach((part) => {
      const paragraph = document.createElement("p");
      paragraph.className = "explanation-part";
      const heading = part.match(/^(Đáp án đúng là:|Phân tích cốt lõi:|Vì sao các phương án còn lại dễ gây nhầm:|Lỗi thường gặp là:|Ứng dụng ôn tập:|Phương án [A-D] —)/);
      if (heading) {
        const strong = document.createElement("strong");
        strong.textContent = heading[1];
        paragraph.appendChild(strong);
        paragraph.appendChild(document.createTextNode(part.slice(heading[1].length).trimStart()));
      } else {
        paragraph.textContent = part;
      }
      target.appendChild(paragraph);
    });
  }

  function sessionLabel(source) {
    return source === "wrong" ? "Review queue" : state.filters.questionStyle === "calculation" ? "Calculation drills" : state.filters.theoryLevel === "advanced" ? "Advanced theory" : "Selected practice";
  }

  function startSession(source = "filtered") {
    const candidates = source === "wrong"
      ? bankQuestions.filter((question) => state.progress.wrongIds.includes(question.id))
      : getFilteredQuestions();
    if (!candidates.length) {
      elements.liveMessage.textContent = source === "wrong" ? "Chưa có câu sai để ôn." : "Bộ lọc này chưa có câu phù hợp.";
      return;
    }
    const limit = source === "wrong" || state.filters.questionLimit === "all" ? candidates.length : Number(state.filters.questionLimit);
    const queue = shuffle(candidates).slice(0, limit);
    state.session = {
      source,
      queue,
      index: 0,
      answers: new Map(),
      incorrectQuestions: [],
      mcAttempted: 0,
      mcCorrect: 0,
      flashcards: 0
    };
    elements.sessionLabel.textContent = sessionLabel(source);
    elements.sessionTitle.textContent = source === "wrong" ? "Ôn lại những câu còn yếu" : "Theory practice";
    elements.sessionModeBadge.textContent = source === "wrong" ? "Review mode" : "Study session";
    showView("session");
    renderQuestion();
  }

  function setFeedback(question, isCorrect, selectedAnswer) {
    elements.answerFeedback.hidden = false;
    elements.feedbackState.textContent = isCorrect ? "Correct" : "Review this";
    elements.feedbackState.classList.toggle("incorrect", !isCorrect);
    elements.feedbackAnswer.textContent = isCorrect ? "Đáp án chính xác" : `Đáp án: ${question.answer}`;
    renderExplanation(elements.explanationText, question.explanation);
    elements.explanationWordCount.textContent = `${countWords(question.explanation)} words`;
    elements.sourceMeta.textContent = sourceText(question);
    elements.liveMessage.textContent = isCorrect ? "Tốt lắm — tiếp tục giữ nhịp." : "Đã lưu vào danh sách ôn lại.";
    if (selectedAnswer && !isCorrect) elements.feedbackAnswer.textContent = `Bạn chọn: ${selectedAnswer} · Đáp án: ${question.answer}`;
  }

  function renderQuestion() {
    const session = state.session;
    const question = session.queue[session.index];
    const isFlashcard = question.type === "short_answer";
    const position = session.index + 1;
    elements.questionNumber.textContent = String(position).padStart(2, "0");
    elements.questionTotal.textContent = `/ ${session.queue.length}`;
    elements.progressBar.style.width = `${(position / session.queue.length) * 100}%`;
    elements.questionLevel.textContent = question.theory_level === "advanced" ? "Advanced" : "Core";
    elements.questionDifficulty.textContent = question.difficulty || "Theory";
    elements.questionType.textContent = isFlashcard ? "Flashcard" : "Multiple choice";
    elements.questionStyleTag.hidden = question.question_style !== "calculation";
    elements.questionId.textContent = question.id;
    elements.questionMeta.textContent = `${question.day} · ${question.topic}`;
    elements.questionText.textContent = question.question;
    elements.optionList.innerHTML = "";
    elements.answerFeedback.hidden = true;
    elements.flashcardActions.hidden = true;
    elements.flashcardInputWrap.hidden = !isFlashcard;
    elements.flashcardNote.value = "";
    elements.nextQuestionButton.disabled = true;
    elements.nextQuestionButton.textContent = session.index === session.queue.length - 1 ? "Xem kết quả →" : "Câu tiếp theo →";
    elements.liveMessage.textContent = isFlashcard ? "Tự trả lời trong đầu trước khi hiện đáp án." : "Chọn một đáp án để tiếp tục.";

    if (isFlashcard) {
      const revealButton = document.createElement("button");
      revealButton.type = "button";
      revealButton.className = "button button-secondary";
      revealButton.textContent = "Hiện đáp án";
      revealButton.addEventListener("click", () => revealFlashcard(question, revealButton));
      elements.optionList.appendChild(revealButton);
      return;
    }

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = String.fromCharCode(65 + index);
      const text = document.createElement("span");
      text.textContent = option;
      button.append(letter, text);
      button.addEventListener("click", () => answerMultipleChoice(question, option, button));
      elements.optionList.appendChild(button);
    });
  }

  function answerMultipleChoice(question, selectedAnswer, selectedButton) {
    if (state.session.answers.has(question.id)) return;
    const isCorrect = selectedAnswer === question.answer;
    state.session.answers.set(question.id, { type: question.type, selectedAnswer, isCorrect });
    state.session.mcAttempted += 1;
    state.progress.sessionStats.attempted += 1;
    if (isCorrect) {
      state.session.mcCorrect += 1;
      state.progress.sessionStats.correct += 1;
      removeValue(state.progress.wrongIds, question.id);
    } else {
      addUnique(state.progress.wrongIds, question.id);
      state.session.incorrectQuestions.push(question);
    }
    addUnique(state.progress.answeredIds, question.id);
    persistProgress();
    [...elements.optionList.querySelectorAll(".option-button")].forEach((button) => {
      button.disabled = true;
      const optionText = button.querySelector("span:last-child").textContent;
      if (optionText === question.answer) button.classList.add("correct");
    });
    selectedButton.classList.toggle("incorrect", !isCorrect);
    setFeedback(question, isCorrect, selectedAnswer);
    elements.nextQuestionButton.disabled = false;
    renderDashboard();
  }

  function revealFlashcard(question, revealButton) {
    revealButton.disabled = true;
    revealButton.textContent = "Đáp án đã mở";
    elements.answerFeedback.hidden = false;
    elements.feedbackState.textContent = "Flashcard revealed";
    elements.feedbackState.classList.remove("incorrect");
    elements.feedbackAnswer.textContent = question.answer;
    renderExplanation(elements.explanationText, question.explanation);
    elements.explanationWordCount.textContent = `${countWords(question.explanation)} words`;
    elements.sourceMeta.textContent = sourceText(question);
    elements.flashcardActions.hidden = false;
    elements.liveMessage.textContent = "Tự đánh giá mức độ nắm bài của bạn.";
  }

  function markFlashcard(status) {
    const question = state.session.queue[state.session.index];
    if (state.session.answers.has(question.id)) return;
    state.session.answers.set(question.id, { type: question.type, status });
    state.session.flashcards += 1;
    addUnique(state.progress.answeredIds, question.id);
    if (status === "mastered") {
      addUnique(state.progress.masteredFlashcardIds, question.id);
      removeValue(state.progress.reviewFlashcardIds, question.id);
      removeValue(state.progress.wrongIds, question.id);
    } else {
      addUnique(state.progress.reviewFlashcardIds, question.id);
      addUnique(state.progress.wrongIds, question.id);
      if (!state.session.incorrectQuestions.some((item) => item.id === question.id)) state.session.incorrectQuestions.push(question);
    }
    persistProgress();
    elements.masteredButton.disabled = true;
    elements.reviewFlashcardButton.disabled = true;
    elements.nextQuestionButton.disabled = false;
    elements.liveMessage.textContent = status === "mastered" ? "Đã ghi nhận: bạn đã nắm flashcard này." : "Đã ghi nhận để ôn lại sau.";
    renderDashboard();
  }

  function goNext() {
    if (!state.session || elements.nextQuestionButton.disabled) return;
    if (state.session.index >= state.session.queue.length - 1) {
      showResults();
      return;
    }
    state.session.index += 1;
    renderQuestion();
  }

  function showResults() {
    const session = state.session;
    const wrong = session.incorrectQuestions;
    elements.resultAccuracy.textContent = formatAccuracy(session.mcCorrect, session.mcAttempted);
    elements.resultCorrect.textContent = session.mcCorrect;
    elements.resultIncorrect.textContent = wrong.filter((question) => question.type === "multiple_choice").length;
    elements.resultFlashcards.textContent = session.flashcards;
    elements.resultWrongCount.textContent = `${wrong.length} câu`;
    elements.resultReviewButton.disabled = wrong.length === 0;
    elements.wrongList.innerHTML = "";
    elements.resultEmptyState.hidden = wrong.length !== 0;
    wrong.forEach((question) => {
      const article = document.createElement("article");
      article.className = "wrong-item";
      const meta = document.createElement("div");
      meta.className = "wrong-item-meta";
      meta.innerHTML = `<span>${question.id} · ${question.day}</span><span>${question.type === "short_answer" ? "Flashcard" : "Review"}</span>`;
      const title = document.createElement("h4");
      title.textContent = question.question;
      const explanation = document.createElement("div");
      explanation.className = "explanation-text";
      renderExplanation(explanation, question.explanation);
      const answer = document.createElement("p");
      answer.className = "wrong-answer";
      answer.textContent = `Đáp án / key idea: ${question.answer}`;
      article.append(meta, title, explanation, answer);
      elements.wrongList.appendChild(article);
    });
    showView("result");
  }

  function resetProgress() {
    if (!window.confirm("Xóa toàn bộ tiến độ và danh sách câu sai trên thiết bị này?")) return;
    state.progress = defaultProgress();
    state.filters = { ...defaultFilters };
    localStorage.removeItem(STORAGE_KEY);
    initializeFilters(bankQuestions);
    renderDashboard();
    showView("dashboard");
  }

  function navigateToDashboard() {
    state.session = null;
    showView("dashboard");
    renderDashboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindEvents() {
    [elements.theoryLevel, elements.dayFilter, elements.topicFilter, elements.difficultyFilter, elements.typeFilter, elements.questionStyle, elements.questionLimit].forEach((control) => control.addEventListener("change", syncFilterState));
    elements.startQuizButton.addEventListener("click", () => startSession("filtered"));
    elements.startFromHeroButton.addEventListener("click", () => startSession("filtered"));
    elements.reviewWrongButton.addEventListener("click", () => startSession("wrong"));
    elements.resultReviewButton.addEventListener("click", () => startSession("wrong"));
    elements.resultNewSessionButton.addEventListener("click", () => { showView("dashboard"); renderDashboard(); });
    elements.backToDashboardButton.addEventListener("click", () => { state.session = null; showView("dashboard"); renderDashboard(); });
    elements.finishSessionButton.addEventListener("click", showResults);
    elements.nextQuestionButton.addEventListener("click", goNext);
    elements.masteredButton.addEventListener("click", () => markFlashcard("mastered"));
    elements.reviewFlashcardButton.addEventListener("click", () => markFlashcard("review"));
    elements.resetProgressButton.addEventListener("click", resetProgress);
    elements.navigatorButton.addEventListener("click", navigateToDashboard);
  }

  let bankQuestions;
  try {
    bankQuestions = validateBank(bank);
    state.progress = loadProgress();
    initializeFilters(bankQuestions);
    bindEvents();
    renderDashboard();
  } catch (error) {
    elements.appError.hidden = false;
    elements.appErrorMessage.textContent = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(error);
  }
})();
