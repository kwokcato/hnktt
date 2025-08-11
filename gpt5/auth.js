import { SCHOOL_DOMAIN, CLIENT_ID, STUDENT_ACCOUNT_REGEX } from './config.js';

export function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function isTokenValid(token) {
    const p = decodeJwt(token);
    if (!p) return false;
    const issOk = p.iss === 'https://accounts.google.com' || p.iss === 'accounts.google.com';
    const audOk = p.aud === CLIENT_ID;
    const hdOk = p.hd === SCHOOL_DOMAIN;
    const notStudent = !STUDENT_ACCOUNT_REGEX.test(p.email || '');
    const notExpired = p.exp && Date.now() < (p.exp * 1000 - 60_000);
    return issOk && audOk && hdOk && notStudent && notExpired;
}

export function guard() {
    const token = sessionStorage.getItem('google_id_token');
    if (!token || !isTokenValid(token)) {
        sessionStorage.removeItem('google_id_token');
        window.top.location.href = 'index.html';
        throw new Error('not-authenticated');
    }
}