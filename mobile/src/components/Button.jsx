// mobile/src/components/Button.jsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export default function Button({
    title,
    onPress,
    variant = 'primary', // 'primary' | 'secondary' | 'inverted' | 'tertiary'
    icon,
    isLoading = false,
    disabled = false,
    className = '',
}) {
    // Map variant to NativeWind utility classes using custom theme tokens
    const variantStyles = {
        primary: 'bg-primary border-primary',
        secondary: 'bg-surface-light border-surface-light',
        inverted: 'bg-surface-dark border-surface-dark',
        tertiary: 'bg-tertiary border-tertiary',
    };

    const textStyles = {
        primary: 'text-white',
        secondary: 'text-primary',
        inverted: 'text-white',
        tertiary: 'text-white',
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
            className={`flex-row items-center justify-center rounded-xl py-4 px-5 border shadow-sm ${variantStyles[variant] || variantStyles.primary
                } ${disabled ? 'opacity-50' : 'opacity-100'} ${className}`}
        >
            {isLoading ? (
                <ActivityIndicator color={variant === 'secondary' ? '#1A237E' : '#FFFFFF'} />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text className={`font-semibold text-base ${textStyles[variant] || textStyles.primary} ${icon ? 'ml-2' : ''}`}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}