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
    if (!activeBtn) return; // защита на случай, если элемента нет
    activeBtn.classList.add('bg-brand-green', 'text-white');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-600');

    // 3) скрываем все блоки
    document.getElementById('createTestContent')?.classList.add('hidden');
    document.getElementById('createGroupContent')?.classList.add('hidden');
    document.getElementById('myTestsContent')?.classList.add('hidden');
    document.getElementById('testDetailContent')?.classList.add('hidden');
    document.getElementById('testLevelsContent')?.classList.add('hidden');

    // 4) показываем нужный
    if (tabId === 'createTestTab') {
        document.getElementById('createTestContent')?.classList.remove('hidden');
    } else if (tabId === 'createGroupTab') {
        document.getElementById('createGroupContent')?.classList.remove('hidden');
    } else if (tabId === 'myTestsTab') {
        document.getElementById('myTestsContent')?.classList.remove('hidden');
    } else if (tabId === 'testLevelsTab') {
        document.getElementById('testLevelsContent')?.classList.remove('hidden');
    }
}

// назначаем обработчики
document.getElementById('createTestTab').onclick = () => activateTab('createTestTab');
document.getElementById('createGroupTab').onclick = () => activateTab('createGroupTab');
document.getElementById('myTestsTab').onclick = () => activateTab('myTestsTab');
document.getElementById('testLevelsTab').onclick = () => activateTab('testLevelsTab');


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

// Добавление нового вопроса
document.getElementById('addQuestionBtn').addEventListener('click', function () {

    questionCounter++;
    const questionHTML = `
        <div class="question-block group relative bg-gray-50/30 border border-gray-100 rounded-[2rem] p-6 md:p-8 transition-all hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50" data-question="${questionCounter}">
            
            <!-- Action: Удаление вопроса (вынесено за пределы для чистоты) -->
            <button type="button" 
                class="absolute -top-3 -right-3 w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-gray-100 z-10"
                onclick="removeQuestion(${questionCounter})">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <!-- Header: Номер и Тип -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-brand-green text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-brand-green/20">
                        ${questionCounter}
                    </div>
                    <h4 class="text-xl font-black text-gray-800 tracking-tight">Настройка вопроса</h4>
                </div>

                <!-- Селектор типа с улучшенным стилем -->
                <div class="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Тип задания:</span>
                    <select name="question_${questionCounter}_type"
                            class="question-type select select-sm bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-0 h-10 px-4"
                            data-question-num="${questionCounter}">
                        <option value="choice">Тестовый (Выбор)</option>
                        <option value="open">Открытый (Текст)</option>
                    </select>
                </div>
            </div>

            <!-- Сетка: Контент vs Логика -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <!-- Левая колонка: Что видит ученик -->
                <div class="space-y-6">
                    <div class="form-control">
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Текст вопроса</label>
                        <textarea name="question_${questionCounter}_text" 
                            placeholder="Напишите условие задачи или сам вопрос..."
                            class="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all font-medium text-gray-700 placeholder:text-gray-300 resize-none"
                            rows="3" required></textarea>
                    </div>

                    <div class="form-control">
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Медиафайл (изображение)</label>
                        <div class="relative group/file">
                            <input type="file" name="question_${questionCounter}_image" accept="image/*"
                                class="file-input w-full bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-green text-xs font-bold text-gray-500" />
                        </div>
                    </div>
                </div>

                <!-- Правая колонка: Как система проверяет -->
                <div class="space-y-6">
                    
                    <!-- Контейнер вариантов (для Choice) -->
                    <div class="answers-container" id="choice_logic_${questionCounter}">
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Варианты ответов</label>
                        <div class="space-y-3" id="answers_${questionCounter}">
                            ${generateAnswerInputs(questionCounter, 4)}
                        </div>
                        
                        <button type="button" 
                            class="mt-4 flex items-center gap-2 text-[10px] font-black text-brand-green hover:text-brand-green-hover transition-colors px-1"
                            onclick="addAnswer(${questionCounter})" id="addAnswerBtn_${questionCounter}">
                            <div class="w-5 h-5 bg-brand-green/10 rounded-lg flex items-center justify-center">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
                            </div>
                            ДОБАВИТЬ ВАРИАНТ
                        </button>
                    </div>

                    <!-- Секция правильного ответа (Выделена цветом) -->
                    <div class="p-6 bg-brand-green/5 border border-brand-green/10 rounded-[1.5rem]">
                        
                        <!-- Селект для Choice -->
                        <div class="correct-answer-select-container">
                            <label class="block text-[10px] font-black text-brand-green uppercase tracking-widest mb-3">Правильный вариант</label>
                            <select name="question_${questionCounter}_correct" 
                                class="select w-full bg-white border border-gray-100 rounded-xl font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-green transition-all"
                                required id="correctSelect_${questionCounter}">
                                <option value="">Укажите верный номер</option>
                                <option value="1">Вариант 1</option>
                                <option value="2">Вариант 2</option>
                                <option value="3">Вариант 3</option>
                                <option value="4">Вариант 4</option>
                            </select>
                        </div>

                        <!-- Поле для Open -->
                        <div class="correct-answer-text-container hidden">
                            <label class="block text-[10px] font-black text-brand-green uppercase tracking-widest mb-3">Ожидаемое слово/фраза</label>
                            <input type="text" name="question_${questionCounter}_correct_text" 
                                placeholder="Напр: Фотосинтез"
                                class="w-full px-5 py-4 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green transition-all font-bold text-gray-800 placeholder:text-gray-300"
                                id="correctText_${questionCounter}" />
                            <p class="text-[9px] font-bold text-brand-green/60 mt-2 uppercase">Проверка не чувствительна к регистру</p>
                        </div>
                    </div>
                </div>
            </div>

            <input type="hidden" name="question_${questionCounter}_answers_count" value="4" id="answersCount_${questionCounter}">
        </div>
    `;
    document.getElementById('questionsContainer').insertAdjacentHTML('beforeend', questionHTML);

    // Находим только что добавленный блок
    const block = document.querySelector(`[data-question="${questionCounter}"]`);
    const typeSelect = block.querySelector(".question-type");
    const answersContainer = block.querySelector(".answers-container");

    // Находим контейнеры для правильных ответов
    const correctSelectContainer = block.querySelector(".correct-answer-select-container");
    const correctTextContainer = block.querySelector(".correct-answer-text-container");

    // Находим сами инпуты
    const correctSelect = block.querySelector(`#correctSelect_${questionCounter}`);
    const correctTextInput = block.querySelector(`#correctText_${questionCounter}`);

    // Обработчик переключения типа вопроса
    typeSelect.addEventListener("change", function () {
        const questionNum = parseInt(this.dataset.questionNum);

        if (this.value === "open") {
            // -- РЕЖИМ ОТКРЫТОГО ВОПРОСА --

            // Скрываем блоки
            answersContainer.classList.add("hidden");
            correctSelectContainer.classList.add("hidden");
            correctTextContainer.classList.remove("hidden");

            // Отключаем селект правильного ответа
            correctSelect.disabled = true;
            correctSelect.removeAttribute('required');

            // Включаем текстовое поле
            correctTextInput.disabled = false;
            correctTextInput.setAttribute('required', 'required');

            // Отключаем ВСЕ поля вариантов ответов
            const answerInputs = block.querySelectorAll(`input[name^="question_${questionNum}_answer_"]`);
            answerInputs.forEach(input => {
                input.disabled = true;
                input.removeAttribute('required');
            });

        } else {
            // -- РЕЖИМ ТЕСТОВОГО ВОПРОСА --

            // Показываем блоки
            answersContainer.classList.remove("hidden");
            correctSelectContainer.classList.remove("hidden");
            correctTextContainer.classList.add("hidden");

            // Включаем селект правильного ответа
            correctSelect.disabled = false;
            correctSelect.setAttribute('required', 'required');

            // Отключаем текстовое поле
            correctTextInput.disabled = true;
            correctTextInput.removeAttribute('required');

            // Включаем поля вариантов ответов
            const answerInputs = block.querySelectorAll(`input[name^="question_${questionNum}_answer_"]`);
            answerInputs.forEach(input => {
                input.disabled = false;
                input.setAttribute('required', 'required');
            });
        }
    });

    typeSelect.dispatchEvent(new Event('change'));
    renumberQuestions();
    updateEmptyState();
});


// Генерация полей для вариантов ответов
function generateAnswerInputs(questionNum, count) {
    let html = '';
    for (let i = 1; i <= count; i++) {
        html += `
            <div class="flex gap-3 items-center answer-row group/answer animate-in fade-in slide-in-from-left-2" data-answer="${i}">
                <!-- Метка варианта в стиле микро-капс -->
                <span class="text-[10px] font-black text-gray-400 uppercase w-20 tracking-widest shrink-0 ml-1">
                    Вариант ${i}
                </span>
                
                <!-- Улучшенное поле ввода -->
                <input type="text" name="question_${questionNum}_answer_${i}" 
                    placeholder="Введите текст ответа..."
                    class="flex-1 px-5 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:bg-white transition-all font-medium text-gray-700 placeholder:text-gray-200 shadow-sm" 
                    required />
                
                <!-- Мягко-красная кнопка удаления -->
                <button type="button" 
                    class="w-10 h-10 bg-red-50 hover:bg-red-600 text-red-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-red-100 shrink-0 shadow-sm"
                    onclick="removeAnswer(${questionNum}, ${i})"
                    title="Удалить вариант">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
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

    // Проверяем текущий тип вопроса
    const questionBlock = document.querySelector(`[data-question="${questionNum}"]`);
    const isChoice = questionBlock.querySelector('.question-type').value === 'choice';

    const newAnswer = `
        <div class="flex gap-3 items-center answer-row group/answer animate-in fade-in slide-in-from-left-2 duration-300" data-answer="${currentCount}">
            <!-- Метка варианта: микро-капс -->
            <span class="text-[10px] font-black text-gray-400 uppercase w-20 tracking-widest shrink-0 ml-1">
                Вариант ${currentCount}
            </span>
            
            <!-- Поле ввода: shadow-sm и мягкие границы -->
            <input type="text" name="question_${questionNum}_answer_${currentCount}" 
                placeholder="Введите текст ответа..."
                class="flex-1 px-5 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:bg-white transition-all font-medium text-gray-700 placeholder:text-gray-200 shadow-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                ${isChoice ? 'required' : 'disabled'} />
            
            <!-- Кнопка удаления: мягко-красная (ваша новая база) -->
            <button type="button" 
                class="w-10 h-10 bg-red-50 hover:bg-red-600 text-red-400 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-red-100 shrink-0 shadow-sm"
                onclick="removeAnswer(${questionNum}, ${currentCount})"
                title="Удалить вариант">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
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