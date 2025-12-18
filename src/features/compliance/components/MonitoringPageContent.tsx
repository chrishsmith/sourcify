'use client';

import React from 'react';
import { Typography } from 'antd';
import TariffDashboard from '@/features/compliance/components/TariffDashboard';

const { Title } = Typography;

export default function MonitoringPageContent() {
    return (
        <div>
            <div className="mb-6">
                <Title level={2} style={{ margin: 0 }}>Tariff Monitoring</Title>
            </div>
            <TariffDashboard />
        </div>
    );
}
