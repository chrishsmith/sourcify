'use client';

import React from 'react';
import { Empty, Button, Card, Typography } from 'antd';
import { Plus, Search, FolderOpen, FileQuestion, Package, Bell, BarChart } from 'lucide-react';
import Link from 'next/link';

const { Title, Text } = Typography;

// Preset icons for common empty states
const EMPTY_ICONS = {
    default: FileQuestion,
    products: Package,
    search: Search,
    folder: FolderOpen,
    notifications: Bell,
    analytics: BarChart,
} as const;

export type EmptyIconType = keyof typeof EMPTY_ICONS;

export interface EmptyStateAction {
    /** Action button label */
    label: string;
    /** Click handler for button action */
    onClick?: () => void;
    /** URL for link action (uses Next.js Link) */
    href?: string;
    /** Button type */
    type?: 'primary' | 'default' | 'link';
    /** Icon to show in button */
    icon?: React.ReactNode;
}

export interface EmptyStateProps {
    /** Main title */
    title?: string;
    /** Description text */
    description?: string;
    /** Preset icon type or custom icon */
    icon?: EmptyIconType | React.ReactNode;
    /** Primary action */
    action?: EmptyStateAction;
    /** Secondary action */
    secondaryAction?: EmptyStateAction;
    /** Whether to show in a card container */
    card?: boolean;
    /** Whether to take full height */
    fullHeight?: boolean;
    /** Icon background color class */
    iconBgColor?: string;
    /** Icon color class */
    iconColor?: string;
    /** Additional CSS class */
    className?: string;
}

/**
 * Reusable empty state component.
 * Use for consistent "no data" states across the application.
 * 
 * @example
 * // Simple empty state
 * <EmptyState 
 *   title="No products yet"
 *   description="Save products from your classifications to track them here."
 * />
 * 
 * @example
 * // Empty state with action
 * <EmptyState 
 *   icon="products"
 *   title="No products saved"
 *   description="Save your first product to get started."
 *   action={{
 *     label: "Classify a Product",
 *     href: "/dashboard/classify",
 *     icon: <Plus size={16} />
 *   }}
 * />
 * 
 * @example
 * // Search empty state
 * <EmptyState 
 *   icon="search"
 *   title="No results found"
 *   description="Try adjusting your search terms."
 *   action={{ label: "Clear Search", onClick: handleClear }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    title = 'No data',
    description,
    icon = 'default',
    action,
    secondaryAction,
    card = false,
    fullHeight = false,
    iconBgColor = 'bg-slate-100',
    iconColor = 'text-slate-500',
    className = '',
}) => {
    // Resolve icon component
    const IconComponent = typeof icon === 'string' && icon in EMPTY_ICONS 
        ? EMPTY_ICONS[icon as EmptyIconType]
        : null;
    
    const renderAction = (actionConfig: EmptyStateAction, isPrimary: boolean) => {
        const buttonType = actionConfig.type || (isPrimary ? 'primary' : 'default');
        const button = (
            <Button
                type={buttonType}
                icon={actionConfig.icon || (isPrimary ? <Plus size={16} /> : undefined)}
                onClick={actionConfig.onClick}
            >
                {actionConfig.label}
            </Button>
        );
        
        if (actionConfig.href) {
            return <Link href={actionConfig.href}>{button}</Link>;
        }
        
        return button;
    };
    
    const content = (
        <div 
            className={`flex flex-col items-center justify-center text-center ${fullHeight ? 'min-h-[400px]' : 'py-12'} ${className}`}
        >
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${iconBgColor} mb-4`}>
                {IconComponent ? (
                    <IconComponent size={32} className={iconColor} />
                ) : (
                    icon
                )}
            </div>
            
            {/* Title */}
            <Title level={4} className="mb-2 !mt-0">{title}</Title>
            
            {/* Description */}
            {description && (
                <Text className="text-slate-500 max-w-md mb-6">{description}</Text>
            )}
            
            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3">
                    {secondaryAction && renderAction(secondaryAction, false)}
                    {action && renderAction(action, true)}
                </div>
            )}
        </div>
    );
    
    if (card) {
        return <Card className={className}>{content}</Card>;
    }
    
    return content;
};

/**
 * Search-specific empty state.
 * Use when search returns no results.
 */
export const SearchEmptyState: React.FC<{
    searchTerm?: string;
    onClear?: () => void;
}> = ({ searchTerm, onClear }) => (
    <EmptyState
        icon="search"
        title="No results found"
        description={
            searchTerm 
                ? `No matches for "${searchTerm}". Try different keywords.`
                : "Try adjusting your search criteria."
        }
        action={onClear ? {
            label: "Clear Search",
            onClick: onClear,
            type: 'default',
        } : undefined}
    />
);
