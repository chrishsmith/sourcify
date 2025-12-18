

import React from 'react';
import { SupplierExplorer } from '@/features/sourcing/components/SupplierExplorer';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Supplier Explorer - Sourcify',
    description: 'Source from 11M+ verified suppliers',
};

export default function SuppliersPage() {
    return <SupplierExplorer />;
}
