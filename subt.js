// 全局變量存儲CSV數據
let scheduleData = [];
let allTeachers = [];
let excludedTeachers = [];
let absentTeacher = '';

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', function() {
    // 讀取CSV文件
    fetch('tt.csv')
        .then(response => response.text())
        .then(csvText => {
            // 解析CSV數據
            scheduleData = parseCSV(csvText);
            
            // 獲取所有教師名單
            allTeachers = [...new Set(scheduleData.map(item => item.teacher))].sort();
            
            // 初始化教師下拉選單
            initTeacherDropdown();
            
            // 初始化排除教師面板
            initExclusionPanel();
            
            // 設置事件監聽器
            document.getElementById('toggleExclusion').addEventListener('click', toggleExclusionPanel);
            document.getElementById('arrangeBtn').addEventListener('click', arrangeSubstitution);
            document.getElementById('teacher').addEventListener('change', showTeacherSchedule);
        })
        .catch(error => {
            console.error('讀取CSV文件時出錯:', error);
            document.getElementById('results').innerHTML = '<p style="color:red;">讀取課表數據失敗，請檢查CSV文件是否存在。</p>';
        });
});

// 解析CSV數據
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    // 跳過可能的BOM和空行
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        // 處理可能的BOM字符
        const cleanLine = line.replace(/^\uFEFF/, '');
        const parts = cleanLine.split(',');
        
        if (parts.length >= 7) {
            result.push({
                year: parts[0],
                day: parseInt(parts[1]),
                period: parseInt(parts[2]),
                teacher: parts[3],
                class: parts[4],
                subject: parts[5],
                room: parts[6]
            });
        }
    }
    
    return result;
}

// 初始化教師下拉選單
function initTeacherDropdown() {
    const teacherSelect = document.getElementById('teacher');
    
    allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher;
        option.textContent = teacher;
        teacherSelect.appendChild(option);
    });
}

// 初始化排除教師面板
function initExclusionPanel() {
    const exclusionPanel = document.getElementById('exclusionTeachers');
    
    allTeachers.forEach(teacher => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `exclude_${teacher}`;
        checkbox.value = teacher;
        checkbox.addEventListener('change', updateExcludedTeachers);
        
        const label = document.createElement('label');
        label.htmlFor = `exclude_${teacher}`;
        label.textContent = teacher;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        exclusionPanel.appendChild(div);
    });
}

// 切換排除教師面板可見性
function toggleExclusionPanel() {
    const panel = document.getElementById('exclusionPanel');
    const toggle = document.getElementById('toggleExclusion');
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        toggle.textContent = '- 隱藏排除教師名單';
    } else {
        panel.classList.add('hidden');
        toggle.textContent = '+ 顯示排除教師名單';
    }
}

// 更新排除教師列表
function updateExcludedTeachers() {
    excludedTeachers = [];
    const checkboxes = document.querySelectorAll('#exclusionTeachers input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        excludedTeachers.push(checkbox.value);
    });
}

// 顯示教師時間表
function showTeacherSchedule() {
    const teacherSelect = document.getElementById('teacher');
    absentTeacher = teacherSelect.value;
    const scheduleDiv = document.getElementById('teacherSchedule');
    
    if (!absentTeacher) {
        scheduleDiv.classList.add('hidden');
        return;
    }
    
    // 找出該教師的所有課程
    const teacherLessons = scheduleData.filter(item => item.teacher === absentTeacher);
    
    if (teacherLessons.length === 0) {
        scheduleDiv.innerHTML = `<p>${absentTeacher} 沒有課程安排。</p>`;
        scheduleDiv.classList.remove('hidden');
        return;
    }
    
    // 按星期分組
    const lessonsByDay = {};
    teacherLessons.forEach(lesson => {
        if (!lessonsByDay[lesson.day]) {
            lessonsByDay[lesson.day] = [];
        }
        lessonsByDay[lesson.day].push(lesson);
    });
    
    // 生成時間表HTML
    let html = `<h2>${absentTeacher} 的時間表</h2>`;
    
    // 按星期順序顯示
    for (let day = 1; day <= 5; day++) {
        if (!lessonsByDay[day]) continue;
        
        const dayLessons = lessonsByDay[day];
        dayLessons.sort((a, b) => a.period - b.period);
        
        html += `
            <div class="day-header">星期${day}</div>
            <table>
                <thead>
                    <tr>
                        <th>節次</th>
                        <th>班別</th>
                        <th>科目</th>
                        <th>教室</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        dayLessons.forEach(lesson => {
            html += `
                <tr>
                    <td>第${lesson.period}節</td>
                    <td>${lesson.class}</td>
                    <td>${lesson.subject}</td>
                    <td>${lesson.room}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
    }
    
    scheduleDiv.innerHTML = html;
    scheduleDiv.classList.remove('hidden');
}

// 編排代堂
function arrangeSubstitution() {
    const selectedDays = [];
    
    // 獲取選中的星期
    for (let i = 1; i <= 5; i++) {
        if (document.getElementById(`day${i}`).checked) {
            selectedDays.push(i);
        }
    }
    
    // 驗證輸入
    if (!absentTeacher) {
        alert('請選擇請假教師');
        return;
    }
    
    if (selectedDays.length === 0) {
        alert('請選擇至少一個代堂日期');
        return;
    }
    
    // 更新排除教師列表
    updateExcludedTeachers();
    
    // 找出請假教師的所有課程
    const absentLessons = scheduleData.filter(item => 
        item.teacher === absentTeacher && selectedDays.includes(item.day)
    );
    
    if (absentLessons.length === 0) {
        document.getElementById('results').innerHTML = `<p>${absentTeacher} 在選定的日期沒有課程。</p>`;
        return;
    }
    
    // 按星期和節次分組請假課程
    const lessonsByDay = {};
    absentLessons.forEach(lesson => {
        if (!lessonsByDay[lesson.day]) {
            lessonsByDay[lesson.day] = [];
        }
        lessonsByDay[lesson.day].push(lesson);
    });
    
    // 為每一天安排代堂
    const substitutionResults = {};
    const usedSubstituteTeachers = new Set();
    
    for (const day in lessonsByDay) {
        const dayInt = parseInt(day);
        const dayLessons = lessonsByDay[day];
        
        // 按節次排序
        dayLessons.sort((a, b) => a.period - b.period);
        
        // 找出這天所有教師的課程安排
        const daySchedule = scheduleData.filter(item => item.day === dayInt);
        
        // 計算每位教師這天的授課節數
        const teacherLessonCount = {};
        daySchedule.forEach(lesson => {
            teacherLessonCount[lesson.teacher] = (teacherLessonCount[lesson.teacher] || 0) + 1;
        });
        
        // 為每節課安排代堂教師
        const daySubstitutions = [];
        let failed = false;
        
        for (const lesson of dayLessons) {
            // 找出可用的代堂教師
            const availableTeachers = allTeachers.filter(teacher => 
                teacher !== absentTeacher && 
                !excludedTeachers.includes(teacher) &&
                !usedSubstituteTeachers.has(teacher) &&
                (teacherLessonCount[teacher] || 0) < 5
            );
            
            if (availableTeachers.length === 0) {
                substitutionResults[dayInt] = {
                    success: false,
                    message: `星期${dayInt}：找不到合適的代堂教師`
                };
                failed = true;
                break;
            }
            
            // 隨機選擇代堂教師
            const substituteTeacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
            usedSubstituteTeachers.add(substituteTeacher);
            
            // 記錄代堂安排
            daySubstitutions.push({
                ...lesson,
                substituteTeacher: substituteTeacher
            });
        }
        
        if (!failed) {
            substitutionResults[dayInt] = {
                success: true,
                substitutions: daySubstitutions
            };
        }
    }
    
    // 顯示結果
    displayResults(substitutionResults);
}

// 顯示代堂安排結果
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    let html = `<h2>${absentTeacher} 的代堂安排</h2>`;
    
    // 按星期順序顯示結果
    for (let day = 1; day <= 5; day++) {
        if (!results[day]) continue;
        
        const result = results[day];
        
        if (result.success) {
            html += `
                <div class="day-header">星期${day}</div>
                <table>
                    <thead>
                        <tr>
                            <th>節次</th>
                            <th>班別</th>
                            <th>科目</th>
                            <th>教室</th>
                            <th>代堂教師</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            result.substitutions.forEach(sub => {
                html += `
                    <tr>
                        <td>第${sub.period}節</td>
                        <td>${sub.class}</td>
                        <td>${sub.subject}</td>
                        <td>${sub.room}</td>
                        <td class="substitute">${sub.substituteTeacher}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        } else {
            html += `<p style="color:red;">${result.message}</p>`;
        }
    }
    
    resultsDiv.innerHTML = html;
}