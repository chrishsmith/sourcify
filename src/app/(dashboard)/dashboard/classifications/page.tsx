import React from 'react';
import { Metadata } from 'next';
import { ClassificationsPageContent } from '@/features/compliance/components/ClassificationsPageContent';

export const metadata: Metadata = {
    title: 'Classifications - Sourcify',
    description: 'Manage your HTS and Schedule B classifications',
};

export default function ClassificationsPage() {
    return <ClassificationsPageContent />;
}
