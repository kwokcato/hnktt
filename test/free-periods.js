/*
 * @license
 * @no-cache
 * @no-store
 */

document.addEventListener('DOMContentLoaded', function() {
    const loadingDiv = document.getElementById('loading');
    const freePeriodsResult = document.getElementById('free-periods-result');
    const freePeriodsTable = document.getElementById('free-periods-table');
    const generateFreePeriodsBtn = document.getElementById('generateFreePeriods');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const teacherSearch = document.getElementById('teacher-search');
    const teacherList = document.getElementById('teacher-list');
    const s6FinishedCheckbox = document.getElementById('s6-finished');
    
    let allLessons = []; // 存儲所有課程數據
    let allTeachers = []; // 存儲所有教師
    let currentTeacherMatches = []; // 存儲當前搜尋結果
    let currentSort = { by: 'freePeriodsCount', order: 'desc' }; // 當前排序狀態
    let s6Finished = false; // 中六已完結狀態

    // 通用：強制不使用快取抓取 CSV（含重試）
    async function fetchCsvFresh(url, { retry = 1 } = {}) {
        const cacheBuster = `t=${Date.now()}&r=${Math.random().toString(36).slice(2)}`;
        const sep = url.includes('?') ? '&' : '?';
        const finalUrl = `${url}${sep}${cacheBuster}`;
        const request = new Request(finalUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Accept': 'text/plain, text/csv, */*'
            }
        });
        try {
            const response = await fetch(request);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (err) {
            if (retry > 0) {
                return fetchCsvFresh(url, { retry: retry - 1 });
            }
            throw err;
        }
    }

    // 載入 CSV 文件（使用無快取抓取）
    function loadCSV() {
        // 顯示載入中
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (freePeriodsResult) freePeriodsResult.innerHTML = '';

        fetchCsvFresh('tt.csv', { retry: 1 })
            .then(data => {
                allLessons = parseCSV(data);
                allTeachers = [...new Set(allLessons.map(lesson => lesson.teacher))].sort();
                
                // 填充教師下拉列表
                populateTeacherList();
                
                if (loadingDiv) loadingDiv.style.display = 'none';
                if (freePeriodsResult) freePeriodsResult.innerHTML = '<p>時間表數據已載入（最新）。</p>';
            })
            .catch(error => {
                console.error('載入CSV文件時出錯:', error);
                if (loadingDiv) {
                    loadingDiv.innerHTML = `<p style="color:red">錯誤: ${error.message}</p>`;
                }
                // 重試機制（維持原邏輯，1 秒後再嘗試）
                setTimeout(loadCSV, 1000);
            });
    }
    
    // 填充教師下拉列表
    function populateTeacherList() {
        if (!teacherList) return;
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
                    result.push({
                        year: values[0],
                        day: parseInt(values[1]),
                        period: parseInt(values[2]),
                        teacher: values[3].trim(),
                        class: values[4].trim(),
                        subject: values[5].trim(),
                        room: values[6].trim()
                    });
                }
            }
        }
        
        return result;
    }
    
    // 獲取教師課程（排除中六課程如果已完結）
    function getTeacherLessons(teacherName) {
        const teacher = allTeachers.find(t => t.toUpperCase() === teacherName.toUpperCase());
        if (!teacher) return [];
        
        let teacherLessons = allLessons.filter(item => 
            item.teacher.toUpperCase() === teacher.toUpperCase()
        );
        
        if (s6Finished) {
            // 過濾掉中六課程 (6A, 6B, 6C, 6D)
            teacherLessons = teacherLessons.filter(lesson => 
                !['6A', '6B', '6C', '6D'].includes(lesson.class)
            );
        }
        
        return teacherLessons;
    }
    
    // 格式化節數顯示
    function formatPeriods(periods) {
        const grouped = [];
        let start = periods[0];
        let prev = periods[0];
        
        for (let i = 1; i < periods.length; i++) {
            if (periods[i] === prev + 1) {
                prev = periods[i];
            } else {
                if (start === prev) {
                    grouped.push(start.toString());
                } else {
                    grouped.push(`${start}-${prev}`);
                }
                start = periods[i];
                prev = periods[i];
            }
        }
        
        if (start === prev) {
            grouped.push(start.toString());
        } else {
            grouped.push(`${start}-${prev}`);
        }
        
        return grouped.join(', ');
    }
    
    // 檢查是否應該顯示這個節數（星期三不顯示第10節）
    function shouldDisplayPeriod(day, period) {
        return !(day === 3 && period === 10);
    }
    
    // 查詢特定教師的空堂
    function searchTeacherFreePeriods(teacherName) {
        if (!teacherName) return;
        
        const teacher = allTeachers.find(t => t.toUpperCase() === teacherName.toUpperCase());
        if (!teacher) {
            freePeriodsResult.innerHTML = `<p style="color:red">找不到教師: ${teacherName}</p>`;
            return;
        }
        
        const teacherLessons = getTeacherLessons(teacherName);
        const s6Lessons = s6Finished ? allLessons.filter(item => 
            item.teacher.toUpperCase() === teacher.toUpperCase() && 
            ['6A', '6B', '6C', '6D'].includes(item.class)
        ) : [];
        
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
        
        for (let day = 1; day <= 5; day++) {
            const busyPeriods = new Set(
                teacherLessons
                    .filter(lesson => lesson.day === day)
                    .map(lesson => lesson.period)
            );
            
            const s6Periods = new Set(
                s6Lessons
                    .filter(lesson => lesson.day === day)
                    .map(lesson => lesson.period)
            );
            
            const freePeriods = [];
            const specialFreePeriods = [];
            
            for (let period = 1; period <= 10; period++) {
                if (!busyPeriods.has(period) && shouldDisplayPeriod(day, period)) {
                    if (s6Finished && s6Periods.has(period)) {
                        specialFreePeriods.push(period);
                    } else {
                        freePeriods.push(period);
                    }
                }
            }
            
            let displayText = '';
            let cellClasses = [];
            
            if (freePeriods.length > 0) {
                cellClasses.push('free-period');
                displayText += formatPeriods(freePeriods);
            }
            
            if (specialFreePeriods.length > 0) {
                cellClasses.push('special-free-period');
                if (displayText) displayText += '<br>';
                displayText += `<span class="special-period">${formatPeriods(specialFreePeriods)}</span>`;
            }
            
            if (!displayText) {
                displayText = '無空堂';
            }
            
            tableHTML += `<td class="${cellClasses.join(' ')}">${displayText}</td>`;
        }
        
        tableHTML += `</tr></tbody>`;
        freePeriodsTable.innerHTML = tableHTML;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表 - ${teacher}</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${s6Finished ? '<p style="color:#888">淺灰色標記的節數為中六級已完結的課堂</p>' : ''}`;
    }
    
    // 產生所有教師的空堂列表
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
            const teacherLessons = getTeacherLessons(teacher);
            const s6Lessons = s6Finished ? allLessons.filter(item => 
                item.teacher.toUpperCase() === teacher.toUpperCase() && 
                ['6A', '6B', '6C', '6D'].includes(item.class)
            ) : [];
            
            tableHTML += `<tr><td>${teacher}</td>`;
            
            for (let day = 1; day <= 5; day++) {
                const busyPeriods = new Set(
                    teacherLessons
                        .filter(lesson => lesson.day === day)
                        .map(lesson => lesson.period)
                );
                
                const s6Periods = new Set(
                    s6Lessons
                        .filter(lesson => lesson.day === day)
                        .map(lesson => lesson.period)
                );
                
                const freePeriods = [];
                const specialFreePeriods = [];
                
                for (let period = 1; period <= 10; period++) {
                    if (!busyPeriods.has(period) && shouldDisplayPeriod(day, period)) {
                        if (s6Finished && s6Periods.has(period)) {
                            specialFreePeriods.push(period);
                        } else {
                            freePeriods.push(period);
                        }
                    }
                }
                
                let displayText = '';
                let cellClasses = [];
                
                if (freePeriods.length > 0) {
                    cellClasses.push('free-period');
                    displayText += formatPeriods(freePeriods);
                }
                
                if (specialFreePeriods.length > 0) {
                    cellClasses.push('special-free-period');
                    if (displayText) displayText += '<br>';
                    displayText += `<span class="special-period">${formatPeriods(specialFreePeriods)}</span>`;
                }
                
                if (!displayText) {
                    displayText = '無空堂';
                }
                
                tableHTML += `<td class="${cellClasses.join(' ')}">${displayText}</td>`;
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody>`;
        freePeriodsTable.innerHTML = tableHTML;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${s6Finished ? '<p style="color:#888;">淺灰色標記的節數為中六級已完結的課堂</p>' : ''}`;
    }
    
    // 搜尋符合條件的教師
    function searchTeachers() {
        const selectedDays = [];
        document.querySelectorAll('input[type="checkbox"][id^="monday"], input[type="checkbox"][id^="tuesday"], input[type="checkbox"][id^="wednesday"], input[type="checkbox"][id^="thursday"], input[type="checkbox"][id^="friday"]').forEach(checkbox => {
            if (checkbox.checked) {
                selectedDays.push(parseInt(checkbox.value));
            }
        });
        
        const selectedPeriods = [];
        document.querySelectorAll('input[type="checkbox"][id^="period"]').forEach(checkbox => {
            if (checkbox.checked) {
                selectedPeriods.push(parseInt(checkbox.value));
            }
        });
        
        const isOnlyWednesdayAndPeriod10 = selectedDays.length === 1 && 
                                         selectedDays[0] === 3 && 
                                         selectedPeriods.length === 1 && 
                                         selectedPeriods[0] === 10;
        if (isOnlyWednesdayAndPeriod10) {
            searchResults.innerHTML = '<p style="color:red">星期三沒有第十節，請重新選擇</p>';
            return;
        }
        
        const dayOperator = document.querySelector('input[name="day-operator"]:checked').value;
        const periodOperator = document.querySelector('input[name="period-operator"]:checked').value;
        
        if (selectedDays.length === 0 || selectedPeriods.length === 0) {
            searchResults.innerHTML = '<p style="color:red">請至少選擇一個星期和一個節數</p>';
            return;
        }
        
        currentTeacherMatches = [];
        
        allTeachers.forEach(teacher => {
            const teacherLessons = getTeacherLessons(teacher);
            const s6Lessons = s6Finished ? allLessons.filter(item => 
                item.teacher.toUpperCase() === teacher.toUpperCase() && 
                ['6A', '6B', '6C', '6D'].includes(item.class)
            ) : [];
            
            let dayConditionMet = false;
            let totalFreePeriods = 0;
            let matchingDays = [];
            
            if (dayOperator === 'or') {
                for (const day of selectedDays) {
                    const busyPeriods = new Set(
                        teacherLessons
                            .filter(lesson => lesson.day === day)
                            .map(lesson => lesson.period)
                    );
                    
                    const s6Periods = new Set(
                        s6Lessons
                            .filter(lesson => lesson.day === day)
                            .map(lesson => lesson.period)
                    );
                    
                    let periodConditionMet = false;
                    let matchedPeriods = [];
                    
                    if (periodOperator === 'or') {
                        for (const period of selectedPeriods) {
                            if (day === 3 && period === 10) continue;
                            if (!busyPeriods.has(period)) {
                                periodConditionMet = true;
                                matchedPeriods.push(period);
                            }
                        }
                    } else {
                        periodConditionMet = true;
                        for (const period of selectedPeriods) {
                            if (day === 3 && period === 10) continue;
                            if (busyPeriods.has(period)) {
                                periodConditionMet = false;
                                break;
                            }
                        }
                        if (periodConditionMet) {
                            matchedPeriods = selectedPeriods.filter(p => !(day === 3 && p === 10));
                        }
                    }
                    
                    if (periodConditionMet) {
                        dayConditionMet = true;
                        const allFreePeriods = [];
                        const allSpecialFreePeriods = [];
                        for (let period = 1; period <= 10; period++) {
                            if (!busyPeriods.has(period) && shouldDisplayPeriod(day, period)) {
                                if (s6Finished && s6Periods.has(period)) {
                                    allSpecialFreePeriods.push(period);
                                } else {
                                    allFreePeriods.push(period);
                                }
                            }
                        }
                        totalFreePeriods += allFreePeriods.length + allSpecialFreePeriods.length;
                        matchingDays.push({
                            day: day,
                            freePeriods: allFreePeriods,
                            specialFreePeriods: allSpecialFreePeriods,
                            freePeriodsCount: allFreePeriods.length + allSpecialFreePeriods.length,
                            matchedPeriods: matchedPeriods
                        });
                    }
                }
            } else {
                dayConditionMet = true;
                for (const day of selectedDays) {
                    const busyPeriods = new Set(
                        teacherLessons
                            .filter(lesson => lesson.day === day)
                            .map(lesson => lesson.period)
                    );
                    
                    const s6Periods = new Set(
                        s6Lessons
                            .filter(lesson => lesson.day === day)
                            .map(lesson => lesson.period)
                    );
                    
                    let periodConditionMet = false;
                    let matchedPeriods = [];
                    
                    if (periodOperator === 'or') {
                        for (const period of selectedPeriods) {
                            if (day === 3 && period === 10) continue;
                            if (!busyPeriods.has(period)) {
                                periodConditionMet = true;
                                matchedPeriods.push(period);
                            }
                        }
                    } else {
                        periodConditionMet = true;
                        for (const period of selectedPeriods) {
                            if (day === 3 && period === 10) continue;
                            if (busyPeriods.has(period)) {
                                periodConditionMet = false;
                                break;
                            }
                        }
                        if (periodConditionMet) {
                            matchedPeriods = selectedPeriods.filter(p => !(day === 3 && p === 10));
                        }
                    }
                    
                    if (!periodConditionMet) {
                        dayConditionMet = false;
                        break;
                    }
                    
                    const allFreePeriods = [];
                    const allSpecialFreePeriods = [];
                    for (let period = 1; period <= 10; period++) {
                        if (!busyPeriods.has(period) && shouldDisplayPeriod(day, period)) {
                            if (s6Finished && s6Periods.has(period)) {
                                allSpecialFreePeriods.push(period);
                            } else {
                                allFreePeriods.push(period);
                            }
                        }
                    }
                    totalFreePeriods += allFreePeriods.length + allSpecialFreePeriods.length;
                    matchingDays.push({
                        day: day,
                        freePeriods: allFreePeriods,
                        specialFreePeriods: allSpecialFreePeriods,
                        freePeriodsCount: allFreePeriods.length + allSpecialFreePeriods.length,
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
        
        currentTeacherMatches.sort((a, b) => b.totalFreePeriods - a.totalFreePeriods);
        displaySearchResults();
    }
    
    // 顯示搜尋結果
    function displaySearchResults(sortBy, sortOrder) {
        if (currentTeacherMatches.length === 0) {
            searchResults.innerHTML = '<p>沒有找到符合條件的教師</p>';
            return;
        }
        
        if (sortBy) {
            if (currentSort.by === sortBy) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.by = sortBy;
                currentSort.order = 'asc';
            }
        }
        
        let allMatchingDays = [];
        currentTeacherMatches.forEach(match => {
            match.matchingDays.forEach(dayInfo => {
                allMatchingDays.push({
                    teacher: match.teacher,
                    day: dayInfo.day,
                    freePeriods: dayInfo.freePeriods,
                    specialFreePeriods: dayInfo.specialFreePeriods,
                    freePeriodsCount: dayInfo.freePeriodsCount,
                    matchedPeriods: dayInfo.matchedPeriods,
                    totalFreePeriods: match.totalFreePeriods
                });
            });
        });
        
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
            const specialFreePeriods = dayInfo.specialFreePeriods;
            
            if (freePeriods.length > 0 || specialFreePeriods.length > 0) {
                const allPeriods = [...freePeriods, ...specialFreePeriods];
                const markedPeriods = allPeriods.map(period => {
                    const isSpecial = specialFreePeriods.includes(period);
                    const isMatched = dayInfo.matchedPeriods.includes(period);
                    
                    let periodText = period.toString();
                    if (isSpecial) {
                        periodText = `<span class="special-period">${periodText}</span>`;
                    }
                    if (isMatched) {
                        periodText = `<strong>${periodText}</strong>`;
                    }
                    return periodText;
                });
                
                resultHTML += `
                    <tr>
                        <td>${teacher}</td>
                        <td>${dayName}</td>
                        <td>${markedPeriods.join(', ')}</td>
                        <td>${allPeriods.length}</td>
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
    
    // 中六已完結狀態變化
    s6FinishedCheckbox.addEventListener('change', function() {
        s6Finished = this.checked;
        if (teacherSearch.value) {
            searchTeacherFreePeriods(teacherSearch.value);
        } else if (currentTeacherMatches.length > 0) {
            searchTeachers();
        } else {
            generateFreePeriodsList();
        }
    });
    
    // 將排序函數暴露到全局
    window.sortTable = function(sortBy) {
        displaySearchResults(sortBy);
    };
    
    // 自動載入 CSV 文件（最新）
    loadCSV();
});
