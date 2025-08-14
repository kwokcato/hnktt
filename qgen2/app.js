// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    // 渲染分類列表
    renderCategories();
    
    // 渲染難度列表
    renderDifficultyLevels();
    
    // 默認顯示第一題
    if (questions.length > 0) {
        displayQuestion(questions[0].id);
    }
});

// 渲染分類列表
function renderCategories() {
    const categoryList = document.getElementById('category-list');
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.textContent = category;
        div.onclick = () => filterByCategory(category);
        categoryList.appendChild(div);
    });
}

// 渲染難度列表
function renderDifficultyLevels() {
    const difficultyList = document.getElementById('difficulty-list');
    const levels = ['高難度 (答對率 <50%)', '中等難度 (50-70%)', '低難度 (>70%)'];
    
    levels.forEach(level => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.textContent = level;
        div.onclick = () => filterByDifficulty(level);
        difficultyList.appendChild(div);
    });
}

// 按分類過濾題目
function filterByCategory(category) {
    const filtered = questions.filter(q => q.category.includes(category));
    renderQuestionList(filtered, `分類: ${category}`);
}

// 按難度過濾題目
function filterByDifficulty(level) {
    let filtered = [];
    if (level.includes('<50%')) {
        filtered = questions.filter(q => q.correct_rate < 50);
    } else if (level.includes('50-70%')) {
        filtered = questions.filter(q => q.correct_rate >= 50 && q.correct_rate <= 70);
    } else {
        filtered = questions.filter(q => q.correct_rate > 70);
    }
    renderQuestionList(filtered, level);
}

// 渲染題目列表
function renderQuestionList(questions, title) {
    const sidebar = document.getElementById('sidebar');
    const listDiv = document.createElement('div');
    listDiv.className = 'question-list';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'category-title';
    titleDiv.textContent = title;
    listDiv.appendChild(titleDiv);
    
    questions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.textContent = `第${q.id}題 (${q.correct_rate}%)`;
        div.onclick = () => displayQuestion(q.id);
        listDiv.appendChild(div);
    });
    
    // 替換現有列表
    const existingList = document.querySelector('.question-list');
    if (existingList) {
        sidebar.replaceChild(listDiv, existingList);
    } else {
        sidebar.appendChild(listDiv);
    }
}

// 顯示題目和答案
function displayQuestion(id) {
    const question = questions.find(q => q.id === id);
    if (!question) return;
    
    const questionDisplay = document.getElementById('question-display');
    const answerDisplay = document.getElementById('answer-display');
    
    // 更新題目顯示
    questionDisplay.innerHTML = `
        <div class="question">
            <h3>第${question.id}題 (答對率: ${question.correct_rate}%)</h3>
            <p>${question.question}</p>
            <div class="options">
                ${Object.entries(question.options).map(([key, value]) => 
                    `<div>${key}. ${value}</div>`
                ).join('')}
            </div>
        </div>
    `;
    
    // 更新答案顯示
    answerDisplay.innerHTML = `
        <h4>答案與解析</h4>
        <p>正確答案: <strong>${question.correct_answer}</strong></p>
        <p>答對率: ${question.correct_rate}%</p>
        ${question.explanation ? `<p>解析: ${question.explanation}</p>` : ''}
    `;
    
    // 高亮選中的題目
    document.querySelectorAll('.question-item').forEach(item => {
        item.classList.remove('selected');
        if (item.textContent.includes(`第${id}題`)) {
            item.classList.add('selected');
        }
    });
}