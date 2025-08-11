// timetable.js (ES Module)
import { getLessons, getTeachers, getClasses } from './js/dataService.js';
import { applyFontPercent, loadFontPercent, saveFontPercent } from './js/ui.js';
import { simplifyClassNames } from './js/utils.js';

export async function initTimetable() {
    const teacherNameInput = document.getElementById('teacherName');
    const teacherDropdown = document.getElementById('teacherDropdown');
    const classDropdown = document.getElementById('classDropdown');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const timetableTable = document.getElementById('timetable');
    const exportBtnGroup = document.getElementById('exportBtnGroup');
    const quickList = document.getElementById('quickList');

    let allLessons = [];
    let currentTitle = '';
    let currentLessons = [];

    // 時段定義
    const timeSlots = [
        { time: '8:05', period: '0', endTime: '8:20', isBreak: true, label: 'ASSEMBLY' },
        { time: '8:20', period: '1', endTime: '8:55', isBreak: false },
        { time: '8:55', period: '2', endTime: '9:30', isBreak: false },
        { time: '9:30', period: '', endTime: '9:45', isBreak: true, label: 'RECESS' },
        { time: '9:45', period: '3', endTime: '10:20', isBreak: false },
        { time: '10:20', period: '4', endTime: '10:55', isBreak: false },
        { time: '10:55', period: '', endTime: '11:10', isBreak: true, label: 'RECESS' },
        { time: '11:10', period: '5', endTime: '11:45', isBreak: false },
        { time: '11:45', period: '6', endTime: '12:20', isBreak: false },
        { time: '12:20', period: '7', endTime: '12:55', isBreak: false },
        { time: '12:55', period: '', endTime: '14:00', isBreak: true, label: 'LUNCH' },
        { time: '14:00', period: '', endTime: '14:05', isBreak: true, label: 'ASSEMBLY' },
        { time: '14:05', period: '8', endTime: '14:40', isBreak: false },
        { time: '14:40', period: '9', endTime: '15:15', isBreak: false },
        { time: '15:15', period: '10', endTime: '15:50', isBreak: false }
    ];

    function isClassQuery(query) {
        return /^[1-6][A-D]$/i.test(query.trim());
    }

    // 初始化匯出與字級控制
    function initExportButtons() {
        exportBtnGroup.innerHTML = `
            <button id="printBtn" class="export-btn">列印時間表</button>
            <button id="pdfBtn" class="export-btn">匯出PDF</button>
            <button id="excelBtn" class="export-btn">匯出Excel</button>
            <button id="decreaseFontBtn" class="export-btn">-</button>
            <button id="increaseFontBtn" class="export-btn">+</button>
        `;
        document.getElementById('printBtn').addEventListener('click', printTimetable);
        document.getElementById('pdfBtn').addEventListener('click', exportToPDF);
        document.getElementById('excelBtn').addEventListener('click', exportToExcel);
        document.getElementById('increaseFontBtn').addEventListener('click', () => {
            const cur = loadFontPercent(); if (cur < 150) { const next = cur + 10; applyFontPercent(next); saveFontPercent(next); }
        });
        document.getElementById('decreaseFontBtn').addEventListener('click', () => {
            const cur = loadFontPercent(); if (cur > 70) { const next = cur - 10; applyFontPercent(next); saveFontPercent(next); }
        });
    }

    function populateDropdowns(teachers, classes) {
        teacherDropdown.innerHTML = '<option value="">選擇教師...</option>';
        teachers.forEach(t => teacherDropdown.innerHTML += `<option value="${t}">${t}</option>`);
        classDropdown.innerHTML = '<option value="">選擇班別...</option>';
        classes.forEach(c => classDropdown.innerHTML += `<option value="${c}">${c}</option>`);
        // quick datalist
        quickList.innerHTML = '';
        [...teachers, ...classes].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; quickList.appendChild(opt);
        });
    }

    function renderTimetable(lessons, isClassMode = false) {
        let tableHTML = `
            <thead>
                <tr>
                    <th class="time-col">Time</th>
                    <th class="period-col">Period</th>
                    <th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th>
                </tr>
            </thead>
            <tbody>
        `;
        timeSlots.forEach(slot => {
            if (slot.isBreak) {
                tableHTML += `
                    <tr>
                        <td class="time-col">${slot.time}-${slot.endTime}</td>
                        <td class="break-cell" colspan="6">${slot.label}</td>
                    </tr>
                `;
                return;
            }
            tableHTML += `
                <tr>
                    <td class="time-col">${slot.time}-${slot.endTime}</td>
                    <td class="period-col">${slot.period}</td>
            `;
            for (let day = 1; day <= 5; day++) {
                const dayLessons = lessons.filter(l => l.day === day && l.period === parseInt(slot.period));
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td class="empty-cell"><div class="dismissal-time">(CPA 14:40 - 15:30)</div></td>`;
                    } else {
                        tableHTML += `<td><div class="main-lesson">${formatLesson(dayLessons[0], isClassMode)}</div><div class="dismissal-time">(CPA 14:40 - 15:30)</div></td>`;
                    }
                    continue;
                }
                if (dayLessons.length === 0) {
                    tableHTML += `<td class="empty-cell"></td>`;
                } else {
                    if (isClassMode) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join(',');
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                        const hasIct  = dayLessons.some(l => l.subject.includes('ICT'));
                        const hasBM   = dayLessons.some(l => l.subject.includes('BM'));
                        if (hasChem) {
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">X2<br></span><span class="teacher">(${teachers})</span></div></td>`;
                        } else if (hasIct) {
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">X3<br></span><span class="teacher">(${teachers})</span></div></td>`;
                        } else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) {
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">X1<br></span><span class="teacher">(${teachers})</span></div></td>`;
                        } else if (hasMaup) {
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">MAUP</span><span class="teacher">(${teachers})</span></div></td>`;
                        } else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join(',');
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">${subjects}<br></span><span class="room" style="color:#555;"> ${rooms}<br></span><span class="teacher">(${teachers})</span></div></td>`;
                        }
                    } else {
                        const first = dayLessons[0];
                        const isPE = first.subject === 'PE';
                        const isMaup = first.subject === 'MAUP';
                        if (isPE) {
                            const allPE = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === 'PE');
                            const allClasses = [...new Set(allPE.map(l => l.class))].sort().join('/');
                            const others = [...new Set(allPE.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">${allClasses} PE</span>${others ? `<span class="teacher">(${others})</span>` : ''}</div></td>`;
                        } else if (isMaup) {
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">${first.class} MAUP</span></div></td>`;
                        } else {
                            const noCo = ['ARD', 'CPA', 'READ', 'MAUP'];
                            const shouldCo = !noCo.includes(first.subject);
                            let coTeachers = '';
                            if (shouldCo) {
                                const same = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.class === first.class && l.subject === first.subject);
                                coTeachers = [...new Set(same.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                            }
                            const grouped = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === first.subject && l.teacher === first.teacher);
                            let classDisplay = first.class;
                            if (grouped.length > 1) {
                                const cls = [...new Set(grouped.map(l => l.class))].sort();
                                classDisplay = simplifyClassNames(cls);
                            }
                            tableHTML += `<td><div class="main-lesson"><span class="subject" style="color:blue;">${classDisplay} ${first.subject}<br></span><span class="room" style="color:#555;"> ${first.room}<br></span>${coTeachers ? `<span class="teacher">(${coTeachers})</span>` : ''}</div></td>`;
                        }
                    }
                }
            }
            tableHTML += `</tr>`;
        });
        tableHTML += `</tbody>`;

        // 選修科資訊（與原版一致）
        if (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1])) {
            tableHTML += `
                <tfoot>
                    <tr><td colspan="7" style="text-align:left;padding:10px;background-color:#f5f5f5;">
                        <strong>選修科目組合:</strong><br>
                        <strong>Form 4:</strong><br>
                        X1: PHY<sub>(PHY)</sub> / BM<sub>(R204)</sub> / ACC<sub>(R203)</sub> / ERS<sub>(R401)</sub> / VAD<sub>(AD)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R204)</sub> / ECON<sub>(R203)</sub> / HMSC<sub>(R401)</sub><br>
                        X3: BIO3<sub>(BIO/R201/BIO)</sub> / ERS3<sub>(R401)</sub> / ICT<sub>(CR2)</sub> / MAM2<sub>(R204)</sub> / THS<sub>(R203)</sub> / VAD3<sub>(DF)</sub><br><br>
                    </td></tr>
                </tfoot>`;
        } else if (currentTitle.includes('班別') && /^[5][A-D]$/i.test(currentTitle.split(' ')[1])) {
            tableHTML += `
                <tfoot>
                    <tr><td colspan="7" style="text-align:left;padding:10px;background-color:#f5f5f5;">
                        <strong>選修科目組合:</strong><br>
                        <strong>Form 5:</strong><br>
                        X1: BIO<sub>(BIO/R314/BIO)</sub> / PHY<sub>(PHY)</sub> / BM<sub>(R413)</sub> / ACC<sub>(R414)</sub> / ERS<sub>(R412)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R412)</sub> / ECON<sub>(R414)</sub> / VAD<sub>(AD)</sub> / HMSC<sub>(R413)</sub><br>
                        X3: BIO3<sub>(BIO/R402/BIO)</sub> / ERS3<sub>(R412)</sub> / ICT<sub>(CR1)</sub> / MAM2<sub>(R413)</sub> / THS<sub>(R414)</sub> / VAD3<sub>(AD)</sub><br><br>
                    </td></tr>
                </tfoot>`;
        } else if (currentTitle.includes('班別') && /^[6][A-D]$/i.test(currentTitle.split(' ')[1])) {
            tableHTML += `
                <tfoot>
                    <tr><td colspan="7" style="text-align:left;padding:10px;background-color:#f5f5f5;">
                        <strong>選修科目組合:</strong><br>
                        <strong>Form 6:</strong><br>
                        X1: BIO<sub>(BIO)</sub> / PHY<sub>(PHY)</sub> / BM<sub>(R403)</sub> / ACC<sub>(R404)</sub> / ERS<sub>(R411)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R403)</sub> / ECON<sub>(R404)</sub> / VAD<sub>(AD)</sub> / HMSC<sub>(R411)</sub><br>
                        X3: BIO3/ERS3<sub>(R411)</sub> / ICT<sub>(CR3)</sub> / MAM2<sub>(R403)</sub> / THS<sub>(R404)</sub> / VAD3<sub>(DF)</sub>
                    </td></tr>
                </tfoot>`;
        }

        timetableTable.innerHTML = tableHTML;
    }

    function formatLesson(lesson, isClassMode) {
        if (isClassMode) {
            let subject = lesson.subject;
            if (subject.includes('BM') && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) subject = 'X1';
            if (subject.includes('CHEM')) subject = 'X2';
            if (subject.includes('ICT')) subject = 'X3';
            return `<span class="subject" style="color:blue;">${subject}</span> <span class="teacher">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') return `<span class="subject" style="color:blue;">${lesson.class} MAUP</span>`;
        const grouped = allLessons.filter(l => l.day === lesson.day && l.period === lesson.period && l.subject === lesson.subject && l.teacher === lesson.teacher);
        let classDisplay = lesson.class;
        if (grouped.length > 1) {
            const cls = [...new Set(grouped.map(l => l.class))].sort();
            classDisplay = simplifyClassNames(cls);
        }
        return `<span class="subject" style="color:blue;">${classDisplay} ${lesson.subject}</span> <span class="room" style="color:#555;">${lesson.room}</span>`;
    }

    function generateTimetableHTMLForExport(lessons, isClassMode) {
        let html = `
        <table style="width:95%;border-collapse:collapse;margin-top:10px;font-size:10px;">
            <thead>
                <tr>
                    <th style="width:40px;background-color:#3498db;color:white;font-size:9px;">Time</th>
                    <th style="width:15px;background-color:#3498db;color:white;font-size:9px;">Period</th>
                    <th style="background-color:#3498db;color:white;font-size:9px;">Monday</th>
                    <th style="background-color:#3498db;color:white;font-size:9px;">Tuesday</th>
                    <th style="background-color:#3498db;color:white;font-size:9px;">Wednesday</th>
                    <th style="background-color:#3498db;color:white;font-size:9px;">Thursday</th>
                    <th style="background-color:#3498db;color:white;font-size:9px;">Friday</th>
                </tr>
            </thead>
            <tbody>
        `;
        for (const slot of timeSlots) {
            if (slot.isBreak) {
                html += `
                    <tr>
                        <td style="width:40px;background-color:#3498db;color:white;font-size:9px;">${slot.time}-${slot.endTime}</td>
                        <td style="background-color:#e6e6e6;color:#777;font-style:italic;font-size:9px;" colspan="6">${slot.label}</td>
                    </tr>`;
                continue;
            }
            html += `<tr>
                <td style="width:40px;background-color:#3498db;color:white;font-size:9px;">${slot.time}-${slot.endTime}</td>
                <td style="width:20px;background-color:#3498db;color:white;font-size:9px;">${slot.period}</td>`;
            for (let day=1; day<=5; day++) {
                const dayLessons = lessons.filter(lesson => lesson.day === day && lesson.period === parseInt(slot.period));
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        html += `<td style="background-color:#f9f9f9;"><div class="dismissal-time" style="font-size:8px;">(CPA 14:40 - 15:30)</div></td>`;
                    } else {
                        html += `<td><div>${formatLessonForExport(dayLessons[0], isClassMode)}</div><div class="dismissal-time" style="font-size:8px;">(CPA 14:40 - 15:30)</div></td>`;
                    }
                    continue;
                }
                if (dayLessons.length === 0) {
                    html += `<td style="background-color:#f9f9f9;"></td>`;
                } else {
                    if (isClassMode) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join(',');
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                        const hasIct  = dayLessons.some(l => l.subject.includes('ICT'));
                        const hasBM   = dayLessons.some(l => l.subject.includes('BM'));
                        if (hasChem) html += `<td><div><span style="color:blue;font-size:12px">X2<br></span><span style="font-size:8px">(${teachers})</span></div></td>`;
                        else if (hasIct) html += `<td><div><span style="color:blue;font-size:12px">X3<br></span><span style="font-size:8px">(${teachers})</span></div></td>`;
                        else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) html += `<td><div><span style="color:blue;font-size:12px">X1<br></span><span style="font-size:8px">(${teachers})</span></div></td>`;
                        else if (hasMaup) html += `<td><div><span style="color:blue;font-size:9px">MAUP</span> <span style="font-size:8px">(${teachers})</span></div></td>`;
                        else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join(',');
                            html += `<td><div><span style="color:blue;font-size:9px">${subjects}<br></span><span style="color:#555;font-size:7px"> ${rooms}<br></span><span style="font-size:7px">(${teachers})</span></div></td>`;
                        }
                    } else {
                        const first = dayLessons[0];
                        const isPE = first.subject === 'PE';
                        const isMaup = first.subject === 'MAUP';
                        if (isPE) {
                            const allPE = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === 'PE');
                            const allClasses = [...new Set(allPE.map(l => l.class))].sort().join('/');
                            const others = [...new Set(allPE.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                            html += `<td><div><span style="color:blue;font-size:9px">${allClasses} PE</span>${others ? `<span style="font-size:8px"> (${others})</span>` : ''}</div></td>`;
                        } else if (isMaup) {
                            html += `<td><div><span style="color:blue;font-size:9px">${first.class} MAUP</span></div></td>`;
                        } else {
                            const noCo = ['ARD', 'CPA', 'READ', 'MAUP'];
                            const shouldCo = !noCo.includes(first.subject);
                            let coTeachers = '';
                            if (shouldCo) {
                                const same = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.class === first.class && l.subject === first.subject);
                                coTeachers = [...new Set(same.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                            }
                            const grouped = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === first.subject && l.teacher === first.teacher);
                            let classDisplay = first.class;
                            if (grouped.length > 1) {
                                const cls = [...new Set(grouped.map(l => l.class))].sort();
                                classDisplay = simplifyClassNames(cls);
                            }
                            html += `<td><div><span style="color:blue;font-size:12px">${classDisplay} ${first.subject}<br></span> <span style="color:#555;font-size:8px">${first.room}</span>${coTeachers ? ` <span style="font-size:8px">(${coTeachers})</span>` : ''}</div></td>`;
                        }
                    }
                }
            }
            html += `</tr>`;
        }
        html += `</tbody></table>`;
        // 附加選修科說明（與頁面一致）
        if (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1])) {
            html += `<div style="text-align:left;margin-top:10px;font-size:9px;">
                <strong>Form 4:</strong><br>
                X1: PHY<sub>(PHY)</sub>/BM<sub>(R204)</sub> / ACC<sub>(R203)</sub> / ERS<sub>(R401)</sub> / VAD<sub>(AD)</sub><br>
                X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R204)</sub> / ECON<sub>(R203)</sub> / HMSC<sub>(R401)</sub><br>
                X3: BIO3<sub>(BIO/R201/BIO)</sub> / ERS3<sub>(R401)</sub> / ICT<sub>(CR2)</sub> / MAM2<sub>(R204)</sub> / THS<sub>(R203)</sub> / VAD3<sub>(DF)</sub><br><br></div>`;
        } else if (currentTitle.includes('班別') && /^[5][A-D]$/i.test(currentTitle.split(' ')[1])) {
            html += `<div style="text-align:left;margin-top:10px;font-size:9px;">
                <strong>Form 5:</strong><br>
                X1: BIO<sub>(BIO/R314/BIO)</sub> / PHY<sub>(PHY)</sub> / BM<sub>(R413)</sub> / ACC<sub>(R414)</sub> / ERS<sub>(R412)</sub><br>
                X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R412)</sub> / ECON<sub>(R414)</sub> / VAD<sub>(AD)</sub> / HMSC<sub>(R413)</sub><br>
                X3: BIO3<sub>(BIO/R402/BIO)</sub> / ERS3<sub>(R412)</sub> / ICT<sub>(CR1)</sub> / MAM2<sub>(R413)</sub> / THS<sub>(R414)</sub> / VAD3<sub>(AD)</sub><br><br></div>`;
        } else if (currentTitle.includes('班別') && /^[6][A-D]$/i.test(currentTitle.split(' ')[1])) {
            html += `<div style="text-align:left;margin-top:10px;font-size:9px;">
                <strong>Form 6:</strong><br>
                X1: BIO<sub>(BIO)</sub> / PHY<sub>(PHY)</sub> / BM<sub>(R403)</sub> / ACC<sub>(R404)</sub> / ERS<sub>(R411)</sub><br>
                X2: CHEM<sub>(CHEM)</sub> / CHIS<sub>(R403)</sub> / ECON<sub>(R404)</sub> / VAD<sub>(AD)</sub> / HMSC<sub>(R411)</sub><br>
                X3: BIO3/ERS3<sub>(R411)</sub> / ICT<sub>(CR3)</sub> / MAM2<sub>(R403)</sub> / THS<sub>(R404)</sub> / VAD3<sub>(DF)</sub></div>`;
        }
        return html;
    }

    function printTimetable() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表'); return;
        }
        const printWindow = window.open('', '', 'width=1000,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${currentTitle}</title>
                    <style>
                        body { font-family: Arial; margin: 10px; }
                        h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
                        th { background-color: #3498db; color: white; }
                        .time-col { width: 80px; background-color: #3498db; color: white; font-size: 9px; }
                        .period-col { width: 30px; background-color: #3498db; color: white; font-size: 9px; }
                        .break-cell { background-color: #f2f2f2; font-style: italic; }
                        .empty-cell { background-color: #f9f9f9; }
                        .subject { color: blue; font-size: 9px; }
                        .room { color: #555; font-size: 8px; }
                        .teacher { font-size: 8px; }
                        .dismissal-time { font-size: 8px; color: #666; font-style: italic; }
                        @page { size: A4 portrait; margin: 5mm; }
                    </style>
                </head>
                <body>
                    <h1>${currentTitle}</h1>
                    ${generateTimetableHTMLForExport(currentLessons, currentTitle.includes('班別'))}
                    <script>
                        window.onload = function(){ setTimeout(function(){ window.print(); window.close(); }, 200); };
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    function exportToPDF() {
        if (!currentTitle || currentLessons.length === 0) { alert('請先查詢時間表'); return; }
        const element = document.createElement('div');
        element.style.width = '100%';
        element.innerHTML = `
            <h1 style="text-align:center;font-family:Arial;margin-bottom:10px;font-size:16px;">${currentTitle}</h1>
            <div style="font-size:10px;">${generateTimetableHTMLForExport(currentLessons, currentTitle.includes('班別'))}</div>
        `;
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `${currentTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save()
                .catch(() => alert('PDF 生成失敗，請改用列印或聯絡管理員'));
        } else alert('PDF 函式未載入');
    }

    function exportToExcel() {
        if (!currentTitle || currentLessons.length === 0) { alert('請先查詢時間表'); return; }
        if (!window.XLSX) { alert('Excel 函式未載入'); return; }

        const wb = XLSX.utils.book_new();
        const rows = [];
        rows.push([currentTitle]); rows.push([]);
        rows.push(['Time', 'Period', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

        const isClassMode = currentTitle.includes('班別');
        for (const slot of timeSlots) {
            const row = [];
            row.push(`${slot.time}-${slot.endTime}`);
            row.push(slot.period || '');
            if (slot.isBreak) {
                for (let day=1; day<=5; day++) row.push(slot.label);
            } else {
                for (let day=1; day<=5; day++) {
                    const dayLessons = currentLessons.filter(l => l.day === day && l.period === parseInt(slot.period));
                    if (dayLessons.length === 0) {
                        row.push(day === 3 && slot.period === '10' ? '(CPA 14:40 - 15:30)' : '');
                    } else {
                        if (isClassMode) {
                            const teachers = [...new Set(dayLessons.map(l => l.teacher))].join(',');
                            const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                            const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                            const hasIct  = dayLessons.some(l => l.subject.includes('ICT'));
                            const hasBM   = dayLessons.some(l => l.subject.includes('BM'));
                            if (hasChem) row.push(`X2 (${teachers})`);
                            else if (hasIct) row.push(`X3 (${teachers})`);
                            else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) row.push(`X1 (${teachers})`);
                            else if (hasMaup) row.push(`MAUP (${teachers})`);
                            else {
                                const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                                const rooms = [...new Set(dayLessons.map(l => l.room))].join(',');
                                row.push(`${subjects} ${rooms} (${teachers})`);
                            }
                        } else {
                            const first = dayLessons[0];
                            const isPE = first.subject === 'PE';
                            const isMaup = first.subject === 'MAUP';
                            if (isPE) {
                                const allPE = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === 'PE');
                                const allClasses = [...new Set(allPE.map(l => l.class))].sort().join('/');
                                const others = [...new Set(allPE.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                                row.push(`${allClasses} PE${others ? ` (${others})` : ''}`);
                            } else if (isMaup) {
                                row.push(`${first.class} MAUP`);
                            } else {
                                const noCo = ['ARD', 'CPA', 'READ', 'MAUP'];
                                const shouldCo = !noCo.includes(first.subject);
                                let coTeachers = '';
                                if (shouldCo) {
                                    const same = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.class === first.class && l.subject === first.subject);
                                    coTeachers = [...new Set(same.map(l => l.teacher))].filter(t => t !== first.teacher).sort().join(',');
                                }
                                const grouped = allLessons.filter(l => l.day === day && l.period === parseInt(slot.period) && l.subject === first.subject && l.teacher === first.teacher);
                                let classDisplay = first.class;
                                if (grouped.length > 1) {
                                    const cls = [...new Set(grouped.map(l => l.class))].sort();
                                    classDisplay = simplifyClassNames(cls);
                                }
                                row.push(`${classDisplay} ${first.subject} ${first.room}${coTeachers ? ` (${coTeachers})` : ''}`);
                            }
                        }
                    }
                }
            }
            rows.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, '時間表');
        XLSX.writeFile(wb, `${currentTitle}.xlsx`);
    }

    function formatLessonForExport(lesson, isClassMode) {
        if (isClassMode) {
            let subject = lesson.subject;
            if (subject.includes('BM') && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) subject = 'X1';
            if (subject.includes('CHEM')) subject = 'X2';
            if (subject.includes('ICT')) subject = 'X3';
            return `<span style="color:blue;font-size:12px">${subject}<br></span> <span style="font-size:8px">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') return `<span style="color:blue;font-size:9px">${lesson.class} MAUP</span>`;
        return `<span style="color:blue;font-size:12px">${lesson.class} ${lesson.subject}<br></span> <span style="color:#555;font-size:8px">${lesson.room}</span>`;
    }

    // 綁定事件
    teacherNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = teacherNameInput.value.trim();
            if (!query) return;
            if (isClassQuery(query)) displayClassTimetable(query); else displayTimetable(query);
        }
    });
    teacherNameInput.addEventListener('click', function(){ this.value = ''; });

    teacherDropdown.addEventListener('change', function() {
        const teacherName = teacherDropdown.value;
        if (teacherName) {
            teacherNameInput.value = teacherName;
            displayTimetable(teacherName);
            classDropdown.value = '';
        }
    });
    classDropdown.addEventListener('change', function() {
        const className = classDropdown.value;
        if (className) {
            teacherNameInput.value = className;
            displayClassTimetable(className);
            teacherDropdown.value = '';
        }
    });

    function displayTimetable(teacherName) {
        currentLessons = allLessons.filter(item => item.teacher.toUpperCase() === teacherName.toUpperCase());
        if (currentLessons.length === 0) {
            resultDiv.innerHTML = `<p>找不到教師 ${teacherName} 的時間表</p>`;
            timetableTable.innerHTML = '';
            currentTitle = '';
            return;
        }
        currentTitle = `${teacherName} 的時間表`;
        resultDiv.innerHTML = `<h3 style="margin:0;">${currentTitle}</h3>`;
        renderTimetable(currentLessons);
    }
    function displayClassTimetable(className) {
        currentLessons = allLessons.filter(item => item.class.toUpperCase() === className.toUpperCase());
        if (currentLessons.length === 0) {
            resultDiv.innerHTML = `<p>找不到班別 ${className} 的時間表</p>`;
            timetableTable.innerHTML = '';
            currentTitle = '';
            return;
        }
        currentTitle = `班別 ${className} 的時間表`;
        resultDiv.innerHTML = `<h3 style="margin:0;">${currentTitle}</h3>`;
        renderTimetable(currentLessons, true);
    }

    // 載入資料
    try {
        allLessons = await getLessons();
        const [teachers, classes] = await Promise.all([getTeachers(), getClasses()]);
        populateDropdowns(teachers, classes);
        loadingDiv.style.display = 'none';
        resultDiv.innerHTML = '<p>時間表數據已載入，請輸入教師姓名或班別</p>';
        initExportButtons();
    } catch (e) {
        console.error(e);
        loadingDiv.innerHTML = `<p style="color:red">錯誤: ${e.message}</p>`;
    }
}