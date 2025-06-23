// 在文件頂部添加這些變量
let currentFontSize = 100; // 預設100%
const fontSizeOptions = [60, 100, 150]; // 可選的字體大小

// 替換顯示時間表的標題
function updateTimetableTitle(title) {
    document.getElementById('timetableTitle').innerText = title;
}

// 添加無障礙控制按鈕
function addAccessibilityControls() {
    const resultDiv = document.getElementById('result');
    if (!resultDiv.querySelector('.accessibility-controls')) {
        const controlsHTML = `
            <div class="accessibility-controls">
                <button class="accessibility-btn ${currentFontSize === 60 ? 'active' : ''}" 
                        data-size="60">60%</button>
                <button class="accessibility-btn ${currentFontSize === 100 ? 'active' : ''}" 
                        data-size="100">100%</button>
                <button class="accessibility-btn ${currentFontSize === 150 ? 'active' : ''}" 
                        data-size="150">150%</button>
            </div>
        `;
        
        // 將標題和按鈕包裝在一個容器中
        const titleContainer = document.createElement('div');
        titleContainer.className = 'title-container';
        titleContainer.innerHTML = `
            <h2>${currentTitle}</h2>
            ${controlsHTML}
        `;
        
        // 替換原來的resultDiv內容
        resultDiv.innerHTML = '';
        resultDiv.appendChild(titleContainer);
        
        // 添加事件監聽器
        document.querySelectorAll('.accessibility-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const newSize = parseInt(this.dataset.size);
                changeFontSize(newSize);
                
                // 更新按鈕活動狀態
                document.querySelectorAll('.accessibility-btn').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.size) === newSize);
                });
            });
        });
    }
}

// 改變字體大小
function changeFontSize(size) {
    currentFontSize = size;
    document.documentElement.style.setProperty('--font-size-base', `${size}%`);
    
    // 根據字體大小調整表格寬度
    let tableWidth = '100%';
    if (size === 60) tableWidth = '80%';
    if (size === 150) tableWidth = '120%';
    document.documentElement.style.setProperty('--table-width', tableWidth);
    
    // 保存用戶偏好到localStorage
    localStorage.setItem('timetableFontSize', size.toString());
}

// 在DOMContentLoaded事件處理函數中添加以下代碼
document.addEventListener('DOMContentLoaded', function() {
    // ... 原有的代碼 ...
    
    // 從localStorage加載用戶的字體大小偏好
    const savedFontSize = localStorage.getItem('timetableFontSize');
    if (savedFontSize) {
        changeFontSize(parseInt(savedFontSize));
    }
    
    // ... 其餘的代碼 ...
});

// 修改displayTimetable和displayClassTimetable函數
function displayTimetable(teacherName) {
    // 過濾該教師的課程
    currentLessons = allLessons.filter(item => 
        item.teacher.toUpperCase() === teacherName.toUpperCase()
    );
    currentTitle = `${teacherName} 的時間表`;
    updateTimetableTitle(currentTitle);
    if (currentLessons.length === 0) {
        resultDiv.innerHTML = `<p>找不到教師 ${teacherName} 的時間表</p>`;
        timetableTable.innerHTML = '';
        currentTitle = '';
        return;
    }
    
    currentTitle = `${teacherName} 的時間表`;
    resultDiv.innerHTML = ''; // 清空結果區域
    addAccessibilityControls(); // 添加無障礙控制按鈕
    renderTimetable(currentLessons);
}

function displayClassTimetable(className) {
    // 過濾該班別的課程
    currentLessons = allLessons.filter(item => 
        item.class.toUpperCase() === className.toUpperCase()
    );
    currentTitle = `班別 ${className} 的時間表`;
    updateTimetableTitle(currentTitle);
    if (currentLessons.length === 0) {
        resultDiv.innerHTML = `<p>找不到班別 ${className} 的時間表</p>`;
        timetableTable.innerHTML = '';
        currentTitle = '';
        return;
    }
    
    currentTitle = `班別 ${className} 的時間表`;
    resultDiv.innerHTML = ''; // 清空結果區域
    addAccessibilityControls(); // 添加無障礙控制按鈕
    renderTimetable(currentLessons, true);
}
