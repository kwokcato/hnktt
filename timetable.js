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
    
    // Time段定義 (true > 顯示 label, false > 不顯示 label)
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
    
    // 初始化導出按鈕
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

    // 列印時間表
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
    
    // 匯出PDF
    function exportToPDF() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }
        
        // 使用html2pdf.js庫
        const element = document.createElement('div');
        element.style.width = '100%'; //100%
        element.innerHTML = `
            <h1 style="text-align:center;font-family:Arial;margin-bottom:10px;font-size:16px;">${currentTitle}</h1>
            <div style="font-size:10px;">
                ${generateTimetableHTML(currentLessons, currentTitle.includes('班別'))}
            </div>
        `;
        
        const opt = {
            margin: [5, 5, 2, 2], // 上下左右邊距 5,5,5,5
            filename: `${currentTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                logging: true, 
                useCORS: true,
                scrollY: 0,
                windowHeight: document.getElementById('timetable').scrollHeight + 200
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4',
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'] 
            }
        };
        
        // 引入html2pdf庫
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = function() {
            setTimeout(() => {
                html2pdf().set(opt).from(element).save()
                    .then(() => {
                        console.log('PDF generated successfully');
                    })
                    .catch(err => {
                        console.error('PDF generation error:', err);
                        backupPDFGeneration(element, opt);
                    });
            }, 500);
        };
        document.head.appendChild(script);
    }

    // 備用PDF生成方法
    function backupPDFGeneration(element, opt) {
        const backupOpt = {
            ...opt,
            html2canvas: {
                ...opt.html2canvas,
                scale: 1,
                windowHeight: document.getElementById('timetable').scrollHeight + 500
            },
            jsPDF: {
                ...opt.jsPDF,
                format: 'a4'
            }
        };
        
        try {
            html2pdf().set(backupOpt).from(element).save();
        } catch (err) {
            console.error('Backup PDF generation failed:', err);
            alert('PDF生成失敗，請嘗試列印功能或聯繫管理員');
        }
    }
    
    // 生成時間表HTML (用於PDF和列印)
    function generateTimetableHTML(lessons, isClassQuery) {
        let tableHTML = `
            <table style="width:95%;border-collapse:collapse;margin-top:10px;font-size:10px;"> <!-- 100% -->
                <thead>
                    <tr>
                        <th style="width:40px;background-color:#3498db;color:white;font-size:9px;">Time</th>  <!-- 80 -->
                        <th style="width:15px;background-color:#3498db;color:white;font-size:9px;">Period</th>  <!-- 30 -->
                        <th style="background-color:#3498db;color:white;font-size:9px;">Monday</th>
                        <th style="background-color:#3498db;color:white;font-size:9px;">Tuesday</th>
                        <th style="background-color:#3498db;color:white;font-size:9px;">Wednesday</th>
                        <th style="background-color:#3498db;color:white;font-size:9px;">Thursday</th>
                        <th style="background-color:#3498db;color:white;font-size:9px;">Friday</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        timeSlots.forEach(slot => {
            if (slot.isBreak) {
                tableHTML += `
                    <tr>
                        <td style="width:40px;background-color:#3498db;color:white;font-size:9px;">${slot.time}-${slot.endTime}</td>
                        <td style="background-color:#e6e6e6;color:#777;font-style:italic;font-size:9px;" colspan="6">${slot.label}</td>
                    </tr>
                `;
                return;
            }
            
            tableHTML += `
                <tr>
                    <td style="width:40px;background-color:#3498db;color:white;font-size:9px;">${slot.time}-${slot.endTime}</td>
                    <td style="width:20px;background-color:#3498db;color:white;font-size:9px;">${slot.period}</td>
            `;
            
            for (let day = 1; day <= 5; day++) {
                const dayLessons = lessons.filter(
                    lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                );
                
                // Wednesday第10節特殊處理
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td style="background-color:#f9f9f9;">
                            <div class="dismissal-time" style="font-size:8px;">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div>${formatLessonForExport(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time" style="font-size:8px;">(放學時間 15:30)</div>
                        </td>`;
                    }
                    continue;
                }
                
                if (dayLessons.length === 0) {
                    tableHTML += `<td style="background-color:#f9f9f9;"></td>`;
                } else {
                    // 處理班別查詢的多科目情況
                    if (isClassQuery) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                        
                        // 檢查是否有MAUP科目
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        // 檢查是否有CHEM或ICT科目
                        const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                        const hasIct = dayLessons.some(l => l.subject.includes('ICT'));
                        const hasBM = dayLessons.some(l => l.subject.includes('BM'));
                        
                        if (hasChem) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">X2<br></span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">X3<br></span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">X1<br></span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        }else if (hasMaup) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">MAUP</span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        } else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">${subjects}<br></span>
                                    <span style="color:#555;font-size:7px"> ${rooms}<br></span>
                                    <span style="font-size:7px">(${teachers})</span>
                                </div>
                            </td>`;
                        }
                    } else {
                        // 教師查詢保持原樣
                        const firstLesson = dayLessons[0];
                        const isPE = firstLesson.subject === 'PE';
                        const isMaup = firstLesson.subject === 'MAUP';
                        
                        if (isPE) {
                            const allPELessons = allLessons.filter(
                                lesson => lesson.day === day && 
                                         lesson.period === parseInt(slot.period) &&
                                         lesson.subject === 'PE'
                            );
                            
                            const allClasses = [...new Set(allPELessons.map(l => l.class))].sort().join('/');
                            const otherTeachers = [...new Set(allPELessons.map(l => l.teacher))]
                                .filter(t => t !== firstLesson.teacher)
                                .sort()
                                .join('/');
                            
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">${allClasses} PE</span>
                                    ${otherTeachers ? `<span style="font-size:8px">(${otherTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        } else if (isMaup) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">${firstLesson.class} MAUP</span>
                                </div>
                            </td>`;
                        } else {
                            const noCoTeacherSubjects = ['ARD', 'CPA', 'READ', 'MAUP'];
                            const shouldShowCoTeachers = !noCoTeacherSubjects.includes(firstLesson.subject);
                            let coTeachers = '';
                            
                            if (shouldShowCoTeachers) {
                                const sameLessons = allLessons.filter(
                                    lesson => lesson.day === day && 
                                             lesson.period === parseInt(slot.period) &&
                                             lesson.class === firstLesson.class &&
                                             lesson.subject === firstLesson.subject
                                );
                                
                                coTeachers = [...new Set(sameLessons.map(l => l.teacher))]
                                    .filter(t => t !== firstLesson.teacher)
                                    .sort()
                                    .join('/');
                            }

                            // 檢查是否有合併班別情況
                            const groupedLessons = allLessons.filter(
                                lesson => lesson.day === day && 
                                         lesson.period === parseInt(slot.period) &&
                                         lesson.subject === firstLesson.subject &&
                                         lesson.teacher === firstLesson.teacher
                            );

                            let classDisplay = firstLesson.class;
                            if (groupedLessons.length > 1) {
                                const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                const simplifiedClasses = simplifyClassNames(allClasses);
                                classDisplay = simplifiedClasses;
                            }
                            
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">${classDisplay} ${firstLesson.subject}<br></span>
                                    <span style="color:#555;font-size:7px"> ${firstLesson.room}<br></span>
                                    ${coTeachers ? `<span style="font-size:7px">(${coTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        }
                    }
                }
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody></table>`;

        // Add subject information for Forms 4-6 in exports
        if (currentTitle.includes('班別') && /^[4-6][A-D]$/i.test(currentTitle.split(' ')[1])) {
            tableHTML += `
                <div style="text-align:left;margin-top:10px;font-size:9px;">
                        <strong>Form 4:</strong><br>
                        X1: PHY<sub>(PHY)</sub>/BM<sub>(R204)</sub>/ACC<sub>(R203)</sub>/ERS<sub>(R401)</sub>/VAD<sub>(AD)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R204)</sub>/ECON<sub>(R203)</sub>/HMSC<sub>(R401)</sub><br>
                        X3: BIO3<sub>(BIO/R201/BIO)</sub>/ERS3<sub>(R401)</sub>/ICT<sub>(CR2)</sub>/MAM2<sub>(R204)</sub>/THS<sub>(PHY)</sub>/VAD3<sub>(DF)</sub><br><br>
                        <strong>Form 5:</strong><br>
                        X1: BIO<sub>(BIO/R314/BIO)</sub>/PHY<sub>(PHY)</sub>/BM<sub>(R413)</sub>/ACC<sub>(R414)</sub>/ERS<sub>(R412)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R412)</sub>/ECON<sub>(R414)</sub>/VAD<sub>(AD)</sub>/HMSC<sub>(R413)</sub><br>
                        X3: BIO3<sub>(BIO/R402/BIO)</sub>/ERS3<sub>(R412)</sub>/ICT<sub>(CR1)</sub>/MAM2<sub>(R413)</sub>/THS<sub>(R414)</sub>/VAD3<sub>(AD)</sub>
                        <strong>Form 6:</strong><br>
                        X1: BIO<sub>(BIO)</sub>/PHY<sub>(PHY)</sub>/BM<sub>(R403)</sub>/ACC<sub>(R404)</sub>/ERS<sub>(R411)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R403)</sub>/ECON<sub>(R404)</sub>/VAD<sub>(AD)</sub>/HMS<sub>(R411)</sub>C<br>
                        X3: BIO3/ERS3<sub>(R411)</sub>/ICT<sub>(CR3)</sub>/MAM2<sub>(R403)</sub>/THS<sub>(R404)</sub>/VAD3<sub>(DF)</sub>
                </div>
            `;
        }
        
        return tableHTML;
    }

    // 簡化班別名稱顯示
    function simplifyClassNames(classNames) {
        if (classNames.length <= 1) return classNames[0];
        
        classNames.sort();
        
        const gradeMap = {};
        
        classNames.forEach(className => {
            const grade = className[0];
            const classLetter = className[1];
            if (!gradeMap[grade]) {
                gradeMap[grade] = [];
            }
            gradeMap[grade].push(classLetter);
        });
        
        let result = [];
        for (const grade in gradeMap) {
            const letters = gradeMap[grade];
            if (letters.length > 1) {
                result.push(`${grade}${letters[0]}/${letters.slice(1).join('/')}`);
            } else {
                result.push(`${grade}${letters[0]}`);
            }
        }
        
        return result.join(' ');
    }
    
    // 匯出Excel
    function exportToExcel() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }

        const wb = XLSX.utils.book_new();
        const rows = [];
        
        rows.push([currentTitle]);
        rows.push([]);
        
        const headerRow = ['Time', 'Period', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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
                            const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                            const hasIct = dayLessons.some(l => l.subject.includes('ICT'));
                            const hasBM = dayLessons.some(l => l.subject.includes('BM'));
                            
                            if (hasChem) {
                                row.push(`X2 (${teachers})`);
                            } else if (hasIct) {
                                row.push(`X3 (${teachers})`);
                            } else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) {
                                row.push(`X1 (${teachers})`);
                            } else if (hasMaup) {
                                row.push(`MAUP (${teachers})`);
                            } else {
                                const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                                const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                                row.push(`${subjects} ${rooms} (${teachers})`);
                            }
                        } else {
                            const firstLesson = dayLessons[0];
                            const isPE = firstLesson.subject === 'PE';
                            const isMaup = firstLesson.subject === 'MAUP';
                            
                            if (isPE) {
                                const allPELessons = allLessons.filter(
                                    lesson => lesson.day === day && 
                                             lesson.period === parseInt(slot.period) &&
                                             lesson.subject === 'PE'
                                );
                                
                                const allClasses = [...new Set(allPELessons.map(l => l.class))].sort().join('/');
                                const otherTeachers = [...new Set(allPELessons.map(l => l.teacher))]
                                    .filter(t => t !== firstLesson.teacher)
                                    .sort()
                                    .join('/');
                                
                                row.push(`${allClasses} PE${otherTeachers ? ` (${otherTeachers})` : ''}`);
                            } else if (isMaup) {
                                row.push(`${firstLesson.class} MAUP`);
                            } else {
                                const noCoTeacherSubjects = ['ARD', 'CPA', 'READ', 'MAUP'];
                                const shouldShowCoTeachers = !noCoTeacherSubjects.includes(firstLesson.subject);
                                let coTeachers = '';
                                
                                if (shouldShowCoTeachers) {
                                    const sameLessons = allLessons.filter(
                                        lesson => lesson.day === day && 
                                                 lesson.period === parseInt(slot.period) &&
                                                 lesson.class === firstLesson.class &&
                                                 lesson.subject === firstLesson.subject
                                    );
                                    
                                    coTeachers = [...new Set(sameLessons.map(l => l.teacher))]
                                        .filter(t => t !== firstLesson.teacher)
                                        .sort()
                                        .join('/');
                                }

                                const groupedLessons = allLessons.filter(
                                    lesson => lesson.day === day && 
                                             lesson.period === parseInt(slot.period) &&
                                             lesson.subject === firstLesson.subject &&
                                             lesson.teacher === firstLesson.teacher
                                );

                                let classDisplay = firstLesson.class;
                                if (groupedLessons.length > 1) {
                                    const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                    const simplifiedClasses = simplifyClassNames(allClasses);
                                    classDisplay = simplifiedClasses;
                                }
                                
                                row.push(`${classDisplay} ${firstLesson.subject} ${firstLesson.room}${coTeachers ? ` (${coTeachers})` : ''}`);
                            }
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
    
    // 格式化課程顯示 (用於導出)
    function formatLessonForExport(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('BM') && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) subject = 'X1';
            if (subject.includes('CHEM')) subject = 'X2';
            if (subject.includes('ICT')) subject = 'X3';
            return `<span style="color:blue;font-size:12px">${subject}<br></span> <span style="font-size:8px">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') {
            return `<span style="color:blue;font-size:9px">${lesson.class} MAUP</span>`;
        }
        return `<span style="color:blue;font-size:12px">${lesson.class} ${lesson.subject}<br></span> <span style="color:#555;font-size:8px">${lesson.room}</span>`;
    }

    // 按 Enter 鍵查詢
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

    // 教師下拉選單選擇
    teacherDropdown.addEventListener('change', function() {
        const teacherName = teacherDropdown.value;
        if (teacherName) {
            teacherNameInput.value = teacherName;
            displayTimetable(teacherName);
            classDropdown.value = '';
        }
    });
    
    // 班別下拉選單選擇
    classDropdown.addEventListener('change', function() {
        const className = classDropdown.value;
        if (className) {
            teacherNameInput.value = className;
            displayClassTimetable(className);
            teacherDropdown.value = '';
        }
    });
    
    // 判斷是否為班別查詢
    function isClassQuery(query) {
        return /^[1-6][A-D]$/i.test(query);
    }
    
    // 載入 CSV 文件
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
    
    // 填充下拉選單
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
    
    // 顯示教師時間表
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
    
    // 顯示班別時間表
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
    
    // 渲染時間表 (共用函數)
    function renderTimetable(lessons, isClassQuery = false) {
        let tableHTML = `
            <thead>
                <tr>
                    <th class="time-col" style="padding: 4px;font-size:11px;">Time</th>
                    <th class="period-col" style="padding: 4px;font-size:11px;">Period</th>
                    <th style="padding: 4px;font-size:11px;">Monday</th>
                    <th style="padding: 4px;font-size:11px;">Tuesday</th>
                    <th style="padding: 4px;font-size:11px;">Wednesday</th>
                    <th style="padding: 4px;font-size:11px;">Thursday</th>
                    <th style="padding: 4px;font-size:11px;">Friday</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        timeSlots.forEach((slot, index) => {
            if (slot.isBreak) {
                tableHTML += `
                    <tr>
                        <td class="time-col" style="font-size:11px;">${slot.time}-${slot.endTime}</td>
                        <td class="break-cell" colspan="6" style="font-size:11px;">${slot.label}</td>
                    </tr>
                `;
                return;
            }
            
            tableHTML += `
                <tr>
                    <td class="time-col" style="font-size:11px;">${slot.time}-${slot.endTime}</td>
                    <td class="period-col" style="font-size:11px;">${slot.period}</td>
            `;
            
            for (let day = 1; day <= 5; day++) {
                const dayLessons = lessons.filter(
                    lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                );
                
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td class="empty-cell">
                            <div class="dismissal-time" style="font-size:10px;">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div class="main-lesson">${formatLesson(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time" style="font-size:10px;">(放學時間 15:30)</div>
                        </td>`;
                    }
                    continue;
                }
                
                if (dayLessons.length === 0) {
                    tableHTML += `<td class="empty-cell"></td>`;
                } else {
                    if (isClassQuery) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                        
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        const hasBM = dayLessons.some(l => l.subject.includes('BM'));
                        const hasChem = dayLessons.some(l => l.subject.includes('CHEM'));
                        const hasIct = dayLessons.some(l => l.subject.includes('ICT'));
                        
                        if (hasChem) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">X2<bR></span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">X3<br></span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasBM && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">X1<br></span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasMaup) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">MAUP</span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        } else {
                            const subjects = [...new Set(dayLessons.map(l => l.subject))].join('/');
                            const rooms = [...new Set(dayLessons.map(l => l.room))].join('/');
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:14px;">${subjects}<br></span>
                                    <span class="room" style="color:#555;font-size:10px;"> ${rooms}<br></span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        }
                    } else {
                        const firstLesson = dayLessons[0];
                        const isPE = firstLesson.subject === 'PE';
                        const isMaup = firstLesson.subject === 'MAUP';
                        
                        if (isPE) {
                            const allPELessons = allLessons.filter(
                                lesson => lesson.day === day && 
                                         lesson.period === parseInt(slot.period) &&
                                         lesson.subject === 'PE'
                            );
                            
                            const allClasses = [...new Set(allPELessons.map(l => l.class))].sort().join('/');
                            const otherTeachers = [...new Set(allPELessons.map(l => l.teacher))]
                                .filter(t => t !== firstLesson.teacher)
                                .sort()
                                .join('/');
                            
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:14px;">${allClasses} PE</span>
                                    ${otherTeachers ? `<span class="teacher" style="font-size:10px;">(${otherTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        } else if (isMaup) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:14px;">${firstLesson.class} MAUP</span>
                                </div>
                            </td>`;
                        } else {
                            const noCoTeacherSubjects = ['ARD', 'CPA', 'READ', 'MAUP'];
                            const shouldShowCoTeachers = !noCoTeacherSubjects.includes(firstLesson.subject);
                            let coTeachers = '';
                            
                            if (shouldShowCoTeachers) {
                                const sameLessons = allLessons.filter(
                                    lesson => lesson.day === day && 
                                             lesson.period === parseInt(slot.period) &&
                                             lesson.class === firstLesson.class &&
                                             lesson.subject === firstLesson.subject
                                );
                                
                                coTeachers = [...new Set(sameLessons.map(l => l.teacher))]
                                    .filter(t => t !== firstLesson.teacher)
                                    .sort()
                                    .join('/');
                            }

                            const groupedLessons = allLessons.filter(
                                lesson => lesson.day === day && 
                                         lesson.period === parseInt(slot.period) &&
                                         lesson.subject === firstLesson.subject &&
                                         lesson.teacher === firstLesson.teacher
                            );

                            let classDisplay = firstLesson.class;
                            if (groupedLessons.length > 1) {
                                const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                const simplifiedClasses = simplifyClassNames(allClasses);
                                classDisplay = simplifiedClasses;
                            }
                            
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:14px;">${classDisplay} ${firstLesson.subject}<br></span>
                                    <span class="room" style="color:#555;font-size:10px;"> ${firstLesson.room}<br></span>
                                    ${coTeachers ? `<span class="teacher" style="font-size:10px;">(${coTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        }
                    }
                }
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody>`;
        
        // Add subject information for Forms 4-6
        if (currentTitle.includes('班別') && /^[4-6][A-D]$/i.test(currentTitle.split(' ')[1])) {
            tableHTML += `
                <tfoot>
                    <tr><td colspan="7" style="text-align:left;padding:10px;background-color:#f5f5f5;">
                        <strong>選修科目組合:</strong><br>
                        <strong>Form 4:</strong><br>
                        X1: PHY<sub>(PHY)</sub>/BM<sub>(R204)</sub>/ACC<sub>(R203)</sub>/ERS<sub>(R401)</sub>/VAD<sub>(AD)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R204)</sub>/ECON<sub>(R203)</sub>/HMSC<sub>(R401)</sub><br>
                        X3: BIO3<sub>(BIO/R201/BIO)</sub>/ERS3<sub>(R401)</sub>/ICT<sub>(CR2)</sub>/MAM2<sub>(R204)</sub>/THS<sub>(PHY)</sub>/VAD3<sub>(DF)</sub><br><br>
                        <strong>Form 5:</strong><br>
                        X1: BIO<sub>(BIO/R314/BIO)</sub>/PHY<sub>(PHY)</sub>/BM<sub>(R413)</sub>/ACC<sub>(R414)</sub>/ERS<sub>(R412)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R412)</sub>/ECON<sub>(R414)</sub>/VAD<sub>(AD)</sub>/HMSC<sub>(R413)</sub><br>
                        X3: BIO3<sub>(BIO/R402/BIO)</sub>/ERS3<sub>(R412)</sub>/ICT<sub>(CR1)</sub>/MAM2<sub>(R413)</sub>/THS<sub>(R414)</sub>/VAD3<sub>(AD)</sub>
                        <strong>Form 6:</strong><br>
                        X1: BIO<sub>(BIO)</sub>/PHY<sub>(PHY)</sub>/BM<sub>(R403)</sub>/ACC<sub>(R404)</sub>/ERS<sub>(R411)</sub><br>
                        X2: CHEM<sub>(CHEM)</sub>/CHIS<sub>(R403)</sub>/ECON<sub>(R404)</sub>/VAD<sub>(AD)</sub>/HMS<sub>(R411)</sub>C<br>
                        X3: BIO3/ERS3<sub>(R411)</sub>/ICT<sub>(CR3)</sub>/MAM2<sub>(R403)</sub>/THS<sub>(R404)</sub>/VAD3<sub>(DF)</sub>
                    </td></tr>
                </tfoot>
            `;
        }
        
        timetableTable.innerHTML = tableHTML;
    }
    
    // 格式化課程顯示
    function formatLesson(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('BM') && (currentTitle.includes('班別') && /^[4][A-D]$/i.test(currentTitle.split(' ')[1]))) subject = 'X1';
            if (subject.includes('CHEM')) subject = 'X2';
            if (subject.includes('ICT')) subject = 'X3';
            return `<span class="subject" style="color:blue;font-size:12px;">${subject}</span> <span class="teacher" style="font-size:10px;">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') {
            return `<span class="subject" style="color:blue;font-size:10px;">${lesson.class} MAUP</span>`;
        }

        const groupedLessons = allLessons.filter(
            l => l.day === lesson.day && 
                 l.period === lesson.period && 
                 l.subject === lesson.subject && 
                 l.teacher === lesson.teacher
        );

        let classDisplay = lesson.class;
        if (groupedLessons.length > 1) {
            const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
            const simplifiedClasses = simplifyClassNames(allClasses);
            classDisplay = simplifiedClasses;
        }

        return `<span class="subject" style="color:blue;font-size:14px;">${classDisplay} ${lesson.subject}</span> <span class="room" style="color:#555;font-size:10px;">${lesson.room}</span>`;
    }


    // 自動載入 CSV 文件
    loadCSV();
});
