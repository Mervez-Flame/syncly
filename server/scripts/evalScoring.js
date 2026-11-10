// server/scripts/evalScoring.js
// Pure scoring logic for Tier 1 (task detection) and Tier 2 (field extraction).
// No database or Gmail calls in here, so it is easy to unit test with Jest.

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos is UTC+1 all year

/** UTC instant -> { date: 'YYYY-MM-DD', time: 'HH:MM' } in Lagos time */
function toLagos(date) {
    const iso = new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function addDays(dateStr, n) {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function weekdayOf(dateStr) {
    return new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0 = Sunday
}

/** First given weekday strictly after dateStr */
function nextWeekday(dateStr, weekday) {
    let n = (weekday - weekdayOf(dateStr) + 7) % 7;
    if (n === 0) n = 7;
    return addDays(dateStr, n);
}

/**
 * Some corpus emails use relative dates ("tomorrow", "Monday", "today").
 * The ground truth was written for the day the corpus was drafted, but the
 * system reads them relative to the day each email was actually received.
 * So for those emails the expected date is recomputed from the received date.
 */
function resolveExpectedDates(gt, receivedDateLagos) {
    if (!gt.expectedDate) return { primary: null, alternates: [] };
    const rel = gt.relative;
    if (!rel || !receivedDateLagos) return { primary: gt.expectedDate, alternates: [] };

    if (rel.type === 'offset') {
        return { primary: addDays(receivedDateLagos, rel.days), alternates: [] };
    }
    if (rel.type === 'weekday') {
        const first = nextWeekday(receivedDateLagos, rel.weekday);
        const alternates = [];
        if (weekdayOf(receivedDateLagos) === rel.weekday) alternates.push(receivedDateLagos);
        if (rel.allowFollowingWeek) alternates.push(addDays(first, 7));
        return { primary: first, alternates };
    }
    return { primary: gt.expectedDate, alternates: [] };
}

// ---------- Tier 2 field scoring ----------
// Each scorer returns { verdict: 'ok' | 'wrong' | 'review', note }

function normTitle(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Title: only identical wording is auto-accepted. Anything else needs a human (rule 1 is about meaning). */
function scoreTitle(expected, got) {
    const a = normTitle(expected);
    const b = normTitle(got);
    if (!b) return { verdict: 'wrong', note: 'empty title' };
    if (a === b) return { verdict: 'ok', note: '' };
    const ta = new Set(a.split(' '));
    const tb = new Set(b.split(' '));
    const shared = [...ta].filter(w => tb.has(w)).length;
    const overlap = Math.round((shared / new Set([...ta, ...tb]).size) * 100);
    return { verdict: 'review', note: `wording differs (${overlap}% word overlap), decide if the meaning is the same` };
}

function normCode(c) {
    return c ? String(c).replace(/\s+/g, '').toUpperCase() : null;
}

function scoreCourseCode(expected, got) {
    const e = normCode(expected);
    const g = normCode(got);
    if (!e && !g) return { verdict: 'ok', note: '' };
    if (!e && g) return { verdict: 'wrong', note: `hallucination: returned "${got}" where none applies` };
    if (e && !g) return { verdict: 'wrong', note: 'omission: returned null' };
    return e === g ? { verdict: 'ok', note: '' } : { verdict: 'wrong', note: `expected ${expected}, got ${got}` };
}

function scoreDueDate(gt, sys, receivedDateLagos) {
    if (!gt.expectedDate) {
        return sys.dueDate
            ? { verdict: 'wrong', note: 'returned a date where none exists', expected: 'none', got: '' }
            : { verdict: 'ok', note: '', expected: 'none', got: 'none' };
    }

    const { primary, alternates } = resolveExpectedDates(gt, receivedDateLagos);
    const showTime = gt.statedTime || gt.midnight;
    const expected = `${primary}${showTime ? ' ' + gt.expectedTime : ' (date only)'}`;

    if (!sys.dueDate) {
        return { verdict: 'wrong', note: 'no date returned (omission)', expected, got: 'null' };
    }

    const got = toLagos(new Date(sys.dueDate));
    const gotLabel = sys.hasDueTime ? `${got.date} ${got.time}` : `${got.date} (date only)`;

    // "midnight" can be written as 23:59 on the day or 00:00 on the next day
    let gotDate = got.date;
    let rolledOver = false;
    if (gt.midnight && sys.hasDueTime && got.time === '00:00') {
        gotDate = addDays(got.date, -1);
        rolledOver = true;
    }

    const isPrimary = gotDate === primary;
    const isAlternate = alternates.includes(gotDate);
    if (!isPrimary && !isAlternate) {
        return { verdict: 'wrong', note: 'date differs', expected, got: gotLabel };
    }

    let verdict;
    let note = '';
    if (gt.midnight) {
        if (sys.hasDueTime && (got.time === '23:59' || rolledOver)) verdict = 'ok';
        else if (!sys.hasDueTime) { verdict = 'review'; note = 'a midnight deadline was returned as date-only'; }
        else { verdict = 'wrong'; note = `time ${got.time} where midnight was stated`; }
    } else if (gt.statedTime) {
        if (sys.hasDueTime && got.time === gt.expectedTime) verdict = 'ok';
        else {
            verdict = 'wrong';
            note = sys.hasDueTime ? `time ${got.time}, expected ${gt.expectedTime}` : `no time returned, expected ${gt.expectedTime}`;
        }
    } else {
        verdict = 'ok';
        if (sys.hasDueTime) note = `a time (${got.time}) was returned although none was stated`;
    }

    if (isAlternate && !isPrimary && verdict === 'ok') {
        verdict = 'review';
        note = (note + ' ambiguous relative date, matched the alternative reading').trim();
    }
    return { verdict, note, expected, got: gotLabel };
}

/**
 * Optional manual decisions, e.g. { "TEST-005": { "title": "ok", "dueDate": "wrong" } }.
 * Used to settle the 'review' verdicts after you look at them.
 */
function applyOverride(result, override) {
    if (override === 'ok' || override === 'wrong') {
        return { ...result, verdict: override, note: `${result.note} [decided manually: ${override}]`.trim() };
    }
    return result;
}

// ---------- Tier 1 + report ----------

/**
 * rows: [{ id, isTask, detection, fields? }]
 *   detection: 'extracted' | 'no_task' | 'invalid' | 'not_processed' | 'not_found' | 'inconsistent'
 *   fields (only for extracted tasks): { title, dueDate, courseCode } each { verdict }
 * 'invalid' counts as "system returned no task" because nothing reaches the student.
 */
function buildReport(rows) {
    const counted = rows.filter(r => ['extracted', 'no_task', 'invalid'].includes(r.detection));
    const excluded = rows.filter(r => !['extracted', 'no_task', 'invalid'].includes(r.detection));

    const said = r => r.detection === 'extracted';
    const TP = counted.filter(r => r.isTask && said(r));
    const FN = counted.filter(r => r.isTask && !said(r));
    const FP = counted.filter(r => !r.isTask && said(r));
    const TN = counted.filter(r => !r.isTask && !said(r));

    const div = (a, b) => (b === 0 ? null : a / b);
    const precision = div(TP.length, TP.length + FP.length);
    const recall = div(TP.length, TP.length + FN.length);
    const f1 = precision === null || recall === null || precision + recall === 0
        ? null
        : (2 * precision * recall) / (precision + recall);

    const fieldNames = ['title', 'dueDate', 'courseCode'];
    const tier2 = {};
    for (const f of fieldNames) {
        tier2[f] = {
            correct: TP.filter(r => r.fields[f].verdict === 'ok').length,
            pendingReview: TP.filter(r => r.fields[f].verdict === 'review').length
        };
    }
    const composite = TP.filter(r => fieldNames.every(f => r.fields[f].verdict === 'ok')).length;
    const compositePending = TP.filter(r =>
        fieldNames.every(f => r.fields[f].verdict !== 'wrong') &&
        fieldNames.some(f => r.fields[f].verdict === 'review')
    ).length;
    const allFieldsCorrect = fieldNames.reduce((s, f) => s + tier2[f].correct, 0);

    return {
        matrix: { TP: TP.length, FN: FN.length, FP: FP.length, TN: TN.length },
        lists: {
            TP: TP.map(r => r.id), FN: FN.map(r => r.id), FP: FP.map(r => r.id), TN: TN.map(r => r.id),
            excluded: excluded.map(r => `${r.id} (${r.detection})`)
        },
        metrics: { precision, recall, f1 },
        tier2: {
            tp: TP.length,
            ...tier2,
            composite,
            compositePending,
            overallFieldAccuracy: div(allFieldsCorrect, 3 * TP.length)
        }
    };
}

module.exports = {
    toLagos, addDays, nextWeekday, resolveExpectedDates,
    scoreTitle, scoreCourseCode, scoreDueDate, applyOverride, buildReport
};