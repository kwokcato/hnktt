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

    // Rest of the code remains exactly the same...
    // [All other functions and code stay unchanged]
    
    // 自動載入 CSV 文件
    loadCSV();
});