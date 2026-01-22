'use client';

import React from 'react';
import { Spin, Card, Typography } from 'antd';
import { Loader2 } from 'lucide-react';

const { Text } = Typography;

export interface LoadingStateProps {
    /** Loading message to display */
    message?: string;
    /** Size of the spinner */
    size?: 'small' | 'default' | 'large';
    /** Whether to show in a card container */
    card?: boolean;
    /** Whether to take full height (for page-level loading) */
    fullHeight?: boolean;
    /** Additional CSS class */
    className?: string;
}

/**
 * Reusable loading state component.
 * Use for consistent loading spinners across the application.
 * 
 * @example
 * // Simple inline loading
 * <LoadingState />
 * 
 * @example
 * // Full page loading with message
 * <LoadingState fullHeight message="Loading products..." size="large" />
 * 
 * @example
 * // Loading in a card
 * <LoadingState card message="Fetching data..." />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
    message = 'Loading...',
    size = 'default',
    card = false,
    fullHeight = false,
    className = '',
}) => {
    const spinnerSize = size === 'small' ? 16 : size === 'large' ? 32 : 24;
    
    const content = (
        <div 
            className={`flex flex-col items-center justify-center ${fullHeight ? 'min-h-[400px]' : 'py-12'} ${className}`}
        >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-50 mb-4">
                <Loader2 
                    size={spinnerSize} 
                    className="text-teal-600 animate-spin" 
                />
            </div>
            {message && (
                <Text className="text-slate-500">{message}</Text>
            )}
        </div>
    );
    
    if (card) {
        return <Card className={className}>{content}</Card>;
    }
    
    return content;
};

/**
 * Simple inline spinner for use within other components.
 * For full-page or section loading, use LoadingState instead.
 */
export const InlineSpinner: React.FC<{ tip?: string }> = ({ tip }) => (
    <div className="flex items-center justify-center py-4">
        <Spin tip={tip} />
    </div>
);
