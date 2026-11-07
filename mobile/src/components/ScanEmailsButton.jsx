import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function ScanEmailsButton({ onPress, status }) {
    const isSyncing = status === 'syncing';

    return (
        <TouchableOpacity 
            style={[styles.button, isSyncing && styles.disabled]} 
            onPress={onPress} 
            disabled={isSyncing}
        >
            {isSyncing ? (
                <>
                    <ActivityIndicator color="#fff" size="small" style={styles.spinner} />
                    <Text style={styles.text}>Scanning your emails...</Text>
                </>
            ) : (
                <Text style={styles.text}>Scan Unread Emails</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        backgroundColor: '#A0C4FF',
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    spinner: {
        marginRight: 10,
    }
});