export function initRefreshButton(selector = '.refresh-btn') {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.title = btn.title || '重整頁面';
    btn.addEventListener('click', () => {
        btn.style.transform = 'scale(1.2) rotate(360deg)';
        btn.style.backgroundColor = 'rgba(150,150,150,0.8)';
        setTimeout(() => location.reload(), 600);
    });
}

export function applyFontPercent(pct = 100) {
    document.documentElement.style.setProperty('--tt-font-scale', String(pct));
}
export function loadFontPercent() {
    const v = localStorage.getItem('tt.fontScale');
    return v ? parseInt(v, 10) : 100;
}
export function saveFontPercent(pct) {
    localStorage.setItem('tt.fontScale', String(pct));
}

/* 簡易狀態顯示 */
export function showStatus(message, type = 'loading', elementId) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (!el) return;
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
}
export function hide(elOrId) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.style.display = 'none';
}