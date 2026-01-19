import React from 'react';
import { Metadata } from 'next';
import { DutyOptimizerContent } from '@/features/compliance/components/DutyOptimizerContent';

export const metadata: Metadata = {
    title: 'Duty Optimizer - Sourcify',
    description: 'Find all applicable HTS codes and optimize your duty rates',
};

export default function OptimizerPage() {
    return <DutyOptimizerContent />;
}


