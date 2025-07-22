document.addEventListener('DOMContentLoaded', function() {
    const teacherNameInput = document.getElementById('teacherName');
    const teacherDropdown = document.getElementById('teacherDropdown');
    const classDropdown = document.getElementById('classDropdown');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const timetableTable = document.getElementById('timetable');
    const exportBtnGroup = document.getElementById('exportBtnGroup');
    
    let allLessons = []; // 存儲所有課程數據
    let allTeachers = []; // 存儲所有教師名單
    let allClasses = []; // 存儲所有班別名單
    let currentTitle = ''; // 當前顯示的時間表標題
    let currentLessons = []; // 當前顯示的課程數據
    
    // 時間段定義
    const timeSlots = [
        { time: '8:05', period: '0', endTime: '8:20', isBreak: true, label: '早會' },
        { time: '8:20', period: '1', endTime: '8:55', isBreak: false },
        { time: '8:55', period: '2', endTime: '9:30', isBreak: false },
        { time: '9:30', period: '', endTime: '9:45', isBreak: true, label: '小息' },
        { time: '9:45', period: '3', endTime: '10:20', isBreak: false },
        { time: '10:20', period: '4', endTime: '10:55', isBreak: false },
        { time: '10:55', period: '', endTime: '11:10', isBreak: true, label: '小息' },
        { time: '11:10', period: '5', endTime: '11:45', isBreak: false },
        { time: '11:45', period: '6', endTime: '12:20', isBreak: false },
        { time: '12:20', period: '7', endTime: '12:55', isBreak: false },
        { time: '12:55', period: '', endTime: '14:00', isBreak: true, label: '午膳' },
        { time: '14:00', period: '', endTime: '14:05', isBreak: true, label: '預備節' },
        { time: '14:05', period: '8', endTime: '14:40', isBreak: false },
        { time: '14:40', period: '9', endTime: '15:15', isBreak: false },
        { time: '15:15', period: '10', endTime: '15:50', isBreak: false }
    ];

    function initExportButtons() {
        exportBtnGroup.innerHTML = `
            <button id="printBtn" class="export-btn">列印時間表</button>
            <button id="pdfBtn" class="export-btn">匯出PDF</button>
            <button id="excelBtn" class="export-btn">匯出Excel</button>
        `;
        document.getElementById('printBtn').addEventListener('click', printTimetable);
        document.getElementById('pdfBtn').addEventListener('click', exportToPDF);
        document.getElementById('excelBtn').addEventListener('click', exportToExcel);
    }

    function printTimetable() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }
        const printWindow = window.open('', '', 'width=1000,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${currentTitle}</title>
                    <style>
                        body { font-family: Arial; margin: 20px; }
                        h1 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                        th { background-color: #3498db; color: white; }
                        .time-col { width: 100px; background-color: #3498db; color: white; }
                        .period-col { width: 50px; background-color: #3498db; color: white; }
                        .break-cell { background-color: #f2f2f2; font-style: italic; }
                        .empty-cell { background-color: #f9f9f9; }
                        .subject { color: blue; }
                        .room { color: #555; font-size: 12px; }
                        .teacher { font-size: 12px; }
                        .dismissal-time { font-size: 0.9em; color: #666; font-style: italic; }
                    </style>
                </head>
                <body>
                    <h1>${currentTitle}</h1>
                    ${generateTimetableHTML(currentLessons, currentTitle.includes('班別'))}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 200);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    function exportToPDF() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }
        const element = document.createElement('div');
        element.style.width = '100%';
        element.innerHTML = `
            <h1 style="text-align:center;font-family:Arial;margin-bottom:20px;">${currentTitle}</h1>
            ${generateTimetableHTML(currentLessons, currentTitle.includes('班別'))}
        `;
        const opt = {
            margin: [10, 5, 10, 5],
            filename: `${currentTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: true, useCORS: true, scrollY: 0, windowHeight: document.getElementById('timetable').scrollHeight + 200 },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = function() {
            setTimeout(() => {
                html2pdf().set(opt).from(element).save()
                    .then(() => { console.log('PDF generated successfully'); })
                    .catch(err => { console.error('PDF generation error:', err); backupPDFGeneration(element, opt); });
            }, 500);
        };
        document.head.appendChild(script);
    }

    function backupPDFGeneration(element, opt) {
        const backupOpt = {
            ...opt,
            html2canvas: { ...opt.html2canvas, scale: 1.5, windowHeight: document.getElementById('timetable').scrollHeight + 500 },
            jsPDF: { ...opt.jsPDF, format: 'a2' }
        };
        try {
            html2pdf().set(backupOpt).from(element).save();
        } catch (err) {
            console.error('Backup PDF generation failed:', err);
            alert('PDF生成失敗，請嘗試列印功能或聯繫管理員');
        }
    }

    function generateTimetableHTML(lessons, isClassQuery) {
        let tableHTML = `
            <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                <thead>
                    <tr>
                        <th style="width:100px;background-color:#3498db;color:white;">時間</th>
                        <th style="width:50px;background-color:#3498db;color:white;">節數</th>
                        <th style="background-color:#3498db;color:white;">星期一</th>
                        <th style="background-color:#3498db;color:white;">星期二</th>
                        <th style="background-color:#3498db;color:white;">星期三</th>
                        <th style="background-color:#3498db;color:white;">星期四</th>
                        <th style="background-color:#3498db;color:white;">星期五</th>
                    </tr>
                </thead>
                <tbody>
        `;
        timeSlots.forEach(slot => {
            if (slot.isBreak) {
                tableHTML += `
                    <tr>
                        <td style="width:100px;background-color:#3498db;color:white;">${slot.time}-${slot.endTime}</td>
                        <td style="background-color:#e6e6e6;color:#777;font-style:italic;" colspan="6">${slot.label}</td>
                    </tr>
                `;
                return;
            }
            tableHTML += `
                <tr>
                    <td style="width:100px;background-color:#3498db;color:white;">${slot.time}-${slot.endTime}</td>
                    <td style="width:50px;background-color:#3498db;color:white;">${slot.period}</td>
            `;
            for (let day = 1; day <= 5; day++) {
                const dayLessons = lessons.filter(
                    lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                );
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td style="background-color:#f9f9f9;">
                            <div class="dismissal-time">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        if (!isClassQuery) {
                            tableHTML += `<td>
                                <div>${formatMultipleClassesWithCoTeachers(dayLessons, false)}</div>
                                <div class="dismissal-time">(放學時間 15:30)</div>
                            </td>`;
                        } else {
                            const firstLesson = dayLessons[0];
                            tableHTML += `<td>
                                <div>${formatLessonForExport(firstLesson, true)}</div>
                                <div class="dismissal-time">(放學時間 15:30)</div>
                            </td>`;
                        }
                    }
                    continue;
                }
                if (dayLessons.length === 0) {
                    tableHTML += `<td style="background-color:#f9f9f9;"></td>`;
                } else {
                    if (isClassQuery) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        const hasChem = dayLessons.some(l => l.subject.includes('!CHEM'));
                        const hasIct = dayLessons.some(l => l.subject.includes('!ICT'));
                        if (hasChem) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue">X2</span>
                                    <span style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue">X3</span>
                                    <span style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasMaup) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue">MAUP</span>
                                    <span style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue">${subjects}</span>
                                    <span style="color:#555;font-size:0.7em"> ${rooms}</span>
                                    <span style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        }
                    } else {
                        tableHTML += `<td>
                            <div>${formatMultipleClassesWithCoTeachers(dayLessons, false)}</div>
                        </td>`;
                    }
                }
            }
            tableHTML += `</tr>`;
        });
        tableHTML += `</tbody></table>`;
        return tableHTML;
    }

    function exportToExcel() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }
        const wb = XLSX.utils.book_new();
        const rows = [];
        rows.push([currentTitle]);
        rows.push([]);
        const headerRow = ['時間', '節數', '星期一', '星期二', '星期三', '星期四', '星期五'];
        rows.push(headerRow);
        const isClassQuery = currentTitle.includes('班別');
        timeSlots.forEach(slot => {
            const row = [];
            row.push(`${slot.time}-${slot.endTime}`);
            row.push(slot.period || '');
            if (slot.isBreak) {
                for (let day = 1; day <= 5; day++) {
                    row.push(slot.label);
                }
            } else {
                for (let day = 1; day <= 5; day++) {
                    const dayLessons = currentLessons.filter(
                        lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                    );
                    if (dayLessons.length === 0) {
                        if (day === 3 && slot.period === '10') {
                            row.push('(放學時間 15:30)');
                        } else {
                            row.push('');
                        }
                    } else {
                        if (isClassQuery) {
                            const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                            const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                            const hasChem = dayLessons.some(l => l.subject.includes('!CHEM'));
                            const hasIct = dayLessons.some(l => l.subject.includes('!ICT'));
                            if (hasChem) {
                                row.push(`X2 (${teachers})`);
                            } else if (hasIct) {
                                row.push(`X3 (${teachers})`);
                            } else if (hasMaup) {
                                row.push(`MAUP (${teachers})`);
                            } else {
                                const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                                const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                                row.push(`${subjects} ${rooms} (${teachers})`);
                            }
                        } else {
                            row.push(formatMultipleClassesWithCoTeachersText(dayLessons));
                        }
                    }
                }
            }
            rows.push(row);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, '時間表');
        XLSX.writeFile(wb, `${currentTitle}.xlsx`);
    }

    // 這是關鍵修正版：同班同科多教師，顯示所有教師及房間
    function formatMultipleClassesWithCoTeachers(lessons, isClassQuery) {
        if (isClassQuery) {
            return formatLesson(lessons[0], true);
        }
        if (!lessons || lessons.length === 0) return '';
        const first = lessons[0];
        // 是否為同班同科多教師
        const isMultiTeacherSameClassSubject =
            lessons.every(l => l.class === first.class && l.subject === first.subject)
            && lessons.length > 1;
        if (isMultiTeacherSameClassSubject) {
            // 取得所有教師，將自己放前，房間為自己的
            const me = first.teacher;
            const otherTeachers = lessons.map(l => l.teacher).filter(t => t !== me);
            let text = `<span class="subject" style="color:blue">${first.class} ${first.subject}</span>`;
            text += ` <span class="room" style="color:#555;font-size:0.7em">(${first.room})</span>`;
            if (otherTeachers.length) {
                text += ` <span class="teacher" style="font-size:0.8em">(${otherTeachers.join('/')})</span>`;
            }
            return text;
        }
        // 其他情況（合班）維持原本格式
        const classList = [...new Set(lessons.map(l => l.class))].sort((a,b)=>a.localeCompare(b, 'zh-Hant'));
        const subject = first.subject;
        const room = first.room;
        if(subject === 'MAUP') {
            return `<span class="subject" style="color:blue">${classList.join('/')} MAUP</span>`;
        }
        if(subject === 'PE') {
            return `<span class="subject" style="color:blue">${classList.join('/')} PE</span>`;
        }
        return `<span class="subject" style="color:blue">${classList.join('/')} ${subject}</span> <span class="room" style="color:#555;font-size:0.7em">${room}</span>`;
    }
    // Excel 用文字版本
    function formatMultipleClassesWithCoTeachersText(lessons) {
        if (!lessons || lessons.length === 0) return '';
        const first = lessons[0];
        const isMultiTeacherSameClassSubject =
            lessons.every(l => l.class === first.class && l.subject === first.subject)
            && lessons.length > 1;
        if (isMultiTeacherSameClassSubject) {
            const me = first.teacher;
            const otherTeachers = lessons.map(l => l.teacher).filter(t => t !== me);
            let text = `${first.class} ${first.subject} (${first.room})`;
            if (otherTeachers.length) {
                text += ` (${otherTeachers.join('/')})`;
            }
            return text;
        }
        // 其他合班格式
        const classList = [...new Set(lessons.map(l => l.class))].sort((a,b)=>a.localeCompare(b, 'zh-Hant'));
        const subject = first.subject;
        const room = first.room;
        if(subject === 'MAUP') {
            return `${classList.join('/')} MAUP`;
        }
        if(subject === 'PE') {
            return `${classList.join('/')} PE`;
        }
        return `${classList.join('/')} ${subject} ${room}`;
    }

    function formatLessonForExport(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('!CHEM')) subject = 'X2';
            if (subject.includes('!ICT')) subject = 'X3';
            return `${subject} (${lesson.teacher})`;
        }
        if (lesson.subject === 'MAUP') {
            return `${lesson.class} MAUP`;
        }
        return `${lesson.class} ${lesson.subject} ${lesson.room}`;
    }

    teacherNameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const query = teacherNameInput.value.trim();
            if (query) {
                if (isClassQuery(query)) {
                    displayClassTimetable(query);
                } else {
                    displayTimetable(query);
                }
            }
        }
    });
    teacherNameInput.addEventListener('click', function() {
        this.value = '';
    });

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

    function isClassQuery(query) {
        return /^[1-6][A-D]$/i.test(query);
    }

    function loadCSV() {
        fetch('tt.csv?' + new Date().getTime())
            .then(response => {
                if (!response.ok) throw new Error('網絡響應不正常');
                return response.text();
            })
            .then(data => {
                allLessons = parseCSV(data);
                allTeachers = [...new Set(allLessons.map(item => item.teacher.trim()))].sort();
                allClasses = [...new Set(allLessons
                    .filter(item => /^[1-6][A-D]$/i.test(item.class.trim()))
                    .map(item => item.class.trim()))].sort();
                populateDropdowns();
                loadingDiv.style.display = 'none';
                resultDiv.innerHTML = '<p>時間表數據已載入，請輸入教師姓名或班別(如1A)</p>';
                initExportButtons();
            })
            .catch(error => {
                console.error('載入CSV文件時出錯:', error);
                loadingDiv.innerHTML = `<p style="color:red">錯誤: ${error.message}</p>`;
                setTimeout(loadCSV, 1000);
            });
    }
    function populateDropdowns() {
        teacherDropdown.innerHTML = '<option value="">選擇教師...</option>';
        allTeachers.forEach(teacher => {
            teacherDropdown.innerHTML += `<option value="${teacher}">${teacher}</option>`;
        });
        classDropdown.innerHTML = '<option value="">選擇班別...</option>';
        allClasses.forEach(cls => {
            classDropdown.innerHTML += `<option value="${cls}">${cls}</option>`;
        });
    }
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

    function displayTimetable(teacherName) {
        currentLessons = allLessons.filter(item => 
            item.teacher.toUpperCase() === teacherName.toUpperCase()
        );
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
        currentLessons = allLessons.filter(item => 
            item.class.toUpperCase() === className.toUpperCase()
        );
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

    function renderTimetable(lessons, isClassQuery = false) {
        // ...（見前述，已經覆蓋）...
        // 這裡呼叫的就是 formatMultipleClassesWithCoTeachers
        // 內容已按新需求修正
        let tableHTML = `
            <thead>
                <tr>
                    <th class="time-col" style="padding: 4px;">時間</th>
                    <th class="period-col" style="padding: 4px;">節數</th>
                    <th style="padding: 4px;">星期一</th>
                    <th style="padding: 4px;">星期二</th>
                    <th style="padding: 4px;">星期三</th>
                    <th style="padding: 4px;">星期四</th>
                    <th style="padding: 4px;">星期五</th>
                </tr>
            </thead>
            <tbody>
        `;
        timeSlots.forEach((slot, index) => {
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
                const dayLessons = lessons.filter(
                    lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                );
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td class="empty-cell">
                            <div class="dismissal-time">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        if (!isClassQuery) {
                            tableHTML += `<td>
                                <div class="main-lesson">${formatMultipleClassesWithCoTeachers(dayLessons, false)}</div>
                                <div class="dismissal-time">(放學時間 15:30)</div>
                            </td>`;
                        } else {
                            const firstLesson = dayLessons[0];
                            tableHTML += `<td>
                                <div class="main-lesson">${formatLesson(firstLesson, true)}</div>
                                <div class="dismissal-time">(放學時間 15:30)</div>
                            </td>`;
                        }
                    }
                    continue;
                }
                if (dayLessons.length === 0) {
                    tableHTML += `<td class="empty-cell"></td>`;
                } else {
                    if (isClassQuery) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        const hasChem = dayLessons.some(l => l.subject.includes('!CHEM'));
                        const hasIct = dayLessons.some(l => l.subject.includes('!ICT'));
                        if (hasChem) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">X2</span>
                                    <span class="teacher" style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">X3</span>
                                    <span class="teacher" style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasMaup) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">MAUP</span>
                                    <span class="teacher" style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        } else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">${subjects}</span>
                                    <span class="room" style="color:#555;font-size:0.7em"> ${rooms}</span>
                                    <span class="teacher" style="font-size:0.8em">(${teachers})</span>
                                </div>
                            </td>`;
                        }
                    } else {
                        tableHTML += `<td>
                            <div class="main-lesson">${formatMultipleClassesWithCoTeachers(dayLessons, false)}</div>
                        </td>`;
                    }
                }
            }
            tableHTML += `</tr>`;
        });
        tableHTML += `</tbody>`;
        timetableTable.innerHTML = tableHTML;
    }

    function formatLesson(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('!CHEM')) subject = 'X2';
            if (subject.includes('!ICT')) subject = 'X3';
            return `<span class="subject" style="color:blue">${subject}</span> <span class="teacher" style="font-size:0.8em">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') {
            return `<span class="subject" style="color:blue">${lesson.class} MAUP</span>`;
        }
        return `<span class="subject" style="color:blue">${lesson.class} ${lesson.subject}</span> <span class="room" style="color:#555;font-size:0.7em">${lesson.room}</span>`;
    }

    loadCSV();
});
