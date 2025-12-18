import React from 'react';
import { Metadata } from 'next';
import MonitoringPageContent from '@/features/compliance/components/MonitoringPageContent';

export const metadata: Metadata = {
    title: 'Tariff Monitoring - Sourcify',
    description: 'Track duty rate changes and trade policies',
};

export default function MonitoringPage() {
    return <MonitoringPageContent />;
}
