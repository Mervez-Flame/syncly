import React from "react";
import { Pressable, Text } from "react-native";

export const Button = ({ title, variant = "primary", className = "", ...props }) => {
    const variantContainer = {
        primary: "bg-primary border-transparent",
        secondary: "bg-surface-light border-transparent",
        inverted: "bg-surface-dark border-transparent",
        outlined: "bg-transparent border border-neutral/60",
    };

    const variantText = {
        primary: "text-white font-semibold",
        secondary: "text-primary font-semibold",
        inverted: "text-[#FFE082] font-semibold",
        outlined: "text-primary font-semibold",
    };

    return (
        <Pressable
            className={`px-6 py-3 rounded-xl items-center justify-center active:opacity-80 ${variantContainer[variant]} ${className}`}
            {...props}
        >
            <Text className={`text-base ${variantText[variant]}`}>{title}</Text>
        </Pressable>
    );
};