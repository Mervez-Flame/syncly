import { useState } from 'react';
import { runFullSync } from '../services/syncApi';

export function useEmailSync(token, refreshTasks) {
    const [status, setStatus] = useState('idle'); // idle | syncing | done | error
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);

    const startSync = async () => {
        const startTime = Date.now();
        setStatus('syncing');
        setError(null);
        setSummary(null);

        try {
            const finalSummary = await runFullSync(token, (progressSummary) => {
                setSummary({ ...progressSummary });
            });
            
            // Refresh the dashboard list so new tasks appear instantly
            if (refreshTasks) {
                await refreshTasks();
            }
            
            finalSummary.totalDurationMs = Date.now() - startTime;
            setSummary(finalSummary);
            setStatus('done');
            
            // Log for your thesis performance evaluation (Section 3.9.4)
            console.log(`Sync + UI Refresh took ${finalSummary.totalDurationMs}ms`);
            
        } catch (err) {
            setError({ code: err.code, message: err.message });
            setStatus('error');
        }
    };

    const resetSync = () => {
        setStatus('idle');
        setSummary(null);
        setError(null);
    };

    return { status, summary, error, startSync, resetSync };
}