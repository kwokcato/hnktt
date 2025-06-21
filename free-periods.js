document.addEventListener('DOMContentLoaded', function() {
    const loadingDiv = document.getElementById('loading');
    const freePeriodsResult = document.getElementById('free-periods-result');
    const freePeriodsTable = document.getElementById('free-periods-table');
    const generateFreePeriodsBtn = document.getElementById('generateFreePeriods');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const teacherSearch = document.getElementById('teacher-search');
    const teacherList = document.getElementById('teacher-list');
    
    let allLessons = []; // 存儲所有課程數據
    let allTeachers = []; // 存儲所有教師
    let currentTeacherMatches = []; // 存儲當前搜尋結果
    let currentSort = { by: 'freePeriodsCount', order: 'desc' }; // 當前排序狀態
    let grade6Finished = false; // 中六已完結標記
    
    // Auto Reload JS from Server (Add this at the beginning of the DOMContentLoaded event listener)
    let idleTimer;
    const IDLE_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(hardReload, IDLE_TIMEOUT);
    }

    function hardReload() {
        // Force a hard reload from the server
        window.location.reload(true);
    }

    // Add event listeners for user activity
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Initialize the idle timer
    resetIdleTimer();
    // 載入 CSV 文件
    function loadCSV() {
        fetch('tt.csv')
            .then(response => {
                if (!response.ok) throw new Error('無法載入文件');
                return response.text();
            })
            .then(data => {
                allLessons = parseCSV(data);
                allTeachers = [...new Set(allLessons.map(lesson => lesson.teacher))].sort();
                
                // 填充教師下拉列表
                populateTeacherList();
                
                loadingDiv.style.display = 'none';
                freePeriodsResult.innerHTML = '<p>時間表數據已載入，請點擊按鈕生成空堂列表</p>';
            })
            .catch(error => {
                loadingDiv.innerHTML = `<p style="color:red">錯誤: ${error.message}</p>`;
                console.error('Error:', error);
            });
    }
    
    document.getElementById('reloadBtn').addEventListener('click', hardReload);

    // 填充教師下拉列表
    function populateTeacherList() {
        teacherList.innerHTML = '';
        allTeachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher;
            teacherList.appendChild(option);
        });
    }
    
    // 解析 CSV
    function parseCSV(csv) {
        const lines = csv.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = line.split(',');
                if (values.length >= 7) {
                    const classInfo = values[4].trim();
                    const grade = classInfo.match(/^(\d+)/)?.[1] || '';
                    result.push({
                        year: values[0],
                        day: parseInt(values[1]),
                        period: parseInt(values[2]),
                        teacher: values[3].trim(),
                        class: classInfo,
                        grade: grade,
                        subject: values[5].trim(),
                        room: values[6].trim()
                    });
                }
            }
        }
        
        return result;
    }

    // 獲取教師的忙碌節數（考慮中六已完結選項）
    function getBusyPeriodsForTeacher(teacherLessons, day) {
        const busyPeriods = new Set();
        
        teacherLessons
            .filter(lesson => lesson.day === day)
            .forEach(lesson => {
                // 如果中六已完結且這是六年級課程，則跳過（不加入忙碌節數）
                if (!(grade6Finished && lesson.grade === '6')) {
                    busyPeriods.add(lesson.period);
                }
            });
        
        return busyPeriods;
    }

    // 將連續的節數分組
    function groupConsecutivePeriods(periods) {
        if (periods.length === 0) return [];
        
        const sortedPeriods = [...periods].sort((a, b) => a - b);
        const grouped = [];
        let start = sortedPeriods[0];
        let prev = sortedPeriods[0];
        
        for (let i = 1; i < sortedPeriods.length; i++) {
            if (sortedPeriods[i] === prev + 1) {
                prev = sortedPeriods[i];
            } else {
                if (start === prev) {
                    grouped.push(start.toString());
                } else {
                    grouped.push(`${start}-${prev}`);
                }
                start = sortedPeriods[i];
                prev = sortedPeriods[i];
            }
        }
        
        // 添加最後一組
        if (start === prev) {
            grouped.push(start.toString());
        } else {
            grouped.push(`${start}-${prev}`);
        }
        
        return grouped;
    }
    
    // 查詢特定教師的空堂
    function searchTeacherFreePeriods(teacherName) {
        if (!teacherName) return;
        
        const teacher = allTeachers.find(t => t.toUpperCase() === teacherName.toUpperCase());
        if (!teacher) {
            freePeriodsResult.innerHTML = `<p style="color:red">找不到教師: ${teacherName}</p>`;
            return;
        }
        
        const teacherLessons = allLessons.filter(item => 
            item.teacher.toUpperCase() === teacher.toUpperCase()
        );
        
        let tableHTML = `
            <thead>
                <tr>
                    <th>教師</th>
                    <th>星期一</th>
                    <th>星期二</th>
                    <th>星期三</th>
                    <th>星期四</th>
                    <th>星期五</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>${teacher}</td>
        `;
        
        // 檢查每一天 (1-5)
        for (let day = 1; day <= 5; day++) {
            const busyPeriods = getBusyPeriodsForTeacher(teacherLessons, day);
            
            // 找出空堂節數 (只考慮1-10節)
            const freePeriods = [];
            for (let period = 1; period <= 10; period++) {
                if (!busyPeriods.has(period)) {
                    freePeriods.push(period);
                }
            }
            
            // 獲取因中六已完結而空出的節數
            const grade6FreePeriods = [];
            if (grade6Finished) {
                teacherLessons
                    .filter(lesson => lesson.day === day && lesson.grade === '6')
                    .forEach(lesson => {
                        // 確保這個節數不在普通空堂列表中
                        if (!freePeriods.includes(lesson.period)) {
                            grade6FreePeriods.push(lesson.period);
                        }
                    });
            }
            
            // 格式化空堂顯示
            let displayText = '';
            if (freePeriods.length > 0 || grade6FreePeriods.length > 0) {
                // 將連續的普通空堂節數分組
                const groupedFree = groupConsecutivePeriods(freePeriods);
                // 將連續的中六空堂節數分組
                const groupedGrade6Free = groupConsecutivePeriods(grade6FreePeriods);
                
                // 組合兩種空堂，使用不同格式
                const freeText = groupedFree.join(', ');
                const grade6Text = groupedGrade6Free.join(', ');
                
                if (freeText && grade6Text) {
                    displayText = `${freeText}, <span style="color: #888">${grade6Text}</span>`;
                } else if (freeText) {
                    displayText = freeText;
                } else if (grade6Text) {
                    displayText = `<span style="color: #888">${grade6Text}</span>`;
                }
            } else {
                displayText = '無空堂';
            }
            
            tableHTML += `<td class="${(freePeriods.length > 0 || grade6FreePeriods.length > 0) ? 'free-period' : ''}">${displayText}</td>`;
        }
        
        tableHTML += `</tr></tbody>`;
        freePeriodsTable.innerHTML = tableHTML;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表 - ${teacher}</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${grade6Finished ? '<p><span style="color: #888">灰色節數</span>表示因中六已完結而空出的節數</p>' : ''}`;
    }
    
    // 生成所有教師的空堂列表
    function generateFreePeriodsList() {
        let tableHTML = `
            <thead>
                <tr>
                    <th>教師</th>
                    <th>星期一</th>
                    <th>星期二</th>
                    <th>星期三</th>
                    <th>星期四</th>
                    <th>星期五</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        allTeachers.forEach(teacher => {
            const teacherLessons = allLessons.filter(item => 
                item.teacher.toUpperCase() === teacher.toUpperCase()
            );
            
            tableHTML += `<tr><td>${teacher}</td>`;
            
            // 檢查每一天 (1-5)
            for (let day = 1; day <= 5; day++) {
                const busyPeriods = getBusyPeriodsForTeacher(teacherLessons, day);
                
                // 找出空堂節數 (只考慮1-10節)
                const freePeriods = [];
                for (let period = 1; period <= 10; period++) {
                    if (!busyPeriods.has(period)) {
                        freePeriods.push(period);
                    }
                }
                
                // 獲取因中六已完結而空出的節數
                const grade6FreePeriods = [];
                if (grade6Finished) {
                    teacherLessons
                        .filter(lesson => lesson.day === day && lesson.grade === '6')
                        .forEach(lesson => {
                            // 確保這個節數不在普通空堂列表中
                            if (!freePeriods.includes(lesson.period)) {
                                grade6FreePeriods.push(lesson.period);
                            }
                        });
                }
                
                // 格式化空堂顯示
                let displayText = '';
                if (freePeriods.length > 0 || grade6FreePeriods.length > 0) {
                    // 將連續的普通空堂節數分組
                    const groupedFree = groupConsecutivePeriods(freePeriods);
                    // 將連續的中六空堂節數分組
                    const groupedGrade6Free = groupConsecutivePeriods(grade6FreePeriods);
                    
                    // 組合兩種空堂，使用不同格式
                    const freeText = groupedFree.join(', ');
                    const grade6Text = groupedGrade6Free.join(', ');
                    
                    if (freeText && grade6Text) {
                        displayText = `${freeText}, <span style="color: #888">${grade6Text}</span>`;
                    } else if (freeText) {
                        displayText = freeText;
                    } else if (grade6Text) {
                        displayText = `<span style="color: #888">${grade6Text}</span>`;
                    }
                } else {
                    displayText = '無空堂';
                }
                
                tableHTML += `<td class="${(freePeriods.length > 0 || grade6FreePeriods.length > 0) ? 'free-period' : ''}">${displayText}</td>`;
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody>`;
        freePeriodsTable.innerHTML = tableHTML;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${grade6Finished ? '<p><span style="color: #888">灰色節數</span>表示因中六已完結而空出的節數</p>' : ''}`;
    }
    
    // 搜尋符合條件的教師
    function searchTeachers() {
        // 獲取選中的星期
        const selectedDays = [];
        document.querySelectorAll('input[type="checkbox"][id^="monday"], input[type="checkbox"][id^="tuesday"], input[type="checkbox"][id^="wednesday"], input[type="checkbox"][id^="thursday"], input[type="checkbox"][id^="friday"]').forEach(checkbox => {
            if (checkbox.checked) {
                selectedDays.push(parseInt(checkbox.value));
            }
        });
        
        // 獲取星期運算符 (OR/AND)
        const dayOperator = document.querySelector('input[name="day-operator"]:checked').value;
        
        // 獲取選中的節數
        const selectedPeriods = [];
        document.querySelectorAll('input[type="checkbox"][id^="period"]').forEach(checkbox => {
            if (checkbox.checked) {
                selectedPeriods.push(parseInt(checkbox.value));
            }
        });
        
        // 獲取節數運算符 (OR/AND)
        const periodOperator = document.querySelector('input[name="period-operator"]:checked').value;
        
        if (selectedDays.length === 0 || selectedPeriods.length === 0) {
            searchResults.innerHTML = '<p style="color:red">請至少選擇一個星期和一個節數</p>';
            return;
        }
        
        currentTeacherMatches = [];
        
        allTeachers.forEach(teacher => {
            const teacherLessons = allLessons.filter(item => 
                item.teacher.toUpperCase() === teacher.toUpperCase()
            );
            
            // 檢查星期條件
            let dayConditionMet = false;
            let totalFreePeriods = 0;
            let matchingDays = [];
            
            if (dayOperator === 'or') {
                // OR 條件: 任一選中星期有空堂即可
                for (const day of selectedDays) {
                    const busyPeriods = getBusyPeriodsForTeacher(teacherLessons, day);
                    
                    // 檢查節數條件
                    let periodConditionMet = false;
                    let matchedPeriods = [];
                    
                    if (periodOperator === 'or') {
                        // OR 條件: 任一選中節數有空堂
                        for (const period of selectedPeriods) {
                            if (!busyPeriods.has(period)) {
                                periodConditionMet = true;
                                matchedPeriods.push(period);
                            }
                        }
                    } else {
                        // AND 條件: 所有選中節數都有空堂
                        periodConditionMet = true;
                        for (const period of selectedPeriods) {
                            if (busyPeriods.has(period)) {
                                periodConditionMet = false;
                                break;
                            }
                        }
                        if (periodConditionMet) {
                            matchedPeriods = selectedPeriods.slice();
                        }
                    }
                    
                    if (periodConditionMet) {
                        dayConditionMet = true;
                        
                        // 計算該教師在這一天的所有空堂（1-10節）
                        const allFreePeriods = [];
                        for (let period = 1; period <= 10; period++) {
                            if (!busyPeriods.has(period)) {
                                allFreePeriods.push(period);
                            }
                        }

                        // 計算因中六已完結而空出的節數
                        const grade6FreePeriods = [];
                        if (grade6Finished) {
                            teacherLessons
                                .filter(lesson => lesson.day === day && lesson.grade === '6')
                                .forEach(lesson => {
                                    if (!allFreePeriods.includes(lesson.period)) {
                                        grade6FreePeriods.push(lesson.period);
                                    }
                                });
                        }

                        totalFreePeriods += allFreePeriods.length + grade6FreePeriods.length;
                        matchingDays.push({
                            day: day,
                            freePeriods: allFreePeriods,
                            grade6FreePeriods: grade6FreePeriods,
                            freePeriodsCount: allFreePeriods.length + grade6FreePeriods.length,
                            matchedPeriods: matchedPeriods
                        });
                    }
                }
            } else {
                // AND 條件: 所有選中星期都必須有空堂
                dayConditionMet = true;
                for (const day of selectedDays) {
                    const busyPeriods = getBusyPeriodsForTeacher(teacherLessons, day);
                    
                    // 檢查節數條件
                    let periodConditionMet = false;
                    let matchedPeriods = [];
                    
                    if (periodOperator === 'or') {
                        // OR 條件: 任一選中節數有空堂
                        for (const period of selectedPeriods) {
                            if (!busyPeriods.has(period)) {
                                periodConditionMet = true;
                                matchedPeriods.push(period);
                            }
                        }
                    } else {
                        // AND 條件: 所有選中節數都有空堂
                        periodConditionMet = true;
                        for (const period of selectedPeriods) {
                            if (busyPeriods.has(period)) {
                                periodConditionMet = false;
                                break;
                            }
                        }
                        if (periodConditionMet) {
                            matchedPeriods = selectedPeriods.slice();
                        }
                    }
                    
                    if (!periodConditionMet) {
                        dayConditionMet = false;
                        break;
                    }
                    
                    // 計算該教師在這一天的所有空堂（1-10節）
                    const allFreePeriods = [];
                    for (let period = 1; period <= 10; period++) {
                        if (!busyPeriods.has(period)) {
                            allFreePeriods.push(period);
                        }
                    }

                    // 計算因中六已完結而空出的節數
                    const grade6FreePeriods = [];
                    if (grade6Finished) {
                        teacherLessons
                            .filter(lesson => lesson.day === day && lesson.grade === '6')
                            .forEach(lesson => {
                                if (!allFreePeriods.includes(lesson.period)) {
                                    grade6FreePeriods.push(lesson.period);
                                }
                            });
                    }

                    totalFreePeriods += allFreePeriods.length + grade6FreePeriods.length;
                    matchingDays.push({
                        day: day,
                        freePeriods: allFreePeriods,
                        grade6FreePeriods: grade6FreePeriods,
                        freePeriodsCount: allFreePeriods.length + grade6FreePeriods.length,
                        matchedPeriods: matchedPeriods
                    });
                }
            }
            
            if (dayConditionMet) {
                currentTeacherMatches.push({
                    teacher: teacher,
                    totalFreePeriods: totalFreePeriods,
                    matchingDays: matchingDays
                });
            }
        });
        
        // 按空堂總數降序排序
        currentTeacherMatches.sort((a, b) => b.totalFreePeriods - a.totalFreePeriods);
        
        // 顯示結果
        displaySearchResults();
    }
    
    // 顯示搜尋結果
    function displaySearchResults(sortBy, sortOrder) {
        if (currentTeacherMatches.length === 0) {
            searchResults.innerHTML = '<p>沒有找到符合條件的教師</p>';
            return;
        }
        
        // 更新當前排序狀態
        if (sortBy) {
            // 如果是相同的排序字段，則切換排序順序
            if (currentSort.by === sortBy) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.by = sortBy;
                currentSort.order = 'asc';
            }
        }
        
        // 先將所有匹配的天數展平以便排序
        let allMatchingDays = [];
        currentTeacherMatches.forEach(match => {
            match.matchingDays.forEach(dayInfo => {
                allMatchingDays.push({
                    teacher: match.teacher,
                    day: dayInfo.day,
                    freePeriods: dayInfo.freePeriods,
                    grade6FreePeriods: dayInfo.grade6FreePeriods || [],
                    freePeriodsCount: dayInfo.freePeriodsCount,
                    matchedPeriods: dayInfo.matchedPeriods,
                    totalFreePeriods: match.totalFreePeriods
                });
            });
        });
        
        // 根據當前排序狀態排序
        allMatchingDays.sort((a, b) => {
            let comparison = 0;
            
            if (currentSort.by === 'teacher') {
                comparison = a.teacher.localeCompare(b.teacher);
            } else if (currentSort.by === 'day') {
                comparison = a.day - b.day;
            } else if (currentSort.by === 'freePeriodsCount') {
                comparison = a.freePeriodsCount - b.freePeriodsCount;
            }
            
            return currentSort.order === 'asc' ? comparison : -comparison;
        });
        
        let resultHTML = '<h3>搜尋結果</h3>';
        
        // 教師摘要表格
        resultHTML += `
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>教師</th>
                        <th>總空堂數</th>
                        <th>符合條件的天數</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        currentTeacherMatches.forEach((match, index) => {
            resultHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${match.teacher}</td>
                    <td>${match.totalFreePeriods}</td>
                    <td>${match.matchingDays.length}</td>
                </tr>
            `;
        });
        
        resultHTML += `</tbody></table>`;
        
        // 詳細的空堂信息
        resultHTML += '<h4>詳細空堂信息</h4>';
        resultHTML += `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th onclick="window.sortTable('teacher')">教師 ${currentSort.by === 'teacher' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                        <th onclick="window.sortTable('day')">星期 ${currentSort.by === 'day' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>空堂節數</th>
                        <th onclick="window.sortTable('freePeriodsCount')">當天空堂總數 ${currentSort.by === 'freePeriodsCount' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五'];
        
        allMatchingDays.forEach(dayInfo => {
            const teacher = dayInfo.teacher;
            const dayName = dayNames[dayInfo.day - 1];
            const freePeriods = dayInfo.freePeriods;
            const grade6FreePeriods = dayInfo.grade6FreePeriods || [];
            
            if (freePeriods.length > 0 || grade6FreePeriods.length > 0) {
                // 標記符合搜尋條件的節數
                const markedFreePeriods = freePeriods.map(period => {
                    if (dayInfo.matchedPeriods.includes(period)) {
                        return `<strong>${period}</strong>`;
                    }
                    return period.toString();
                });
                
                // 標記中六空堂節數
                const markedGrade6Periods = grade6FreePeriods.map(period => {
                    if (dayInfo.matchedPeriods.includes(period)) {
                        return `<strong><span style="color: #888">${period}</span></strong>`;
                    }
                    return `<span style="color: #888">${period}</span>`;
                });
                
                // 組合顯示
                let displayText = '';
                if (markedFreePeriods.length > 0 && markedGrade6Periods.length > 0) {
                    displayText = `${markedFreePeriods.join(', ')}, ${markedGrade6Periods.join(', ')}`;
                } else if (markedFreePeriods.length > 0) {
                    displayText = markedFreePeriods.join(', ');
                } else {
                    displayText = markedGrade6Periods.join(', ');
                }
                
                resultHTML += `
                    <tr>
                        <td>${teacher}</td>
                        <td>${dayName}</td>
                        <td>${displayText}</td>
                        <td>${freePeriods.length + grade6FreePeriods.length}</td>
                    </tr>
                `;
            }
        });
        
        resultHTML += '</tbody></table>';
        searchResults.innerHTML = resultHTML;
    }
    
    // 綁定按鈕事件
    generateFreePeriodsBtn.addEventListener('click', generateFreePeriodsList);
    searchButton.addEventListener('click', searchTeachers);
    
    // 教師搜索功能
    teacherSearch.addEventListener('input', function() {
        if (this.value) {
            searchTeacherFreePeriods(this.value);
        }
    });
    
    teacherSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTeacherFreePeriods(this.value);
        }
    });

    teacherSearch.addEventListener('click', function() {
        this.value = '';
    });

    // 中六已完結選項變更事件
    document.getElementById('grade6-finished').addEventListener('change', function() {
        grade6Finished = this.checked;
        if (teacherSearch.value) {
            searchTeacherFreePeriods(teacherSearch.value);
        } else {
            generateFreePeriodsList();
        }
    });
    
    // 將排序函數暴露到全局
    window.sortTable = function(sortBy) {
        displaySearchResults(sortBy);
    };
    
    // 自動載入 CSV 文件
    loadCSV();
});