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
    
    // 時間段定義 (true > 顯示 label, false > 不顯示 label)
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
    
    // 匯出PDF
    function exportToPDF() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('請先查詢時間表');
            return;
        }
        
        // 使用html2pdf.js庫
        const element = document.createElement('div');
        element.style.width = '100%';
        element.innerHTML = `
            <h1 style="text-align:center;font-family:Arial;margin-bottom:20px;">${currentTitle}</h1>
            ${generateTimetableHTML(currentLessons, currentTitle.includes('班別'))}
        `;
        
        const opt = {
            margin: [5, 5, 5, 5], // 上下左右邊距
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
                format: 'a4',  // a3
                orientation: 'landscape',
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
            // 添加處理程序確保所有內容都已渲染
            setTimeout(() => {
                html2pdf().set(opt).from(element).save()
                    .then(() => {
                        console.log('PDF generated successfully');
                    })
                    .catch(err => {
                        console.error('PDF generation error:', err);
                        // 嘗試備用方法
                        backupPDFGeneration(element, opt);
                    });
            }, 500);
        };
        document.head.appendChild(script);
    }

    // 備用PDF生成方法
    function backupPDFGeneration(element, opt) {
        // 嘗試使用不同的設置
        const backupOpt = {
            ...opt,
            html2canvas: {
                ...opt.html2canvas,
                scale: 1, //1.5
                windowHeight: document.getElementById('timetable').scrollHeight + 500
            },
            jsPDF: {
                ...opt.jsPDF,
                format: 'a4' // 使用更大的紙張尺寸
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
            <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                <thead>
                    <tr>
                        <th style="width:100px;background-color:#3498db;color:white;font-size:0.8em;"">時間</th>
                        <th style="width:50px;background-color:#3498db;color:white;font-size:0.8em;">節數</th>
                        <th style="background-color:#3498db;color:white;font-size:0.8em;">星期一</th>
                        <th style="background-color:#3498db;color:white;font-size:0.8em;">星期二</th>
                        <th style="background-color:#3498db;color:white;font-size:0.8em;">星期三</th>
                        <th style="background-color:#3498db;color:white;font-size:0.8em;">星期四</th>
                        <th style="background-color:#3498db;color:white;font-size:0.8em;">星期五</th>
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
                
                // 星期三第10節特殊處理
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td style="background-color:#f9f9f9;">
                            <div class="dismissal-time">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div>${formatLessonForExport(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time">(放學時間 15:30)</div>
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
                                    <span style="color:blue;font-size:0.8em"">${subjects}<br></span>
                                    <span style="color:#555;font-size:0.7em"> ${rooms}<br></span>
                                    <span style="font-size:0.8em">(${teachers})</span>
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
                                    <span style="color:blue">${allClasses} PE</span>
                                    ${otherTeachers ? `<span style="font-size:0.8em">(${otherTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        } else if (isMaup) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue">${firstLesson.class} MAUP</span>
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
                                // 合併班別顯示
                                const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                // 簡化顯示，例如 5A/B/C/D
                                const simplifiedClasses = simplifyClassNames(allClasses);
                                classDisplay = simplifiedClasses;
                            }
                            
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue";font-size:0.8em">${classDisplay} ${firstLesson.subject}<br></span>
                                    <span style="color:#555;font-size:0.7em"> ${firstLesson.room}<br></span>
                                    ${coTeachers ? `<span style="font-size:0.8em">(${coTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        }
                    }
                }
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody></table>`;
        return tableHTML;
    }

    // 簡化班別名稱顯示 (例如將 ['5A', '5B', '5C', '5D'] 轉換為 '5A/B/C/D')
    function simplifyClassNames(classNames) {
        if (classNames.length <= 1) return classNames[0];
        
        // 按年級和班別排序
        classNames.sort();
        
        const gradeMap = {};
        
        // 按年級分組
        classNames.forEach(className => {
            const grade = className[0];
            const classLetter = className[1];
            if (!gradeMap[grade]) {
                gradeMap[grade] = [];
            }
            gradeMap[grade].push(classLetter);
        });
        
        // 生成簡化格式
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

        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 準備數據
        const rows = [];
        
        // 添加標題行
        rows.push([currentTitle]);
        rows.push([]);
        
        // 添加表頭
        const headerRow = ['時間', '節數', '星期一', '星期二', '星期三', '星期四', '星期五'];
        rows.push(headerRow);
        
        // 判斷是否是班別查詢
        const isClassQuery = currentTitle.includes('班別');
        
        // 添加時間表數據
        timeSlots.forEach(slot => {
            const row = [];
            row.push(`${slot.time}-${slot.endTime}`);
            row.push(slot.period || '');
            
            if (slot.isBreak) {
                // 處理休息時間
                for (let day = 1; day <= 5; day++) {
                    row.push(slot.label);
                }
            } else {
                for (let day = 1; day <= 5; day++) {
                    const dayLessons = currentLessons.filter(
                        lesson => lesson.day === day && lesson.period === parseInt(slot.period)
                    );
                    
                    if (dayLessons.length === 0) {
                        // 星期三第10節特殊處理
                        if (day === 3 && slot.period === '10') {
                            row.push('(放學時間 15:30)');
                        } else {
                            row.push('');
                        }
                    } else {
                        // 處理班別查詢的多科目情況
                        if (isClassQuery) {
                            const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                            
                            // 檢查是否有MAUP科目
                            const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                            // 檢查是否有CHEM或ICT科目
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
                            // 教師查詢
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

                                // 檢查是否有合併班別情況
                                const groupedLessons = allLessons.filter(
                                    lesson => lesson.day === day && 
                                             lesson.period === parseInt(slot.period) &&
                                             lesson.subject === firstLesson.subject &&
                                             lesson.teacher === firstLesson.teacher
                                );

                                let classDisplay = firstLesson.class;
                                if (groupedLessons.length > 1) {
                                    // 合併班別顯示
                                    const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                    // 簡化顯示，例如 5A/B/C/D
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
        
        // 創建工作表
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '時間表');
        
        // 導出Excel文件
        XLSX.writeFile(wb, `${currentTitle}.xlsx`);
    }
    
    // 格式化課程顯示 (用於導出)
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
            classDropdown.value = ''; // 清除班別選擇
        }
    });
    
    // 班別下拉選單選擇
    classDropdown.addEventListener('change', function() {
        const className = classDropdown.value;
        if (className) {
            teacherNameInput.value = className;
            displayClassTimetable(className);
            teacherDropdown.value = ''; // 清除教師選擇
        }
    });
    
    // 判斷是否為班別查詢
    function isClassQuery(query) {
        return /^[1-6][A-D]$/i.test(query); // 匹配1A-6D格式
    }
    
    // 載入 CSV 文件
    function loadCSV() {
        //fetch('https://drive.google.com/uc?export=download&id=1f50DbgOa6iAiIu9iq0RTu5tplG_I6snV');
        // 添加隨機參數防止緩存
        fetch('tt.csv?' + new Date().getTime())
        //fetch('https://drive.google.com/uc?export=download&id=1f50DbgOa6iAiIu9iq0RTu5tplG_I6snV?' + new Date().getTime())
            .then(response => {
                if (!response.ok) throw new Error('網絡響應不正常');
                return response.text();
            })
            .then(data => {
                allLessons = parseCSV(data);
                // 提取所有教師名單並去重
                allTeachers = [...new Set(allLessons.map(item => item.teacher.trim()))].sort();
                // 提取1-6年級班別名單並去重
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
                // 重試機制
                setTimeout(loadCSV, 1000);
            });
    }
    
    // 填充下拉選單
    function populateDropdowns() {
        // 填充教師下拉選單
        teacherDropdown.innerHTML = '<option value="">選擇教師...</option>';
        allTeachers.forEach(teacher => {
            teacherDropdown.innerHTML += `<option value="${teacher}">${teacher}</option>`;
        });
        
        // 填充班別下拉選單 (只顯示1-6年級班別)
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
        // 過濾該教師的課程
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
        // 過濾該班別的課程
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
        renderTimetable(currentLessons, true); // 傳入true表示是班別查詢
    }
    
    // 渲染時間表 (共用函數)
    function renderTimetable(lessons, isClassQuery = false) {
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
                
                // 星期三第10節特殊處理
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td class="empty-cell">
                            <div class="dismissal-time">(放學時間 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div class="main-lesson">${formatLesson(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time">(放學時間 15:30)</div>
                        </td>`;
                    }
                    continue;
                }
                
                if (dayLessons.length === 0) {
                    tableHTML += `<td class="empty-cell"></td>`;
                } else {
                    // 處理班別查詢的多科目情況
                    if (isClassQuery) {
                        const teachers = [...new Set(dayLessons.map(l => l.teacher))].join('/');
                        
                        // 檢查是否有MAUP科目
                        const hasMaup = dayLessons.some(l => l.subject === 'MAUP');
                        // 檢查是否有CHEM或ICT科目
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
                                    <span class="subject" style="color:blue">${subjects}<br></span>
                                    <span class="room" style="color:#555;font-size:0.7em"> ${rooms}<br></span>
                                    <span class="teacher" style="font-size:0.8em">(${teachers})</span>
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
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">${allClasses} PE</span>
                                    ${otherTeachers ? `<span class="teacher" style="font-size:0.8em">(${otherTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        } else if (isMaup) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">${firstLesson.class} MAUP</span>
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
                                // 合併班別顯示
                                const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
                                // 簡化顯示，例如 5A/B/C/D
                                const simplifiedClasses = simplifyClassNames(allClasses);
                                classDisplay = simplifiedClasses;
                            }
                            
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue">${classDisplay} ${firstLesson.subject}<br></span>
                                    <span class="room" style="color:#555;font-size:0.7em"> ${firstLesson.room}<br></span>
                                    ${coTeachers ? `<span class="teacher" style="font-size:0.8em">(${coTeachers})</span>` : ''}
                                </div>
                            </td>`;
                        }
                    }
                }
            }
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody>`;
        timetableTable.innerHTML = tableHTML;
    }
    
    // 格式化課程顯示
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

        // 檢查是否有合併班別情況
        const groupedLessons = allLessons.filter(
            l => l.day === lesson.day && 
                 l.period === lesson.period && 
                 l.subject === lesson.subject && 
                 l.teacher === lesson.teacher
        );

        let classDisplay = lesson.class;
        if (groupedLessons.length > 1) {
            // 合併班別顯示
            const allClasses = [...new Set(groupedLessons.map(l => l.class))].sort();
            // 簡化顯示，例如 5A/B/C/D
            const simplifiedClasses = simplifyClassNames(allClasses);
            classDisplay = simplifiedClasses;
        }

        return `<span class="subject" style="color:blue">${classDisplay} ${lesson.subject}</span> <span class="room" style="color:#555;font-size:0.7em">${lesson.room}</span>`;
    }

    // 自動載入 CSV 文件
    loadCSV();
});
