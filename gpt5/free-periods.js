// free-periods.js (ES Module)
import { getLessons, getTeachers } from './js/dataService.js';
import { formatPeriods, isWedPeriod10 } from './js/utils.js';

export async function initFreePeriods() {
    const loadingDiv = document.getElementById('loading');
    const freePeriodsResult = document.getElementById('free-periods-result');
    const freePeriodsTable = document.getElementById('free-periods-table');
    const generateFreePeriodsBtn = document.getElementById('generateFreePeriods');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const teacherSearch = document.getElementById('teacher-search');
    const teacherList = document.getElementById('teacher-list');
    const s6FinishedCheckbox = document.getElementById('s6-finished');

    let allLessons = [];
    let allTeachers = [];
    let currentTeacherMatches = [];
    let s6Finished = false;
    let currentSort = { by: 'freePeriodsCount', order: 'desc' };

    function populateTeacherList() {
        teacherList.innerHTML = '';
        allTeachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher;
            teacherList.appendChild(option);
        });
    }
    function getTeacherLessons(teacherName) {
        const teacher = allTeachers.find(t => t.toUpperCase() === teacherName.toUpperCase());
        if (!teacher) return [];
        let teacherLessons = allLessons.filter(item => item.teacher.toUpperCase() === teacher.toUpperCase());
        if (s6Finished) {
            teacherLessons = teacherLessons.filter(lesson => !['6A','6B','6C','6D'].includes(lesson.class));
        }
        return teacherLessons;
    }
    function shouldDisplayPeriod(day, period) {
        return !isWedPeriod10(day, period);
    }
    function renderSingleTeacher(teacherName) {
        const teacher = allTeachers.find(t => t.toUpperCase() === teacherName.toUpperCase());
        if (!teacher) {
            freePeriodsResult.innerHTML = `<p style="color:red">找不到教師: ${teacherName}</p>`;
            return;
        }
        const teacherLessons = getTeacherLessons(teacherName);
        const s6Lessons = s6Finished ? allLessons.filter(item => item.teacher.toUpperCase() === teacher.toUpperCase() && ['6A','6B','6C','6D'].includes(item.class)) : [];

        let html = `
            <thead><tr>
                <th>教師</th><th>星期一</th><th>星期二</th><th>星期三</th><th>星期四</th><th>星期五</th>
            </tr></thead><tbody><tr><td>${teacher}</td>
        `;
        for (let day=1; day<=5; day++) {
            const busy = new Set(teacherLessons.filter(l => l.day === day).map(l => l.period));
            const s6p = new Set(s6Lessons.filter(l => l.day === day).map(l => l.period));
            const free = []; const special = [];
            for (let p=1; p<=10; p++) {
                if (!busy.has(p) && shouldDisplayPeriod(day, p)) {
                    if (s6Finished && s6p.has(p)) special.push(p);
                    else free.push(p);
                }
            }
            let display = '';
            const cellClasses = [];
            if (free.length > 0) { cellClasses.push('free-period'); display += formatPeriods(free); }
            if (special.length > 0) {
                cellClasses.push('special-free-period');
                if (display) display += '<br>';
                display += `<span class="special-period">${formatPeriods(special)}</span>`;
            }
            if (!display) display = '無空堂';
            html += `<td class="${cellClasses.join(' ')}">${display}</td>`;
        }
        html += `</tr></tbody>`;
        freePeriodsTable.innerHTML = html;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表 - ${teacher}</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${s6Finished ? '<p style="color:#888">淺灰色標記的節數為中六級已完結的課堂</p>' : ''}`;
    }
    function generateAll() {
        let html = `
            <thead><tr>
                <th>教師</th><th>星期一</th><th>星期二</th><th>星期三</th><th>星期四</th><th>星期五</th>
            </tr></thead><tbody>
        `;
        allTeachers.forEach(teacher => {
            const teacherLessons = getTeacherLessons(teacher);
            const s6Lessons = s6Finished ? allLessons.filter(item => item.teacher.toUpperCase() === teacher.toUpperCase() && ['6A','6B','6C','6D'].includes(item.class)) : [];
            html += `<tr><td>${teacher}</td>`;
            for (let day=1; day<=5; day++) {
                const busy = new Set(teacherLessons.filter(l => l.day === day).map(l => l.period));
                const s6p = new Set(s6Lessons.filter(l => l.day === day).map(l => l.period));
                const free = []; const special = [];
                for (let p=1; p<=10; p++) {
                    if (!busy.has(p) && shouldDisplayPeriod(day, p)) {
                        if (s6Finished && s6p.has(p)) special.push(p); else free.push(p);
                    }
                }
                let display = '';
                const cellClasses = [];
                if (free.length > 0) { cellClasses.push('free-period'); display += formatPeriods(free); }
                if (special.length > 0) {
                    cellClasses.push('special-free-period');
                    if (display) display += '<br>';
                    display += `<span class="special-period">${formatPeriods(special)}</span>`;
                }
                if (!display) display = '無空堂';
                html += `<td class="${cellClasses.join(' ')}">${display}</td>`;
            }
            html += `</tr>`;
        });
        html += `</tbody>`;
        freePeriodsTable.innerHTML = html;
        freePeriodsResult.innerHTML = `<h2>教師空堂列表</h2>
            <p>綠色標記的單元格表示該教師在該日有空堂</p>
            ${s6Finished ? '<p style="color:#888;">淺灰色標記的節數為中六級已完結的課堂</p>' : ''}`;
    }
    function searchTeachers() {
        const selectedDays = [];
        document.querySelectorAll('#monday,#tuesday,#wednesday,#thursday,#friday').forEach(cb => { if (cb.checked) selectedDays.push(parseInt(cb.value)); });
        const selectedPeriods = [];
        document.querySelectorAll('input[type="checkbox"][id^="period"]').forEach(cb => { if (cb.checked) selectedPeriods.push(parseInt(cb.value)); });

        const isOnlyWed10 = selectedDays.length === 1 && selectedDays[0] === 3 && selectedPeriods.length === 1 && selectedPeriods[0] === 10;
        if (isOnlyWed10) { searchResults.innerHTML = '<p style="color:red">星期三沒有第十節，請重新選擇</p>'; return; }

        const dayOperator = document.querySelector('input[name="day-operator"]:checked').value;
        const periodOperator = document.querySelector('input[name="period-operator"]:checked').value;
        if (selectedDays.length === 0 || selectedPeriods.length === 0) {
            searchResults.innerHTML = '<p style="color:red">請至少選擇一個星期和一個節數</p>';
            return;
        }
        currentTeacherMatches = [];
        allTeachers.forEach(teacher => {
            const teacherLessons = getTeacherLessons(teacher);
            const s6Lessons = s6Finished ? allLessons.filter(item => item.teacher.toUpperCase() === teacher.toUpperCase() && ['6A','6B','6C','6D'].includes(item.class)) : [];
            let dayConditionMet = false;
            let totalFreePeriods = 0;
            let matchingDays = [];

            const evalDay = (day) => {
                const busy = new Set(teacherLessons.filter(l => l.day === day).map(l => l.period));
                const s6p = new Set(s6Lessons.filter(l => l.day === day).map(l => l.period));
                let periodConditionMet = false;
                let matchedPeriods = [];
                if (periodOperator === 'or') {
                    for (const p of selectedPeriods) {
                        if (isWedPeriod10(day, p)) continue;
                        if (!busy.has(p)) { periodConditionMet = true; matchedPeriods.push(p); }
                    }
                } else {
                    periodConditionMet = true;
                    for (const p of selectedPeriods) {
                        if (isWedPeriod10(day, p)) continue;
                        if (busy.has(p)) { periodConditionMet = false; break; }
                    }
                    if (periodConditionMet) matchedPeriods = selectedPeriods.filter(p => !isWedPeriod10(day, p));
                }
                if (periodConditionMet) {
                    const allFree = []; const allSpecial = [];
                    for (let p=1; p<=10; p++) {
                        if (!busy.has(p) && !isWedPeriod10(day, p)) {
                            if (s6Finished && s6p.has(p)) allSpecial.push(p); else allFree.push(p);
                        }
                    }
                    totalFreePeriods += allFree.length + allSpecial.length;
                    matchingDays.push({
                        day, freePeriods: allFree, specialFreePeriods: allSpecial,
                        freePeriodsCount: allFree.length + allSpecial.length, matchedPeriods
                    });
                }
                return periodConditionMet;
            };

            if (dayOperator === 'or') {
                for (const day of selectedDays) {
                    if (evalDay(day)) { dayConditionMet = true; }
                }
            } else {
                dayConditionMet = true;
                for (const day of selectedDays) {
                    if (!evalDay(day)) { dayConditionMet = false; break; }
                }
            }
            if (dayConditionMet) currentTeacherMatches.push({ teacher, totalFreePeriods, matchingDays });
        });

        currentTeacherMatches.sort((a,b) => b.totalFreePeriods - a.totalFreePeriods);
        displaySearchResults();
    }
    function displaySearchResults(sortBy) {
        if (currentTeacherMatches.length === 0) { searchResults.innerHTML = '<p>沒有找到符合條件的教師</p>'; return; }
        if (sortBy) {
            if (currentSort.by === sortBy) currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            else { currentSort.by = sortBy; currentSort.order = 'asc'; }
        }
        let allMatchingDays = [];
        currentTeacherMatches.forEach(m => {
            m.matchingDays.forEach(d => allMatchingDays.push({
                teacher: m.teacher, day: d.day, freePeriods: d.freePeriods,
                specialFreePeriods: d.specialFreePeriods, freePeriodsCount: d.freePeriodsCount,
                matchedPeriods: d.matchedPeriods, totalFreePeriods: m.totalFreePeriods
            }));
        });
        allMatchingDays.sort((a,b) => {
            let cmp = 0;
            if (currentSort.by === 'teacher') cmp = a.teacher.localeCompare(b.teacher);
            else if (currentSort.by === 'day') cmp = a.day - b.day;
            else if (currentSort.by === 'freePeriodsCount') cmp = a.freePeriodsCount - b.freePeriodsCount;
            return currentSort.order === 'asc' ? cmp : -cmp;
        });

        const dayNames = ['星期一','星期二','星期三','星期四','星期五'];
        let html = '<h3>搜尋結果</h3><h4>詳細空堂信息</h4>';
        html += `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th onclick="window.sortTable('teacher')">教師 ${currentSort.by === 'teacher' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                        <th onclick="window.sortTable('day')">星期 ${currentSort.by === 'day' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>空堂節數</th>
                        <th onclick="window.sortTable('freePeriodsCount')">當天空堂總數 ${currentSort.by === 'freePeriodsCount' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                    </tr>
                </thead><tbody>
        `;
        allMatchingDays.forEach(d => {
            const all = [...d.freePeriods, ...d.specialFreePeriods];
            const marked = all.map(p => {
                let text = String(p);
                if (d.specialFreePeriods.includes(p)) text = `<span class="special-period">${text}</span>`;
                if (d.matchedPeriods.includes(p)) text = `<strong>${text}</strong>`;
                return text;
            });
            html += `<tr><td>${d.teacher}</td><td>${dayNames[d.day-1]}</td><td>${marked.join(', ')}</td><td>${all.length}</td></tr>`;
        });
        html += '</tbody></table>';
        searchResults.innerHTML = html;
    }
    window.sortTable = function(by) { displaySearchResults(by); };

    // 綁定事件
    generateFreePeriodsBtn.addEventListener('click', generateAll);
    searchButton.addEventListener('click', searchTeachers);
    teacherSearch.addEventListener('input', function(){ if (this.value) renderSingleTeacher(this.value); });
    teacherSearch.addEventListener('keypress', function(e){ if (e.key === 'Enter') renderSingleTeacher(this.value); });
    teacherSearch.addEventListener('click', function(){ this.value=''; });
    s6FinishedCheckbox.addEventListener('change', function(){
        s6Finished = this.checked;
        if (teacherSearch.value) renderSingleTeacher(teacherSearch.value);
        else if (currentTeacherMatches.length > 0) searchTeachers();
        else generateAll();
    });

    // 載入資料
    try {
        allLessons = await getLessons();
        allTeachers = await getTeachers();
        populateTeacherList();
        loadingDiv.style.display = 'none';
        freePeriodsResult.innerHTML = '<p>時間表數據已載入。</p>';
    } catch (e) {
        console.error(e);
        loadingDiv.innerHTML = `<p style="color:red">錯誤: ${e.message}</p>`;
    }
}