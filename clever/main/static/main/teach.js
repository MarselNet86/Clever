let questionCounter = 0;
let deletedQuestions = new Set();

function updateEmptyState() {
    const hasQuestions = document.querySelectorAll('.question-block').length > 0;
    document.getElementById('emptyState').classList.toggle('hidden', hasQuestions);
}


// --- универсальное переключение табов ---
function activateTab(tabId) {
    // 1) сбрасываем состояние всем кнопкам
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-brand-green', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });

    // 2) подсвечиваем активную
    const activeBtn = document.getElementById(tabId);
    activeBtn.classList.add('bg-brand-green', 'text-white');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-600');

    // 3) открываем соответствующий блок
    document.getElementById('createTestContent').classList.add('hidden');
    document.getElementById('createGroupContent').classList.add('hidden');
    document.getElementById('myTestsContent').classList.add('hidden');
    document.getElementById('testDetailContent').classList.add('hidden');

    if (tabId === 'createTestTab') {
        document.getElementById('createTestContent').classList.remove('hidden');
    }
    if (tabId === 'createGroupTab') {
        document.getElementById('createGroupContent').classList.remove('hidden');
    }
    if (tabId === 'myTestsTab') {
        document.getElementById('myTestsContent').classList.remove('hidden');
    }
}

// назначаем обработчики
document.getElementById('createTestTab').onclick = () => activateTab('createTestTab');
document.getElementById('createGroupTab').onclick = () => activateTab('createGroupTab');
document.getElementById('myTestsTab').onclick = () => activateTab('myTestsTab');



// Функция для пересчета номеров вопросов
function renumberQuestions() {
    const questions = document.querySelectorAll('.question-block');
    questions.forEach((question, index) => {
        const questionNum = index + 1;
        const title = question.querySelector('.question-title');
        if (title) {
            title.textContent = `Вопрос ${questionNum}`;
        }
    });
}

// Управление состоянием вопроса в зависимости от выбранного типа
function updateQuestionTypeState(block, typeValue) {
    const answersContainer = block.querySelector(".answers-container");
    const correctAnswerContainer = block.querySelector(".correct-answer-container");
    const correctSelect = block.querySelector('[id^="correctSelect_"]');
    const answerInputs = block.querySelectorAll('input[name^="question_"][name*="_answer_"]');

    if (typeValue === "open") {
        // Скрываем контейнеры
        answersContainer?.classList.add("hidden");
        correctAnswerContainer?.classList.add("hidden");

        // Отключаем валидацию для select
        if (correctSelect) {
            correctSelect.removeAttribute('required');
            correctSelect.setAttribute('disabled', 'disabled');
            correctSelect.value = "";
        }

        // Отключаем валидацию для всех полей ответов
        answerInputs.forEach(input => {
            input.removeAttribute('required');
            input.setAttribute('disabled', 'disabled');
            input.value = ""; // Очищаем значение
        });
    } else {
        // Показываем контейнеры
        answersContainer?.classList.remove("hidden");
        correctAnswerContainer?.classList.remove("hidden");

        // Включаем валидацию для select
        if (correctSelect) {
            correctSelect.removeAttribute('disabled');
            correctSelect.setAttribute('required', 'required');
        }

        // Включаем валидацию для всех полей ответов
        answerInputs.forEach(input => {
            input.removeAttribute('disabled');
            input.setAttribute('required', 'required');
        });
    }
}


// Добавление нового вопроса
document.getElementById('addQuestionBtn').addEventListener('click', function () {
    questionCounter++;
    const questionHTML = `
        <div class="question-block border border-gray-300 rounded-xl p-6 relative" data-question="${questionCounter}">
            <button type="button" class="btn btn-circle btn-sm rounded-xl absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white border-none"
                onclick="removeQuestion(${questionCounter})">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <h4 class="text-lg font-bold text-brand-green-dark mb-4 question-title">Вопрос ${questionCounter}</h4>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text font-medium text-gray-700">Текст вопроса</span>
                </label>
                <textarea name="question_${questionCounter}_text" placeholder="Введите текст вопроса"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition resize-none"
                    rows="2" required></textarea>
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text font-medium text-gray-700">Картинка (необязательно)</span>
                </label>
                <input type="file" name="question_${questionCounter}_image" accept="image/*"
                    class="file-input file-input-bordered border border-gray-300 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>

            <div class="flex gap-4 items-center mb-3">
                <span class="text-sm font-medium text-gray-700">Тип вопроса:</span>
                <select name="question_${questionCounter}_type"
                        class="question-type select select-bordered border border-gray-300 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent p-2"
                        data-question-num="${questionCounter}">
                    <option value="choice">Тестовый вопрос</option>
                    <option value="open">Открытый вопрос</option>
                </select>
            </div>

            <div class="answers-container mb-4">
                <label class="label">
                    <span class="label-text font-medium text-gray-700">Варианты ответов (макс. 5)</span>
                </label>
                <div class="space-y-2" id="answers_${questionCounter}">
                    ${generateAnswerInputs(questionCounter, 4)}
                </div>
                <button type="button" class="btn btn-sm rounded-xl bg-brand-green-light hover:bg-brand-green text-white border-none mt-2 p-2"
                    onclick="addAnswer(${questionCounter})" id="addAnswerBtn_${questionCounter}">
                    Добавить вариант
                </button>
            </div>

            <div class="correct-answer-container form-control">
                <label class="label">
                    <span class="label-text font-medium text-gray-700">Правильный ответ</span>
                </label>
                <br>
                <select name="question_${questionCounter}_correct" 
                    class="select select-bordered h-[46px] rounded-xl px-4 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition bg-white"
                    required id="correctSelect_${questionCounter}">
                    <option value="">Выберите правильный ответ</option>
                    <option value="1">Вариант 1</option>
                    <option value="2">Вариант 2</option>
                    <option value="3">Вариант 3</option>
                    <option value="4">Вариант 4</option>
                </select>
            </div>

            <input type="hidden" name="question_${questionCounter}_answers_count" value="4" id="answersCount_${questionCounter}">
        </div>
    `;

    document.getElementById('questionsContainer').insertAdjacentHTML('beforeend', questionHTML);

    const block = document.querySelector(`[data-question="${questionCounter}"]`);
    const typeSelect = block.querySelector(".question-type");

    typeSelect.addEventListener("change", function () {
        updateQuestionTypeState(block, this.value);
    });

    // Устанавливаем правильное состояние при создании блока
    updateQuestionTypeState(block, typeSelect.value);

    renumberQuestions();
    updateEmptyState();
});

// Генерация полей для вариантов ответов
function generateAnswerInputs(questionNum, count) {
    let html = '';
    for (let i = 1; i <= count; i++) {
        html += `
                <div class="flex gap-2 items-center answer-row" data-answer="${i}">
                    <span class="text-gray-600 font-medium w-24">Вариант ${i}:</span>
                    <input type="text" name="question_${questionNum}_answer_${i}" placeholder="Введите вариант ответа"
                        class="input input-bordered border border-gray-300 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent p-2"
                        required />
                    <button type="button" class="btn btn-circle btn-sm rounded-xl bg-red-500 hover:bg-red-600 text-white border-none"
                        onclick="removeAnswer(${questionNum}, ${i})">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;
    }
    return html;
}

// Добавление варианта ответа
function addAnswer(questionNum) {
    const container = document.getElementById(`answers_${questionNum}`);
    const countInput = document.getElementById(`answersCount_${questionNum}`);
    let currentCount = parseInt(countInput.value);

    if (currentCount >= 5) {
        alert('Максимум 5 вариантов ответа!');
        return;
    }

    currentCount++;
    const newAnswer = `
            <div class="flex gap-2 items-center answer-row" data-answer="${currentCount}">
                <span class="text-gray-600 font-medium w-24">Вариант ${currentCount}:</span>
                <input type="text" name="question_${questionNum}_answer_${currentCount}" placeholder="Введите вариант ответа"
                    class="input input-bordered border border-gray-300 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent p-2"
                    required />
                <button type="button" class="btn btn-circle btn-sm rounded-xl bg-red-500 hover:bg-red-600 text-white border-none"
                    onclick="removeAnswer(${questionNum}, ${currentCount})">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
    container.insertAdjacentHTML('beforeend', newAnswer);
    countInput.value = currentCount;

    // Обновляем select с правильным ответом
    const correctSelect = document.getElementById(`correctSelect_${questionNum}`);
    const newOption = document.createElement('option');
    newOption.value = currentCount;
    newOption.textContent = `Вариант ${currentCount}`;
    correctSelect.appendChild(newOption);

    // Скрываем кнопку если достигли лимита
    if (currentCount >= 5) {
        document.getElementById(`addAnswerBtn_${questionNum}`).classList.add('hidden');
    }
}

// Удаление варианта ответа
function removeAnswer(questionNum, answerNum) {
    const container = document.getElementById(`answers_${questionNum}`);
    const countInput = document.getElementById(`answersCount_${questionNum}`);
    const currentCount = parseInt(countInput.value);

    if (currentCount <= 2) {
        alert('Минимум 2 варианта ответа!');
        return;
    }

    // Удаляем строку с ответом
    const answerRow = container.querySelector(`[data-answer="${answerNum}"]`);
    if (answerRow) {
        answerRow.remove();
    }

    // Пересчитываем варианты
    const remainingAnswers = container.querySelectorAll('.answer-row');
    remainingAnswers.forEach((row, index) => {
        const newNum = index + 1;
        row.setAttribute('data-answer', newNum);
        row.querySelector('.text-gray-600').textContent = `Вариант ${newNum}:`;
        const input = row.querySelector('input');
        input.name = `question_${questionNum}_answer_${newNum}`;
        const button = row.querySelector('button');
        button.setAttribute('onclick', `removeAnswer(${questionNum}, ${newNum})`);
    });

    // Обновляем счетчик
    countInput.value = remainingAnswers.length;

    // Обновляем select с правильным ответом
    const correctSelect = document.getElementById(`correctSelect_${questionNum}`);
    correctSelect.innerHTML = '<option value="">Выберите правильный ответ</option>';
    for (let i = 1; i <= remainingAnswers.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Вариант ${i}`;
        correctSelect.appendChild(option);
    }

    // Показываем кнопку добавления если были скрыты
    if (remainingAnswers.length < 5) {
        document.getElementById(`addAnswerBtn_${questionNum}`).classList.remove('hidden');
    }
}

// Удаление вопроса
function removeQuestion(questionNum) {
    const questionBlock = document.querySelector(`[data-question="${questionNum}"]`);
    if (questionBlock) {
        questionBlock.remove();
        deletedQuestions.add(questionNum);
        renumberQuestions();
        updateEmptyState();

    }
}

// Добавляем первый вопрос автоматически
document.getElementById('addQuestionBtn').click();

// Гарантируем корректное состояние открытых вопросов перед отправкой формы
const testForm = document.getElementById('testForm');
if (testForm) {
    testForm.addEventListener('submit', function (e) {
        const questionBlocks = document.querySelectorAll('.question-block');

        questionBlocks.forEach(block => {
            const typeSelect = block.querySelector('.question-type');
            if (typeSelect && typeSelect.value === 'open') {
                // Для открытых вопросов принудительно убираем required со всех полей ответов
                const answerInputs = block.querySelectorAll('input[name^="question_"][name*="_answer_"]');
                const correctSelect = block.querySelector('[id^="correctSelect_"]');

                answerInputs.forEach(input => {
                    input.removeAttribute('required');
                    input.setAttribute('disabled', 'disabled');
                });

                if (correctSelect) {
                    correctSelect.removeAttribute('required');
                    correctSelect.setAttribute('disabled', 'disabled');
                }
            }
        });
    });
}

// Функционал поиска и фильтрации
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const resultsTable = document.getElementById('resultsTableBody');
    const noResultsMessage = document.getElementById('noResultsMessage');

    if (searchInput && filterStatus) {
        function filterResults() {
            const searchTerm = searchInput.value.toLowerCase();
            const statusFilter = filterStatus.value;
            const rows = document.querySelectorAll('.result-row');
            let visibleCount = 0;

            rows.forEach(row => {
                const testName = row.dataset.testName;
                const studentName = row.dataset.studentName;
                const status = row.dataset.status;

                // Проверка поиска
                const matchesSearch = testName.includes(searchTerm) || studentName.includes(searchTerm);

                // Проверка фильтра статуса
                const matchesStatus = statusFilter === 'all' || status === statusFilter;

                // Показываем/скрываем строку
                if (matchesSearch && matchesStatus) {
                    row.classList.remove('hidden');
                    visibleCount++;
                } else {
                    row.classList.add('hidden');
                }
            });

            // Показываем сообщение если ничего не найдено
            if (visibleCount === 0 && resultsTable) {
                resultsTable.parentElement.classList.add('hidden');
                if (noResultsMessage) {
                    noResultsMessage.classList.remove('hidden');
                }
            } else {
                resultsTable.parentElement.classList.remove('hidden');
                if (noResultsMessage) {
                    noResultsMessage.classList.add('hidden');
                }
            }
        }

        // Обработчики событий
        searchInput.addEventListener('input', filterResults);
        filterStatus.addEventListener('change', filterResults);
    }
});

let currentTestResults = [];

// Функция просмотра результатов теста
async function viewTestResults(testId) {
    try {
        // Показываем загрузку
        showLoading('Загрузка результатов...');

        const response = await fetch(`/teacher/test/${testId}/results/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить результаты');
        }

        const data = await response.json();
        currentTestResults = data.results;

        // Заполняем информацию о тесте
        document.getElementById('testDetailTitle').textContent = data.test_title;
        document.getElementById('testDetailGroup').textContent = `Группа: ${data.group_name}`;
        document.getElementById('testDetailQuestions').textContent = `${data.questions_count} вопрос${getQuestionPlural(data.questions_count)}`;
        document.getElementById('testDetailCreated').textContent = `Создан ${data.created_at}`;
        document.getElementById('testDetailTotal').textContent = data.total_completed;

        // Показываем/скрываем описание
        const descBlock = document.getElementById('testDetailDescriptionBlock');
        const descText = document.getElementById('testDetailDescription');
        if (data.test_description) {
            descText.textContent = data.test_description;
            descBlock.classList.remove('hidden');
        } else {
            descBlock.classList.add('hidden');
        }

        // Отображаем результаты
        renderTestResults(data.results);

        // Переключаем на вкладку с детальными результатами
        document.getElementById('myTestsContent').classList.add('hidden');
        document.getElementById('testDetailContent').classList.remove('hidden');

        // Сбрасываем фильтры
        document.getElementById('testDetailSearchInput').value = '';
        document.getElementById('testDetailFilterStatus').value = 'all';

        hideLoading();

    } catch (error) {
        console.error('Error loading test results:', error);
        hideLoading();
        alert('Не удалось загрузить результаты теста');
    }
}

// Отрисовка результатов в таблице
function renderTestResults(results) {
    const tbody = document.getElementById('testDetailTableBody');
    const noResults = document.getElementById('testDetailNoResults');
    const table = tbody.closest('.overflow-x-auto');

    if (!results || results.length === 0) {
        table.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    table.classList.remove('hidden');
    noResults.classList.add('hidden');

    tbody.innerHTML = results.map(result => `
        <tr class="border-b border-gray-200 hover:bg-brand-green-container transition-colors result-row"
            data-student-name="${result.student_name.toLowerCase()}"
            data-status="${result.passed ? 'passed' : 'failed'}">
            <td class="p-4">
                <div class="font-medium text-gray-900">${escapeHtml(result.student_name)}</div>
                <div class="text-sm text-gray-500">@${escapeHtml(result.student_username)}</div>
            </td>
            <td class="p-4">
                <span class="badge bg-brand-green-light text-white rounded-xl px-3 py-1">
                    ${escapeHtml(result.student_group)}
                </span>
            </td>
            <td class="text-center p-4">
                <span class="font-bold text-brand-green-dark">${result.score}/${result.total}</span>
            </td>
            <td class="text-center p-4">
                <span class="badge ${result.passed ? 'bg-green-500' : 'bg-red-500'} text-white text-lg px-4 py-2 rounded-xl">
                    ${result.percentage}%
                </span>
            </td>
            <td class="text-center p-4 text-gray-600">${result.time_formatted}</td>
            <td class="text-center p-4 text-gray-600 text-sm">${result.completed_at}</td>
        </tr>
    `).join('');
}

// Фильтрация результатов
function filterTestResults() {
    const searchValue = document.getElementById('testDetailSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('testDetailFilterStatus').value;

    const filtered = currentTestResults.filter(result => {
        const matchesSearch = result.student_name.toLowerCase().includes(searchValue) ||
            result.student_username.toLowerCase().includes(searchValue);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'passed' && result.passed) ||
            (statusFilter === 'failed' && !result.passed);
        return matchesSearch && matchesStatus;
    });

    renderTestResults(filtered);

    // Показываем сообщение "ничего не найдено" если есть результаты, но все отфильтрованы
    const noResults = document.getElementById('testDetailNoResults');
    const table = document.getElementById('testDetailTableBody').closest('.overflow-x-auto');

    if (currentTestResults.length > 0 && filtered.length === 0) {
        table.classList.add('hidden');
        noResults.classList.remove('hidden');
    } else {
        noResults.classList.add('hidden');
    }
}

// Утилиты
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getQuestionPlural(count) {
    if (count % 10 === 1 && count % 100 !== 11) return '';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'а';
    return 'ов';
}

function showLoading(message = 'Загрузка...') {
    console.log(message);
}

function hideLoading() {
}

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('testDetailSearchInput');
    const filterStatus = document.getElementById('testDetailFilterStatus');

    if (searchInput) {
        searchInput.addEventListener('input', filterTestResults);
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', filterTestResults);
    }
});