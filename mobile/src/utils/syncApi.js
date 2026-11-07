const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function runEmailSync(token, timezone) {
    const response = await fetch(`${API_URL}/api/sync/emails`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timezone })
    });

    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || 'Sync failed');
        error.code = data.code;
        throw error;
    }
    return data;
}

export async function runFullSync(token, onProgress) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let totalSummary = {
        scanned: 0, noTask: 0, invalid: 0, tasksCreated: 0, 
        synced: 0, alreadyExists: 0, unscheduled: 0, 
        syncFailed: 0, aiErrors: 0, remaining: 0, durationMs: 0
    };

    let rounds = 0;
    const MAX_ROUNDS = 10;
    let keepGoing = true;

    while (keepGoing && rounds < MAX_ROUNDS) {
        rounds++;
        const summary = await runEmailSync(token, timezone);
        
        // Merge the tallies
        Object.keys(summary).forEach(key => {
            if (key === 'remaining') {
                totalSummary.remaining = summary.remaining;
            } else {
                totalSummary[key] += summary[key];
            }
        });

        if (onProgress) onProgress(totalSummary);

        // Stop if no more emails are waiting, or if a scan returned 0 (to prevent infinite loops)
        if (summary.remaining <= 0 || summary.scanned === 0) {
            keepGoing = false;
        }
    }

    return totalSummary;
}