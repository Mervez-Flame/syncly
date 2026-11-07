import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {summary.tasksCreated} tasks found, {summary.synced} added to Calendar, {summary.unscheduled} have no deadline, {summary.noTask} emails had no task.
            </Text>
            {summary.remaining > 0 && status === 'syncing' && (
                <Text style={styles.waitingText}>{summary.remaining} more waiting...</Text>
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
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    }
});