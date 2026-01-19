'use client';

import React, { useState } from 'react';
import { Typography, Tooltip, Tag } from 'antd';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import type { HTSHierarchy, HTSHierarchyLevel, HTSSibling } from '@/types/classification.types';

const { Text } = Typography;

interface ClassificationPathProps {
    hierarchy: HTSHierarchy;
    /** Allow expanding to show siblings */
    allowExpansion?: boolean;
    /** Compact mode - less padding, smaller text */
    compact?: boolean;
}

/**
 * ClassificationPath - Clean HTS hierarchy display
 * 
 * Shows the direct lineage path to the HTS code by default.
 * Users can optionally expand each level to see sibling codes (alternatives).
 */
export const ClassificationPath: React.FC<ClassificationPathProps> = ({
    hierarchy,
    allowExpansion = true,
    compact = false,
}) => {
    // Track which levels are expanded to show siblings
    const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

    const toggleLevel = (index: number) => {
        if (!allowExpansion) return;
        setExpandedLevels(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const isExpanded = (index: number) => expandedLevels.has(index);

    return (
        <div className={`bg-slate-50 rounded-lg border border-slate-200 ${compact ? 'p-2' : 'p-3'}`}>
            <Text className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">
                Classification Path
            </Text>
            <div className="flex flex-col">
                {hierarchy.levels.map((level, index) => (
                    <ClassificationPathLevel
                        key={index}
                        level={level}
                        index={index}
                        isLast={index === hierarchy.levels.length - 1}
                        isExpanded={isExpanded(index)}
                        onToggle={() => toggleLevel(index)}
                        allowExpansion={allowExpansion && (level.siblingCount ?? 0) > 0}
                        compact={compact}
                    />
                ))}
            </div>
        </div>
    );
};

interface ClassificationPathLevelProps {
    level: HTSHierarchyLevel;
    index: number;
    isLast: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    allowExpansion: boolean;
    compact: boolean;
}

const ClassificationPathLevel: React.FC<ClassificationPathLevelProps> = ({
    level,
    index,
    isLast,
    isExpanded,
    onToggle,
    allowExpansion,
    compact,
}) => {
    const indentPx = index * (compact ? 12 : 16);
    const hasSiblings = (level.siblingCount ?? 0) > 0;

    return (
        <div className="flex flex-col">
            {/* Main level row */}
            <div 
                className={`flex items-start gap-2 ${compact ? 'py-0.5' : 'py-1'}`}
                style={{ paddingLeft: `${indentPx}px` }}
            >
                {/* Tree connector / icon */}
                <span className={`text-slate-400 ${compact ? 'text-xs' : 'text-sm'} flex-shrink-0 w-4`}>
                    {index === 0 ? (
                        <Folder size={compact ? 12 : 14} className="text-slate-400" />
                    ) : isLast ? (
                        <FileText size={compact ? 12 : 14} className="text-teal-600" />
                    ) : (
                        '└'
                    )}
                </span>

                {/* Code badge */}
                <span className={`font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isLast 
                        ? 'bg-teal-100 text-teal-700 font-semibold' 
                        : 'bg-slate-200 text-slate-600'
                } ${compact ? 'text-xs' : 'text-xs'}`}>
                    {level.code}
                </span>

                {/* Description */}
                <span className={`${
                    isLast 
                        ? 'text-slate-900 font-medium' 
                        : 'text-slate-600'
                } ${compact ? 'text-xs' : 'text-sm'} flex-1 leading-snug`}>
                    {level.description}
                </span>

                {/* Duty rate tag (if present) */}
                {level.dutyRate && isLast && (
                    <Tag color="green" className="text-xs ml-1 flex-shrink-0">
                        {level.dutyRate}
                    </Tag>
                )}

                {/* Sibling expansion toggle */}
                {allowExpansion && hasSiblings && (
                    <Tooltip title={isExpanded ? 'Hide alternatives' : `Show ${level.siblingCount} alternative${level.siblingCount === 1 ? '' : 's'}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            className={`
                                flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
                                transition-colors flex-shrink-0
                                ${isExpanded 
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                }
                            `}
                        >
                            {isExpanded ? (
                                <ChevronDown size={12} />
                            ) : (
                                <ChevronRight size={12} />
                            )}
                            <span>{level.siblingCount}</span>
                        </button>
                    </Tooltip>
                )}
            </div>

            {/* Expanded siblings */}
            {isExpanded && level.siblings && level.siblings.length > 0 && (
                <div 
                    className="mt-1 mb-2 ml-4 pl-2 border-l-2 border-blue-200"
                    style={{ marginLeft: `${indentPx + 16}px` }}
                >
                    <Text className="text-xs text-blue-600 font-medium mb-1.5 block">
                        Alternative classifications at this level:
                    </Text>
                    <div className="flex flex-col gap-1">
                        {level.siblings.map((sibling, sibIndex) => (
                            <SiblingItem 
                                key={sibIndex} 
                                sibling={sibling} 
                                compact={compact}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface SiblingItemProps {
    sibling: HTSSibling;
    compact: boolean;
}

const SiblingItem: React.FC<SiblingItemProps> = ({ sibling, compact }) => {
    return (
        <div className={`flex items-start gap-2 ${compact ? 'py-0.5' : 'py-1'} px-2 rounded bg-white border border-slate-100 hover:border-blue-200 transition-colors`}>
            <span className={`font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0 ${compact ? 'text-xs' : 'text-xs'}`}>
                {sibling.code}
            </span>
            <span className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'} flex-1 leading-snug`}>
                {sibling.description}
            </span>
            {sibling.dutyRate && (
                <Tag className="text-xs flex-shrink-0" color="default">
                    {sibling.dutyRate}
                </Tag>
            )}
        </div>
    );
};

export default ClassificationPath;






