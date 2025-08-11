import { CSV_URL, CSV_CACHE_KEY, APP_VERSION } from './config.js';

function parseCSV(text) {
    const lines = text.replace(/^\uFEFF/, '').trim().split('\n');
    // 嘗試偵測是否有標題列
    const first = lines[0]?.split(',') || [];
    const startAt = (first.length >= 7 && /^\d{4}/.test(first[0])) ? 0 : 1;

    const out = [];
    for (let i = startAt; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 7) continue;
        out.push({
            year: parts[0].trim(),
            day: parseInt(parts[1], 10),
            period: parseInt(parts[2], 10),
            teacher: parts[3].trim(),
            class: parts[4].trim(),
            subject: parts[5].trim(),
            room: (parts[6] || '').trim()
        });
    }
    return out;
}

export async function getLessons(force = false) {
    if (!force) {
        const cached = sessionStorage.getItem(CSV_CACHE_KEY);
        if (cached) {
            try { return JSON.parse(cached); } catch {}
        }
    }
    const res = await fetch(`${CSV_URL}?v=${encodeURIComponent(APP_VERSION)}&t=${Date.now()}`);
    if (!res.ok) throw new Error(`載入 ${CSV_URL} 失敗：${res.status}`);
    const text = await res.text();
    const lessons = parseCSV(text);
    sessionStorage.setItem(CSV_CACHE_KEY, JSON.stringify(lessons));
    return lessons;
}

export async function getTeachers() {
    const lessons = await getLessons();
    return [...new Set(lessons.map(l => l.teacher))].sort();
}
export async function getClasses() {
    const lessons = await getLessons();
    return [...new Set(lessons.map(l => l.class).filter(c => /^[1-6][A-D]$/i.test(c)))].sort();
}
export async function getRooms() {
    const lessons = await getLessons();
    return [...new Set(lessons.map(l => l.room).filter(Boolean))].sort();
}