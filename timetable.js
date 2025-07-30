document.addEventListener('DOMContentLoaded', function() {
    const teacherNameInput = document.getElementById('teacherName');
    const teacherDropdown = document.getElementById('teacherDropdown');
    const classDropdown = document.getElementById('classDropdown');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const timetableTable = document.getElementById('timetable');
    const exportBtnGroup = document.getElementById('exportBtnGroup');
    
    let allLessons = []; // Store all lesson data
    let allTeachers = []; // Store all teacher names
    let allClasses = []; // Store all class names
    let currentTitle = ''; // Current timetable title
    let currentLessons = []; // Current displayed lessons
    let currentFontSize = 100; // Current font size percentage (default 100%)
    
    // Time slots definition
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

    // Cookie functions
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const cookieName = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        for(let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return "";
    }
    
    // Initialize export buttons
    function initExportButtons() {
        exportBtnGroup.innerHTML = `
            <button id="printBtn" class="export-btn">Print Timetable</button>
            <button id="pdfBtn" class="export-btn">Export PDF</button>
            <button id="excelBtn" class="export-btn">Export Excel</button>
            <button id="increaseFontBtn" class="export-btn">＋</button>
            <button id="decreaseFontBtn" class="export-btn">－</button>
        `;
        
        document.getElementById('printBtn').addEventListener('click', printTimetable);
        document.getElementById('pdfBtn').addEventListener('click', exportToPDF);
        document.getElementById('excelBtn').addEventListener('click', exportToExcel);
        document.getElementById('increaseFontBtn').addEventListener('click', increaseFontSize);
        document.getElementById('decreaseFontBtn').addEventListener('click', decreaseFontSize);

        // Load saved font size from cookie
        const savedFontSize = getCookie('timetableFontSize');
        if (savedFontSize) {
            currentFontSize = parseInt(savedFontSize);
        }
    }

    // Increase font size
    function increaseFontSize() {
        currentFontSize = Math.min(currentFontSize + 10, 150); // Max 150%
        setCookie('timetableFontSize', currentFontSize, 30); // Save for 30 days
        updateTimetableFontSize();
    }

    // Decrease font size
    function decreaseFontSize() {
        currentFontSize = Math.max(currentFontSize - 10, 70); // Min 70%
        setCookie('timetableFontSize', currentFontSize, 30); // Save for 30 days
        updateTimetableFontSize();
    }

    // Update timetable font size
    function updateTimetableFontSize() {
        if (!timetableTable) return;
        
        // Calculate actual font size (based on 11px default)
        const baseSize = 11;
        const newSize = baseSize * (currentFontSize / 100);
        
        // Update all text elements in the table
        const elements = timetableTable.querySelectorAll('td, th, span, div');
        elements.forEach(el => {
            if (el.classList.contains('time-col') || el.classList.contains('period-col')) {
                el.style.fontSize = `${newSize - 1}px`; // Slightly smaller for time/period
            } else if (el.classList.contains('subject')) {
                el.style.fontSize = `${newSize + 2}px`; // Slightly larger for subjects
            } else if (el.classList.contains('room') || el.classList.contains('teacher')) {
                el.style.fontSize = `${newSize - 1}px`; // Slightly smaller for room/teacher
            } else if (el.classList.contains('dismissal-time')) {
                el.style.fontSize = `${newSize - 1}px`; // Slightly smaller for dismissal time
            } else {
                el.style.fontSize = `${newSize}px`; // Normal size for other elements
            }
        });
    }

    // Print timetable
    function printTimetable() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('Please search for a timetable first');
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
                    ${generateTimetableHTML(currentLessons, currentTitle.includes('Class'))}
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
    
    // Export to PDF
    function exportToPDF() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('Please search for a timetable first');
            return;
        }
        
        // Using html2pdf.js library
        const element = document.createElement('div');
        element.style.width = '100%';
        element.innerHTML = `
            <h1 style="text-align:center;font-family:Arial;margin-bottom:10px;font-size:16px;">${currentTitle}</h1>
            <div style="font-size:10px;">
                ${generateTimetableHTML(currentLessons, currentTitle.includes('Class'))}
            </div>
        `;
        
        const opt = {
            margin: [5, 5, 2, 2],
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
        
        // Load html2pdf library
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

    // Backup PDF generation method
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
            alert('PDF generation failed, please try printing or contact administrator');
        }
    }
    
    // Generate timetable HTML (for PDF and print)
    function generateTimetableHTML(lessons, isClassQuery) {
        let tableHTML = `
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
                
                // Wednesday period 10 special handling
                if (day === 3 && slot.period === '10') {
                    if (dayLessons.length === 0) {
                        tableHTML += `<td style="background-color:#f9f9f9;">
                            <div class="dismissal-time" style="font-size:8px;">(Dismissal time 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div>${formatLessonForExport(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time" style="font-size:8px;">(Dismissal time 15:30)</div>
                        </td>`;
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
                                    <span style="color:blue;font-size:9px">X2</span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div>
                                    <span style="color:blue;font-size:9px">X3</span>
                                    <span style="font-size:8px">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasMaup) {
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
        return tableHTML;
    }

    // Simplify class names display
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
    
    // Export to Excel
    function exportToExcel() {
        if (!currentTitle || currentLessons.length === 0) {
            alert('Please search for a timetable first');
            return;
        }

        const wb = XLSX.utils.book_new();
        const rows = [];
        
        rows.push([currentTitle]);
        rows.push([]);
        
        const headerRow = ['Time', 'Period', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        rows.push(headerRow);
        
        const isClassQuery = currentTitle.includes('Class');
        
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
                            row.push('(Dismissal time 15:30)');
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
        XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
        XLSX.writeFile(wb, `${currentTitle}.xlsx`);
    }
    
    // Format lesson for export
    function formatLessonForExport(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('!CHEM')) subject = 'X2';
            if (subject.includes('!ICT')) subject = 'X3';
            return `<span style="color:blue;font-size:12px">${subject}</span> <span style="font-size:8px">(${lesson.teacher})</span>`;
        }
        if (lesson.subject === 'MAUP') {
            return `<span style="color:blue;font-size:9px">${lesson.class} MAUP</span>`;
        }
        return `<span style="color:blue;font-size:12px">${lesson.class} ${lesson.subject}</span> <span style="color:#555;font-size:8px">${lesson.room}</span>`;
    }

    // Search on Enter key
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

    // Teacher dropdown selection
    teacherDropdown.addEventListener('change', function() {
        const teacherName = teacherDropdown.value;
        if (teacherName) {
            teacherNameInput.value = teacherName;
            displayTimetable(teacherName);
            classDropdown.value = '';
        }
    });
    
    // Class dropdown selection
    classDropdown.addEventListener('change', function() {
        const className = classDropdown.value;
        if (className) {
            teacherNameInput.value = className;
            displayClassTimetable(className);
            teacherDropdown.value = '';
        }
    });
    
    // Check if query is for a class
    function isClassQuery(query) {
        return /^[1-6][A-D]$/i.test(query);
    }
    
    // Load CSV file
    function loadCSV() {
        fetch('tt.csv?' + new Date().getTime())
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
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
                resultDiv.innerHTML = '<p>Timetable data loaded, please enter teacher name or class (e.g. 1A)</p>';
                initExportButtons();
            })
            .catch(error => {
                console.error('Error loading CSV file:', error);
                loadingDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
                setTimeout(loadCSV, 1000);
            });
    }
    
    // Populate dropdowns
    function populateDropdowns() {
        teacherDropdown.innerHTML = '<option value="">Select teacher...</option>';
        allTeachers.forEach(teacher => {
            teacherDropdown.innerHTML += `<option value="${teacher}">${teacher}</option>`;
        });
        
        classDropdown.innerHTML = '<option value="">Select class...</option>';
        allClasses.forEach(cls => {
            classDropdown.innerHTML += `<option value="${cls}">${cls}</option>`;
        });
    }
    
    // Parse CSV
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
    
    // Display teacher timetable
    function displayTimetable(teacherName) {
        currentLessons = allLessons.filter(item => 
            item.teacher.toUpperCase() === teacherName.toUpperCase()
        );
        
        if (currentLessons.length === 0) {
            resultDiv.innerHTML = `<p>No timetable found for teacher ${teacherName}</p>`;
            timetableTable.innerHTML = '';
            currentTitle = '';
            return;
        }
        
        currentTitle = `${teacherName}'s Timetable`;
        resultDiv.innerHTML = `<h3 style="margin:0;">${currentTitle}</h3>`;
        renderTimetable(currentLessons);
    }
    
    // Display class timetable
    function displayClassTimetable(className) {
        currentLessons = allLessons.filter(item => 
            item.class.toUpperCase() === className.toUpperCase()
        );
        
        if (currentLessons.length === 0) {
            resultDiv.innerHTML = `<p>No timetable found for class ${className}</p>`;
            timetableTable.innerHTML = '';
            currentTitle = '';
            return;
        }
        
        currentTitle = `Class ${className} Timetable`;
        resultDiv.innerHTML = `<h3 style="margin:0;">${currentTitle}</h3>`;
        renderTimetable(currentLessons, true);
    }
    
    // Render timetable (shared function)
    function renderTimetable(lessons, isClassQuery = false) {
        // Load saved font size from cookie, default to 100%
        const savedFontSize = getCookie('timetableFontSize');
        currentFontSize = savedFontSize ? parseInt(savedFontSize) : 100;
        
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
                            <div class="dismissal-time" style="font-size:10px;">(Dismissal time 15:30)</div>
                        </td>`;
                    } else {
                        const firstLesson = dayLessons[0];
                        tableHTML += `<td>
                            <div class="main-lesson">${formatLesson(firstLesson, isClassQuery)}</div>
                            <div class="dismissal-time" style="font-size:10px;">(Dismissal time 15:30)</div>
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
                        const hasChem = dayLessons.some(l => l.subject.includes('!CHEM'));
                        const hasIct = dayLessons.some(l => l.subject.includes('!ICT'));
                        
                        if (hasChem) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">X2</span>
                                    <span class="teacher" style="font-size:10px;">(${teachers})</span>
                                </div>
                            </td>`;
                        } else if (hasIct) {
                            tableHTML += `<td>
                                <div class="main-lesson">
                                    <span class="subject" style="color:blue;font-size:11px;">X3</span>
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
        timetableTable.innerHTML = tableHTML;
        updateTimetableFontSize(); // Apply the correct font size on initial render
    }
    
    // Format lesson display
    function formatLesson(lesson, isClassQuery) {
        if (isClassQuery) {
            let subject = lesson.subject;
            if (subject.includes('!CHEM')) subject = 'X2';
            if (subject.includes('!ICT')) subject = 'X3';
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

    // Automatically load CSV file
    loadCSV();
});
