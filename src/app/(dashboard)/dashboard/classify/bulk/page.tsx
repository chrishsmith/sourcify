import React from 'react';
import { Metadata } from 'next';
import { BulkClassificationContent } from '@/features/compliance/components/BulkClassificationContent';

export const metadata: Metadata = {
    title: 'Bulk Classification - Sourcify',
    description: 'Upload a CSV to classify multiple products at once',
};

export default function BulkClassifyPage() {
    return <BulkClassificationContent />;
}
