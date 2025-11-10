/**
 * Student Panel - Test Taking Interface
 * Полная логика прохождения тестов студентом
 */

// ============================================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================================

const state = {
    currentTest: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    startTime: null,
    timerId: null,
    totalQuestions: 0
};

// ============================================================================
// DOM ЭЛЕМЕНТЫ
// ============================================================================

const elements = {
    // Секции
    testsListContent: null,
    testTakingContent: null,
    testResultContent: null,

    // Тестирование
    testTitle: null,
    testDescription: null,
    timer: null,
    progress: null,
    progressBar: null,
    questionNavigation: null,
    currentQuestionContainer: null,

    // Кнопки навигации
    prevBtn: null,
    nextBtn: null,
    skipBtn: null,
    finishBtn: null,

    // Результаты
    resultScore: null,
    resultText: null,
    resultTime: null,
    detailedResults: null,

    // Модальное окно
    confirmFinishModal: null,
    modalMessage: null,

    // Уведомления
    loadingOverlay: null,
    loadingText: null,
    errorBanner: null,
    errorMessage: null
};

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

function init() {
    cacheElements();
    attachEventListeners();
    setupKeyboardNavigation();
    restoreSessionIfNeeded();
}

function cacheElements() {
    // Секции
    elements.testsListContent = document.getElementById('testsListContent');
    elements.testTakingContent = document.getElementById('testTakingContent');
    elements.testResultContent = document.getElementById('testResultContent');

    // Тестирование
    elements.testTitle = document.getElementById('testTitle');
    elements.testDescription = document.getElementById('testDescription');
    elements.timer = document.getElementById('timer');
    elements.progress = document.getElementById('progress');
    elements.progressBar = document.getElementById('progressBar');
    elements.questionNavigation = document.getElementById('questionNavigation');
    elements.currentQuestionContainer = document.getElementById('currentQuestionContainer');

    // Кнопки
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
    elements.skipBtn = document.getElementById('skipBtn');
    elements.finishBtn = document.getElementById('finishBtn');

    // Результаты
    elements.resultScore = document.getElementById('resultScore');
    elements.resultText = document.getElementById('resultText');
    elements.resultTime = document.getElementById('resultTime');
    elements.detailedResults = document.getElementById('detailedResults');

    // Модальное окно
    elements.confirmFinishModal = document.getElementById('confirmFinishModal');
    elements.modalMessage = document.getElementById('modalMessage');

    // Уведомления
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.loadingText = document.getElementById('loadingText');
    elements.errorBanner = document.getElementById('errorBanner');
    elements.errorMessage = document.getElementById('errorMessage');
}

function attachEventListeners() {
    // Event delegation для кнопок по data-action
    document.addEventListener('click', handleButtonClick);

    // Закрытие ошибки
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="close-error"]')) {
            hideError();
        }
    });
}

function handleButtonClick(e) {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
        case 'start':
            const testId = button.dataset.testId;
            if (testId) startTest(testId);
            break;
        case 'prev':
            previousQuestion();
            break;
        case 'next':
            nextQuestion();
            break;
        case 'skip':
            nextQuestion();
            break;
        case 'finish':
            confirmFinishTest();
            break;
        case 'modal-confirm':
            submitTest();
            elements.confirmFinishModal.close();
            break;
        case 'modal-cancel':
            elements.confirmFinishModal.close();
            break;
        case 'return':
            returnToList();
            break;
    }
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Игнорировать если фокус в поле ввода или тест не начат
        if (!state.currentTest || e.target.matches('input, textarea, select')) {
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                previousQuestion();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextQuestion();
                break;
            case 'Enter':
                if (!elements.nextBtn.classList.contains('hidden')) {
                    e.preventDefault();
                    nextQuestion();
                } else if (!elements.finishBtn.classList.contains('hidden')) {
                    e.preventDefault();
                    confirmFinishTest();
                }
                break;
            default:
                // Цифры 1-9, 0 для вопроса 10
                if (e.key >= '0' && e.key <= '9') {
                    const num = e.key === '0' ? 10 : parseInt(e.key);
                    if (num > 0 && num <= state.totalQuestions) {
                        e.preventDefault();
                        showQuestion(num - 1);
                    }
                }
                // Alt+F для завершения
                if (e.altKey && e.key === 'f') {
                    e.preventDefault();
                    confirmFinishTest();
                }
                break;
        }
    });
}

// ============================================================================
// УПРАВЛЕНИЕ ЗАГРУЗКОЙ И ОШИБКАМИ
// ============================================================================

function setLoading(isLoading, message = 'Загрузка...') {
    if (isLoading) {
        elements.loadingText.textContent = message;
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

function showError(message, allowRetry = false) {
    elements.errorMessage.textContent = message;
    elements.errorBanner.classList.remove('hidden');

    setTimeout(() => {
        hideError();
    }, 8000);
}

function hideError() {
    elements.errorBanner.classList.add('hidden');
}

// ============================================================================
// НАЧАЛО ТЕСТА
// ============================================================================

async function startTest(testId) {
    try {
        setLoading(true, 'Загрузка теста...');
        hideError();

        const response = await fetch(`/student/test/${testId}/start/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить тест');
        }

        const data = await response.json();

        // Инициализация состояния
        state.currentTest = data;
        state.currentQuestionIndex = 0;
        state.userAnswers = {};
        state.startTime = Date.now();
        state.totalQuestions = data.questions.length;

        // Сохранение в sessionStorage
        saveSession();

        // Переключение интерфейса
        elements.testsListContent.classList.add('hidden');
        elements.testTakingContent.classList.remove('hidden');

        // Заполнение информации о тесте
        elements.testTitle.textContent = data.title;
        elements.testDescription.textContent = data.description || '';

        // Рендеринг
        renderQuestionNavigation();
        showQuestion(0);
        startTimer();

        setLoading(false);
    } catch (error) {
        console.error('Error starting test:', error);
        setLoading(false);
        showError('Не удалось загрузить тест. Попробуйте обновить страницу.');
    }
}

// ============================================================================
// ТАЙМЕР
// ============================================================================

function startTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
    }

    state.timerId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        elements.timer.textContent = formatTime(elapsed);
    }, 1000);
}

function stopTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// НАВИГАЦИЯ ПО ВОПРОСАМ
// ============================================================================

function renderQuestionNavigation() {
    if (!state.currentTest) return;

    elements.questionNavigation.innerHTML = '';

    state.currentTest.questions.forEach((question, index) => {
        const li = document.createElement('li');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'w-10 h-10 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2';
        button.textContent = index + 1;

        const isAnswered = state.userAnswers[question.id] !== undefined;
        const isCurrent = index === state.currentQuestionIndex;

        if (isCurrent) {
            button.className += ' bg-brand-green-dark text-white shadow-md';
            button.setAttribute('aria-current', 'step');
        } else if (isAnswered) {
            button.className += ' bg-brand-green text-white';
        } else {
            button.className += ' bg-gray-200 text-gray-700 hover:bg-gray-300';
        }

        const answerStatus = isAnswered ? 'отвечен' : 'не отвечен';
        button.setAttribute('aria-label', `Вопрос ${index + 1}, ${answerStatus}`);
        button.onclick = () => showQuestion(index);

        li.appendChild(button);
        elements.questionNavigation.appendChild(li);
    });
}

function showQuestion(index) {
    if (!state.currentTest || index < 0 || index >= state.currentTest.questions.length) {
        return;
    }

    state.currentQuestionIndex = index;
    const question = state.currentTest.questions[index];

    // Рендеринг вопроса
    let html = `
        <div class="space-y-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="px-3 py-1.5 rounded-xl bg-brand-green text-white text-sm font-semibold rounded-lg">
                    Вопрос ${index + 1} из ${state.totalQuestions}
                </span>
            </div>
            
            <h2 class="text-xl font-semibold text-gray-900 leading-relaxed">
                ${escapeHtml(question.text)}
            </h2>
    `;

    // Изображение вопроса
    if (question.image) {
        html += `
            <figure class="my-6">
                <img 
                    src="${question.image}" 
                    alt="Изображение к вопросу ${index + 1}" 
                    class="max-w-full h-auto rounded-xl shadow-lg mx-auto"
                    style="max-height: 500px; object-fit: contain;"
                />
            </figure>
        `;
    }

    // Варианты ответов
    html += `
            <fieldset class="space-y-3" role="radiogroup" aria-label="Варианты ответа">
                <legend class="sr-only">Выберите один вариант ответа</legend>
    `;

    question.answers.forEach((answer, answerIndex) => {
        const isSelected = state.userAnswers[question.id] === answer.id;
        const inputId = `answer_${question.id}_${answer.id}`;

        html += `
            <label 
                for="${inputId}"
                class="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${isSelected
                ? 'border-brand-green bg-brand-green-container ring-2 ring-brand-green/20'
                : 'border-gray-200 hover:border-brand-green/50 hover:bg-gray-50'
            }"
                role="radio"
                aria-checked="${isSelected}"
            >
                <input 
                    type="radio" 
                    id="${inputId}"
                    name="question_${question.id}" 
                    value="${answer.id}"
                    ${isSelected ? 'checked' : ''}
                    data-question-id="${question.id}"
                    data-answer-id="${answer.id}"
                    class="radio radio-success border border-gray-300 flex-shrink-0 mt-0.5 focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
                />
                <span class="flex-1 text-gray-800 select-none">
                    <span class="font-medium text-gray-500 mr-2">${String.fromCharCode(65 + answerIndex)}.</span>
                    ${escapeHtml(answer.text)}
                </span>
            </label>
        `;
    });

    html += `
            </fieldset>
        </div>
    `;

    elements.currentQuestionContainer.innerHTML = html;

    // Добавление обработчиков для радио-кнопок
    const radioInputs = elements.currentQuestionContainer.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const questionId = parseInt(e.target.dataset.questionId);
            const answerId = parseInt(e.target.dataset.answerId);
            saveAnswer(questionId, answerId);
        });
    });

    // Обновление навигации
    updateNavigationButtons();
    renderQuestionNavigation();
    updateProgress();

    // Скролл вверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveAnswer(questionId, answerId) {
    state.userAnswers[questionId] = answerId;
    saveSession();
    renderQuestionNavigation();
    updateProgress();
}

function updateProgress() {
    const answered = Object.keys(state.userAnswers).length;
    const total = state.totalQuestions;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    elements.progress.textContent = `${answered}/${total}`;
    elements.progressBar.style.width = `${percentage}%`;
    elements.progressBar.setAttribute('aria-valuenow', percentage);
}

function updateNavigationButtons() {
    const isFirst = state.currentQuestionIndex === 0;
    const isLast = state.currentQuestionIndex === state.totalQuestions - 1;

    // Кнопка "Предыдущий"
    elements.prevBtn.disabled = isFirst;
    elements.prevBtn.classList.toggle('opacity-50', isFirst);
    elements.prevBtn.classList.toggle('cursor-not-allowed', isFirst);

    // Показ/скрытие кнопок
    if (isLast) {
        elements.nextBtn.classList.add('hidden');
        elements.skipBtn.classList.add('hidden');
        elements.finishBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.skipBtn.classList.remove('hidden');
        elements.finishBtn.classList.add('hidden');
    }
}

function previousQuestion() {
    if (state.currentQuestionIndex > 0) {
        showQuestion(state.currentQuestionIndex - 1);
    }
}

function nextQuestion() {
    if (state.currentQuestionIndex < state.totalQuestions - 1) {
        showQuestion(state.currentQuestionIndex + 1);
    }
}

// ============================================================================
// ЗАВЕРШЕНИЕ ТЕСТА
// ============================================================================

function confirmFinishTest() {
    const unanswered = state.totalQuestions - Object.keys(state.userAnswers).length;

    if (unanswered > 0) {
        elements.modalMessage.textContent = `У вас осталось ${unanswered} неотвеченных вопрос${getQuestionPlural(unanswered)}. Вы уверены, что хотите завершить тест?`;
    } else {
        elements.modalMessage.textContent = 'Вы ответили на все вопросы. Завершить тест?';
    }

    elements.confirmFinishModal.showModal();
}

async function submitTest() {
    try {
        setLoading(true, 'Отправка результатов...');
        stopTimer();

        const timeSpent = Math.floor((Date.now() - state.startTime) / 1000);

        const response = await fetch(`/student/test/${state.currentTest.id}/submit/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({
                answers: state.userAnswers,
                time_spent: timeSpent
            })
        });

        if (!response.ok) {
            throw new Error('Не удалось отправить результаты');
        }

        const result = await response.json();

        // Очистка сессии
        clearSession();

        // Показ результатов
        showResults(result);

        setLoading(false);
    } catch (error) {
        console.error('Error submitting test:', error);
        setLoading(false);
        showError('Не удалось отправить результаты. Проверьте подключение и попробуйте снова.');
        startTimer(); // Возобновляем таймер при ошибке
    }
}

// ============================================================================
// ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ
// ============================================================================
function showResults(result) {
    // Переключение секций
    elements.testTakingContent.classList.add('hidden');
    elements.testResultContent.classList.remove('hidden');

    // Процент и основная статистика
    const percentage = Math.round((result.correct / result.total) * 100);
    const passThreshold = result.pass_threshold || 60;
    const passed = percentage >= passThreshold;

    elements.resultScore.textContent = `${percentage}%`;
    elements.resultScore.style.color = passed ? '#059669' : '#DC2626';
    elements.resultText.textContent = `Правильных ответов: ${result.correct} из ${result.total}`;

    if (result.time_spent !== undefined) {
        elements.resultTime.textContent = `Затраченное время: ${formatTime(result.time_spent)}`;
    }

    // Детализация по вопросам
    let detailsHtml = '';

    result.details.forEach((detail, index) => {
        const isCorrect = detail.is_correct;
        const borderColor = isCorrect ? 'border-green-200' : 'border-red-200';
        const bgColor = isCorrect ? 'bg-green-50' : 'bg-red-50';
        const dividerColor = isCorrect ? 'border-green-200' : 'border-red-200';

        detailsHtml += `
            <details class="group ${bgColor} border-2 ${borderColor} rounded-xl overflow-hidden">
                <summary class="flex items-center gap-3 p-4 cursor-pointer list-none hover:bg-black/5 transition-colors">
                    <span class="text-2xl flex-shrink-0">${isCorrect ? '✅' : '❌'}</span>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 mb-1">Вопрос ${index + 1}</h3>
                        <p class="text-sm text-gray-600 line-clamp-1">${escapeHtml(detail.question_text)}</p>
                    </div>
                    <svg class="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </summary>
                
                <div class="px-4 pb-4 pt-0 border-t ${dividerColor}">
                    <div class="pt-4 space-y-3">
                        <p class="text-gray-800 font-medium">${escapeHtml(detail.question_text)}</p>
                        
                        <div class="space-y-2 text-sm bg-white rounded-lg p-3 border border-gray-200">
                            <div class="flex gap-2">
                                <span class="text-gray-600 font-medium min-w-[120px]">Ваш ответ:</span>
                                <span class="font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}">
                                    ${escapeHtml(detail.user_answer || 'Не отвечено')}
                                </span>
                            </div>
                            
                            ${!isCorrect ? `
                                <div class="flex gap-2 pt-2 border-t border-gray-200">
                                    <span class="text-gray-600 font-medium min-w-[120px]">Правильный ответ:</span>
                                    <span class="font-semibold text-green-700">
                                        ${escapeHtml(detail.correct_answer)}
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </details>
        `;
    });

    elements.detailedResults.innerHTML = detailsHtml;

    // Скролл наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function returnToList() {
    window.location.reload();
}

// ============================================================================
// СОХРАНЕНИЕ/ВОССТАНОВЛЕНИЕ СЕССИИ
// ============================================================================

function saveSession() {
    if (!state.currentTest) return;

    try {
        const sessionData = {
            testId: state.currentTest.id,
            currentQuestionIndex: state.currentQuestionIndex,
            userAnswers: state.userAnswers,
            startTime: state.startTime
        };

        sessionStorage.setItem('studentTestSession', JSON.stringify(sessionData));
    } catch (error) {
        console.warn('Could not save session:', error);
    }
}

function restoreSessionIfNeeded() {
    try {
        const savedSession = sessionStorage.getItem('studentTestSession');
        if (!savedSession) return;

        const sessionData = JSON.parse(savedSession);

        // Проверка актуальности (не старше 2 часов)
        const elapsed = Date.now() - sessionData.startTime;
        if (elapsed > 2 * 60 * 60 * 1000) {
            clearSession();
            return;
        }

        // Можно добавить UI для восстановления сессии
        console.log('Previous session found, but auto-restore is disabled');
    } catch (error) {
        console.warn('Could not restore session:', error);
        clearSession();
    }
}

function clearSession() {
    try {
        sessionStorage.removeItem('studentTestSession');
    } catch (error) {
        console.warn('Could not clear session:', error);
    }
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getQuestionPlural(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'ов';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'а';
    return 'ов';
}

// ============================================================================
// ЗАПУСК
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}