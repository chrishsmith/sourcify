import React from 'react';
import { Metadata } from 'next';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';

export const metadata: Metadata = {
    title: 'Dashboard - Sourcify',
    description: 'Trade Compliance Overview',
};

export default function DashboardPage() {
    return <DashboardOverview />;
}
