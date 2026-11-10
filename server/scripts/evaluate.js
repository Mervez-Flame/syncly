// server/scripts/evaluate.js
// Run AFTER testPipeline.js has finished:  node scripts/evaluate.js
// Reads what the pipeline saved (MongoDB) and the subjects/dates from the test Gmail inbox,
// scores everything against groundTruth.json and prints the numbers for Tables 4.13 to 4.16.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { google } = require('googleapis');

const connectDB = require('../config/db');
const Task = require('../models/Task');
const ProcessedEmail = require('../models/ProcessedEmail');
const { getAuthedClient } = require('../utils/googleClient');
const groundTruth = require('./groundTruth.json');
const {
    toLagos, scoreTitle, scoreCourseCode, scoreDueDate, applyOverride, buildReport
} = require('./evalScoring');

const TEST_USER_ID = process.env.TEST_USER_ID || '6aeb4661e1b0ce85b8e224ad';
const OVERRIDES_PATH = path.join(__dirname, 'evalOverrides.json'); // optional, see bottom of this file
const OUT_JSON = path.join(__dirname, 'evalResults.json');
const OUT_CSV = path.join(__dirname, 'evalResults.csv');

const normSubject = s =>
    (s || '').toLowerCase().replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim();

const pct = x => (x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function getMeta(gmail, messageId) {
    try {
        const res = await gmail.users.messages.get({
            userId: 'me', id: messageId, format: 'metadata', metadataHeaders: ['Subject']
        });
        const header = (res.data.payload?.headers || []).find(h => h.name.toLowerCase() === 'subject');
        return { subject: header?.value || '', receivedAt: new Date(Number(res.data.internalDate)) };
    } catch (err) {
        console.warn(`  could not read Gmail message ${messageId}: ${err.message}`);
        return null;
    }
}

async function main() {
    await connectDB();
    try {
        const overrides = fs.existsSync(OVERRIDES_PATH) ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8')) : {};

        const processed = await ProcessedEmail.find({ userId: TEST_USER_ID }).lean();
        const tasks = await Task.find({ userId: TEST_USER_ID, source: 'ai' }).lean();
        const peById = new Map(processed.map(p => [p.gmailMessageId, p]));
        const taskById = new Map(tasks.map(t => [t.gmailMessageId, t]));
        const allIds = [...new Set([...peById.keys(), ...taskById.keys()])];

        console.log(`Found ${processed.length} processed-email records and ${tasks.length} AI tasks. Reading subjects from Gmail...`);
        const auth = await getAuthedClient(TEST_USER_ID);
        const gmail = google.gmail({ version: 'v1', auth });

        const bySubject = new Map(); // normalised subject -> { messageId, receivedAt }
        for (const id of allIds) {
            const meta = await getMeta(gmail, id);
            if (meta) bySubject.set(normSubject(meta.subject), { messageId: id, receivedAt: meta.receivedAt });
        }

        const rows = [];
        for (const gt of groundTruth) {
            const hit = bySubject.get(normSubject(gt.subject));
            const row = { id: gt.id, subject: gt.subject, category: gt.category, isTask: gt.isTask, note: gt.note || '' };

            if (!hit) { row.detection = 'not_found'; rows.push(row); continue; }

            const task = taskById.get(hit.messageId);
            const pe = peById.get(hit.messageId);
            row.messageId = hit.messageId;
            row.receivedAt = hit.receivedAt.toISOString();
            row.outcome = pe?.outcome || (task ? task.status : null);

            if (task) row.detection = 'extracted';
            else if (pe?.outcome === 'no_task') row.detection = 'no_task';
            else if (pe?.outcome === 'invalid') row.detection = 'invalid';
            else if (pe) row.detection = 'inconsistent'; // processed as a task but the task record is gone
            else row.detection = 'not_processed';

            if (row.detection === 'extracted' && gt.isTask) {
                const receivedLagos = toLagos(hit.receivedAt).date;
                const ov = overrides[gt.id] || {};
                const title = applyOverride(scoreTitle(gt.expectedTitle, task.title), ov.title);
                const dueDate = applyOverride(
                    scoreDueDate(gt, { dueDate: task.dueDate, hasDueTime: task.hasDueTime }, receivedLagos), ov.dueDate);
                const courseCode = applyOverride(scoreCourseCode(gt.expectedCourseCode, task.courseCode), ov.courseCode);
                row.fields = { title, dueDate, courseCode };
                row.system = { title: task.title, courseCode: task.courseCode || null };
                row.expected = { title: gt.expectedTitle, courseCode: gt.expectedCourseCode };
            } else if (row.detection === 'extracted') {
                row.system = { title: task.title, courseCode: task.courseCode || null };
            }
            rows.push(row);
        }

        const report = buildReport(rows);
        const { matrix, metrics, tier2, lists } = report;

        // ---------- print ----------
        console.log('\n=== Table 4.13: Confusion matrix ===');
        console.table({
            'Ground truth: task (35)': { 'System extracted a task': `TP = ${matrix.TP}`, 'System returned no task': `FN = ${matrix.FN}` },
            'Ground truth: non-task (15)': { 'System extracted a task': `FP = ${matrix.FP}`, 'System returned no task': `TN = ${matrix.TN}` }
        });

        console.log('=== Table 4.14: Task detection metrics ===');
        const meets = x => (x === null ? 'n/a' : x >= 0.8 ? 'Yes' : 'No');
        console.table([
            { Metric: 'Precision', Result: pct(metrics.precision), Benchmark: '0.80', 'Met?': meets(metrics.precision) },
            { Metric: 'Recall', Result: pct(metrics.recall), Benchmark: '0.80', 'Met?': meets(metrics.recall) },
            { Metric: 'F1-score', Result: pct(metrics.f1), Benchmark: '0.80', 'Met?': meets(metrics.f1) }
        ]);

        console.log('=== Table 4.15: Field extraction accuracy (out of TP = ' + tier2.tp + ') ===');
        const acc = n => pct(tier2.tp ? n / tier2.tp : null);
        console.table([
            { Measure: 'Title accuracy', Correct: tier2.title.correct, Accuracy: acc(tier2.title.correct), 'Still to review': tier2.title.pendingReview },
            { Measure: 'Due date accuracy', Correct: tier2.dueDate.correct, Accuracy: acc(tier2.dueDate.correct), 'Still to review': tier2.dueDate.pendingReview },
            { Measure: 'Course code accuracy', Correct: tier2.courseCode.correct, Accuracy: acc(tier2.courseCode.correct), 'Still to review': tier2.courseCode.pendingReview },
            { Measure: 'Composite (all three correct) [benchmark 75%]', Correct: tier2.composite, Accuracy: acc(tier2.composite), 'Still to review': tier2.compositePending }
        ]);
        console.log(`Overall field accuracy (correct fields / 3 x TP): ${pct(tier2.overallFieldAccuracy)}`);

        console.log('\n=== Table 4.16: Error analysis ===');
        const errs = [];
        for (const r of rows) {
            if (r.detection === 'extracted' && !r.isTask) errs.push({ Type: 'False positive', ID: r.id, Detail: `system created "${r.system?.title}"` });
            if (r.isTask && (r.detection === 'no_task' || r.detection === 'invalid')) errs.push({ Type: 'False negative', ID: r.id, Detail: `outcome: ${r.detection}` });
            if (r.fields) {
                for (const [f, label] of [['title', 'Wrong title'], ['dueDate', 'Wrong due date'], ['courseCode', 'Wrong course code']]) {
                    const v = r.fields[f];
                    if (v.verdict === 'wrong') {
                        const exp = f === 'dueDate' ? v.expected : r.expected[f];
                        const got = f === 'dueDate' ? v.got : r.system[f];
                        errs.push({ Type: label, ID: r.id, Detail: `expected ${exp}, got ${got}${v.note ? ' (' + v.note + ')' : ''}` });
                    }
                }
            }
        }
        console.table(errs.length ? errs : [{ Type: 'none', ID: '', Detail: '' }]);

        // ---------- things you must look at ----------
        const review = rows.filter(r => r.fields && Object.values(r.fields).some(f => f.verdict === 'review'));
        if (review.length) {
            console.log(`\n⚠️  ${review.length} email(s) need your decision (title wording, ambiguous or midnight dates). Counted as NOT correct until you decide:`);
            for (const r of review) {
                for (const [f, v] of Object.entries(r.fields)) {
                    if (v.verdict !== 'review') continue;
                    const exp = f === 'dueDate' ? v.expected : r.expected[f];
                    const got = f === 'dueDate' ? v.got : r.system[f];
                    console.log(`  ${r.id} ${f}: expected "${exp}" | got "${got}" | ${v.note}`);
                }
            }
            console.log(`  To decide, create ${path.basename(OVERRIDES_PATH)} like { "TEST-005": { "title": "ok" } } and run this script again.`);
        }
        if (lists.excluded.length) {
            console.log(`\n⚠️  ${lists.excluded.length} email(s) are NOT in the tables above: ${lists.excluded.join(', ')}`);
            console.log('  not_found = no email with that subject was processed; not_processed = scan never finished it (run testPipeline.js again);');
            console.log('  inconsistent = marked as a task but the task record is missing (reset the DB properly and rerun).');
        }
        const relRows = rows.filter(r => groundTruth.find(g => g.id === r.id)?.relative && r.receivedAt);
        if (relRows.length) {
            console.log(`\nℹ️  ${relRows.length} emails use relative dates ("tomorrow", "Monday"...). Their expected dates were recomputed from the day each email was received.`);
        }

        // ---------- save ----------
        fs.writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), report, rows }, null, 2));
        const header = ['ID', 'Subject', 'GroundTruth', 'Detection', 'Outcome', 'ExpectedTitle', 'SystemTitle', 'TitleVerdict',
            'ExpectedDate', 'SystemDate', 'DateVerdict', 'DateNote', 'ExpectedCode', 'SystemCode', 'CodeVerdict', 'Note'];
        const lines = [header.map(csvCell).join(',')];
        for (const r of rows) {
            const f = r.fields;
            lines.push([
                r.id, r.subject, r.isTask ? 'task' : 'non-task', r.detection, r.outcome,
                r.expected?.title, r.system?.title, f?.title.verdict,
                f?.dueDate.expected, f?.dueDate.got, f?.dueDate.verdict, f?.dueDate.note,
                r.expected?.courseCode, r.system?.courseCode, f?.courseCode.verdict, r.note
            ].map(csvCell).join(','));
        }
        fs.writeFileSync(OUT_CSV, lines.join('\n'));
        console.log(`\nSaved ${path.basename(OUT_CSV)} and ${path.basename(OUT_JSON)} next to this script.`);
    } catch (err) {
        console.error('\n❌ Evaluation failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

main();