// src/components/SyncSummaryBanner.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Helper to format seconds into "X min Y sec"
function formatETA(seconds) {
    if (seconds < 60) return `~${seconds} seconds`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${mins} min ${secs > 0 ? `${secs} sec` : ''}`;
}

export default function SyncSummaryBanner({ summary, error, status }) {
    if (status === 'idle') return null;

    if (status === 'error') {
        const isReauth = error?.code === 'REAUTH_REQUIRED';
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.errorText}>
                    {isReauth ? 'Sign in with Google again' : error?.message || 'Sync failed. Please try again.'}
                </Text>
            </View>
        );
    }

    if (!summary) return null;

    if (summary.scanned === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No new tasks found.</Text>
            </View>
        );
    }

    const isLargeInbox = summary.remaining > 100 && status === 'syncing';

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {summary.tasksCreated} tasks found, {summary.synced} added to Calendar, {summary.unscheduled} have no deadline, {summary.noTask} emails had no task.
            </Text>

            {status === 'syncing' && (
                <View style={styles.progressContainer}>
                    <Text style={styles.waitingText}>
                        {summary.remaining > 0 ? `${summary.remaining} more waiting...` : 'Processing final batch...'}
                    </Text>

                    {isLargeInbox && (
                        <Text style={styles.warningText}>
                            Heavy inbox detected. Pacing requests to prevent limits.
                        </Text>
                    )}

                    {/* Show ETA if there is one, otherwise show a generic loading message */}
                    <Text style={styles.etaText}>
                        {summary.estimatedSecondsLeft > 0
                            ? `Estimated time: ${formatETA(summary.estimatedSecondsLeft)}`
                            : 'Finishing up...'}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 6,
        marginVertical: 10,
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
    },
    progressContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderColor: '#C8E6C9'
    },
    text: {
        color: '#2E7D32',
        fontSize: 14,
    },
    errorText: {
        color: '#C62828',
        fontSize: 14,
        fontWeight: 'bold',
    },
    waitingText: {
        color: '#1565C0',
        fontSize: 13,
        fontWeight: '500',
    },
    warningText: {
        color: '#E65100',
        fontSize: 12,
        marginTop: 2,
        fontStyle: 'italic',
    },
    etaText: {
        color: '#424242',
        fontSize: 12,
        marginTop: 4,
        fontWeight: 'bold',
    }
});