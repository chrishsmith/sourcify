'use client';

import React from 'react';
import { Alert, Button, Card, Typography } from 'antd';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const { Title, Text } = Typography;

export interface ErrorStateProps {
    /** Error title */
    title?: string;
    /** Error message/description */
    message?: string;
    /** Callback for retry action */
    onRetry?: () => void;
    /** Label for retry button */
    retryText?: string;
    /** Whether retry is loading */
    retryLoading?: boolean;
    /** Optional back action */
    onBack?: () => void;
    /** Whether to show in a card container */
    card?: boolean;
    /** Whether to take full height (for page-level errors) */
    fullHeight?: boolean;
    /** Error type for styling */
    type?: 'error' | 'warning' | 'info';
    /** Additional CSS class */
    className?: string;
}

/**
 * Reusable error state component.
 * Use for consistent error handling UI across the application.
 * 
 * @example
 * // Simple error with retry
 * <ErrorState 
 *   message="Failed to load products" 
 *   onRetry={() => fetchProducts()} 
 * />
 * 
 * @example
 * // Full page error
 * <ErrorState 
 *   fullHeight
 *   card
 *   title="Something went wrong"
 *   message="We couldn't load your data. Please try again."
 *   onRetry={handleRetry}
 * />
 * 
 * @example
 * // Warning state
 * <ErrorState 
 *   type="warning"
 *   title="Connection Issue"
 *   message="Working offline with cached data."
 * />
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Something went wrong',
    message = 'An error occurred while loading data.',
    onRetry,
    retryText = 'Try Again',
    retryLoading = false,
    onBack,
    card = false,
    fullHeight = false,
    type = 'error',
    className = '',
}) => {
    const iconColors = {
        error: 'bg-red-100 text-red-600',
        warning: 'bg-amber-100 text-amber-600',
        info: 'bg-blue-100 text-blue-600',
    };
    
    const content = (
        <div 
            className={`flex flex-col items-center justify-center text-center ${fullHeight ? 'min-h-[400px]' : 'py-12'} ${className}`}
        >
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${iconColors[type]} mb-4`}>
                <AlertTriangle size={32} />
            </div>
            <Title level={4} className="mb-2 !mt-0">{title}</Title>
            <Text className="text-slate-500 max-w-md mb-6">{message}</Text>
            <div className="flex items-center gap-3">
                {onBack && (
                    <Button 
                        icon={<ArrowLeft size={16} />}
                        onClick={onBack}
                    >
                        Go Back
                    </Button>
                )}
                {onRetry && (
                    <Button 
                        type="primary"
                        icon={<RefreshCw size={16} className={retryLoading ? 'animate-spin' : ''} />}
                        onClick={onRetry}
                        loading={retryLoading}
                    >
                        {retryText}
                    </Button>
                )}
            </div>
        </div>
    );
    
    if (card) {
        return <Card className={className}>{content}</Card>;
    }
    
    return content;
};

/**
 * Inline error alert for use within forms or smaller sections.
 * For full-page or section errors, use ErrorState instead.
 */
export const InlineError: React.FC<{
    message: string;
    onRetry?: () => void;
    type?: 'error' | 'warning';
}> = ({ message, onRetry, type = 'error' }) => (
    <Alert
        type={type}
        message={message}
        showIcon
        action={
            onRetry ? (
                <Button size="small" onClick={onRetry}>
                    Retry
                </Button>
            ) : undefined
        }
        className="mb-4"
    />
);
