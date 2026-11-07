import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const TASKS_KEY = '@focusflow_tasks';
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.3.11:5000';

// Only one sync at a time. If another is requested mid-sync, run once more after.
let isSyncing = false;
let rerunRequested = false;

const readLocalTasks = async () => {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
};

const fromServer = (s) => ({
    ...s,
    _id: String(s._id),
    isDeleted: false,
    syncState: 'synced',
});

// Combine the phone's tasks with the server's list
function mergeServerTasks(localTasks, serverTasks) {
    const merged = [];
    const seen = new Set();

    for (const local of localTasks) {
        const server = serverTasks.find(
            (s) =>
                (local._id && String(s._id) === String(local._id)) ||
                s.localTaskId === local.localTaskId
        );

        if (server) {
            seen.add(String(server._id));

            if (local.syncState && local.syncState !== 'synced') {
                // Phone has unsent changes: keep them, just remember the server id
                merged.push({
                    ...local,
                    _id: local._id || String(server._id),
                    syncState: local.syncState === 'pending_create' ? 'pending_update' : local.syncState,
                });
            } else {
                // Phone has nothing pending: server version wins
                merged.push({ ...local, ...fromServer(server) });
            }
        } else if (local.syncState === 'synced' && local._id) {
            // Was on the server before, now gone from it (deleted elsewhere): drop it
            continue;
        } else {
            merged.push(local);
        }
    }

    // Tasks the phone has never seen (old tasks, AI tasks)
    for (const server of serverTasks) {
        if (!seen.has(String(server._id))) merged.push(fromServer(server));
    }

    return merged;
}

async function runSyncOnce(baseUrl, userToken) {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return false;

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
    };

    // ---------- PUSH: send pending changes ----------
    const snapshot = await readLocalTasks();
    const results = [];

    for (const t of snapshot) {
        if (!t || !t.syncState || t.syncState === 'synced') continue;

        try {
            if (t.syncState === 'pending_create') {
                const res = await fetch(`${baseUrl}/api/tasks/manual`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        localTaskId: t.localTaskId,
                        title: t.title,
                        description: t.description,
                        courseCode: t.courseCode,
                        dueDate: t.dueDate,
                        isCompleted: t.isCompleted,
                    }),
                });
                if (res.ok) {
                    const saved = await res.json();
                    results.push({ kind: 'create', localTaskId: t.localTaskId, sentAt: t.updatedAt, serverId: String(saved._id) });
                } else {
                    console.warn(`Create rejected [${res.status}]:`, await res.text());
                }
            } else if (t.syncState === 'pending_update') {
                const targetId = t._id || t.localTaskId;
                // Calendar-synced tasks are locked on the server except for completion
                const body = t.calendarEventId
                    ? { isCompleted: t.isCompleted }
                    : {
                          title: t.title,
                          description: t.description,
                          courseCode: t.courseCode,
                          dueDate: t.dueDate,
                          isCompleted: t.isCompleted,
                      };
                const res = await fetch(`${baseUrl}/api/tasks/${targetId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(body),
                });
                if (res.ok) {
                    results.push({ kind: 'update', localTaskId: t.localTaskId, sentAt: t.updatedAt });
                } else {
                    console.warn(`Update rejected [${res.status}] for "${t.title}":`, await res.text());
                }
            } else if (t.syncState === 'pending_delete') {
                const targetId = t._id || t.localTaskId;
                const res = await fetch(`${baseUrl}/api/tasks/${targetId}`, {
                    method: 'DELETE',
                    headers,
                });
                // 404 means the server doesn't have it, so there is nothing left to delete
                if (res.ok || res.status === 404) {
                    results.push({ kind: 'delete', localTaskId: t.localTaskId });
                } else {
                    console.warn(`Delete rejected [${res.status}] for "${t.title}":`, await res.text());
                }
            }
        } catch (err) {
            console.warn(`Sync failed for task ${t.localTaskId}, will retry later:`, err);
        }
    }

    // ---------- PULL: get the server's list ----------
    let serverTasks = null;
    try {
        const res = await fetch(`${baseUrl}/api/tasks`, { method: 'GET', headers });
        if (res.ok) {
            serverTasks = await res.json();
            console.log(`Pulled ${serverTasks.length} tasks from server`);
        } else {
            console.warn(`Pull rejected [${res.status}]:`, await res.text());
        }
    } catch (err) {
        console.warn('Pull failed, will retry later:', err);
    }

    // ---------- APPLY: use the freshest stored data so no edits get lost ----------
    const fresh = await readLocalTasks();
    const freshJson = JSON.stringify(fresh);
    let tasks = fresh;

    for (const r of results) {
        const i = tasks.findIndex((x) => x && x.localTaskId === r.localTaskId);
        if (i === -1) continue;
        const cur = tasks[i];

        if (r.kind === 'delete') {
            tasks[i] = null;
            continue;
        }

        const untouched = cur.updatedAt === r.sentAt; // not edited again during the sync

        if (r.kind === 'create') {
            tasks[i] = {
                ...cur,
                _id: r.serverId,
                syncState: untouched
                    ? 'synced'
                    : cur.syncState === 'pending_create'
                    ? 'pending_update'
                    : cur.syncState,
            };
        } else {
            tasks[i] = { ...cur, syncState: untouched ? 'synced' : cur.syncState };
        }
    }
    tasks = tasks.filter(Boolean);

    if (Array.isArray(serverTasks)) {
        tasks = mergeServerTasks(tasks, serverTasks);
    }

    if (JSON.stringify(tasks) !== freshJson) {
        await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
        return true;
    }
    return false;
}

/**
 * Pushes pending changes, then pulls the server's tasks.
 * Returns true if local storage changed (so the UI should re-read it).
 */
export const processSyncQueue = async (apiBaseUrl, userToken) => {
    if (isSyncing) {
        rerunRequested = true;
        return false;
    }

    const baseUrl = apiBaseUrl || DEFAULT_API_URL;
    isSyncing = true;
    let changed = false;

    try {
        do {
            rerunRequested = false;
            const didChange = await runSyncOnce(baseUrl, userToken);
            changed = changed || didChange;
        } while (rerunRequested);
    } catch (error) {
        console.error('Failed to process offline queue:', error);
    } finally {
        isSyncing = false;
    }

    return changed;
};