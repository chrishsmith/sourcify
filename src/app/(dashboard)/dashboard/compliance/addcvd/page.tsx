'use client';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ADCVDLookup } from '@/features/compliance/components/ADCVDLookup';

export default function ADCVDPage() {
    return (
        <DashboardLayout>
            <ADCVDLookup />
        </DashboardLayout>
    );
}
