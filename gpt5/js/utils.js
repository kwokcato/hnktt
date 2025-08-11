export const weekdayNames = ['', '星期一', '星期二', '星期三', '星期四', '星期五'];
export const isWedPeriod10 = (day, period) => Number(day) === 3 && Number(period) === 10;

export const unique = arr => [...new Set(arr)];
export const groupBy = (arr, keyFn) => {
    const map = new Map();
    arr.forEach(item => {
        const k = keyFn(item);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(item);
    });
    return map;
};

export function formatPeriods(periods) {
    if (!periods || periods.length === 0) return '';
    const sorted = [...periods].sort((a,b)=>a-b);
    const out = [];
    let start = sorted[0], prev = sorted[0];
    for (let i=1;i<sorted.length;i++) {
        if (sorted[i] === prev + 1) {
            prev = sorted[i];
        } else {
            out.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = prev = sorted[i];
        }
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    return out.join(', ');
}

// 合班簡化顯示：4A/4B/4C/4D -> S4；其它維持原狀
export function simplifyClassNames(classNames) {
    const list = Array.isArray(classNames) ? classNames : [classNames];
    const classes = unique(list.filter(Boolean)).sort();
    const gradeMap = {};
    classes.forEach(cls => {
        const m = cls.match(/^([1-6])([A-D])$/i);
        if (m) {
            const g = m[1];
            gradeMap[g] = gradeMap[g] || [];
            gradeMap[g].push(m[2].toUpperCase());
        }
    });
    const result = [];
    Object.keys(gradeMap).sort().forEach(g => {
        const letters = unique(gradeMap[g]).sort();
        if (['A','B','C','D'].every(l => letters.includes(l))) {
            result.push(`S${g}`);
        } else {
            result.push(`${g}${letters.join('/')}`);
        }
    });
    // 也保留非標準班名
    classes.forEach(cls => {
        if (!/^([1-6])[A-D]$/i.test(cls)) result.push(cls);
    });
    return result.join(' ');
}