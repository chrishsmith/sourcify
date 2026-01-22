'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Switch,
  Select,
  Alert,
  Typography,
  Modal,
  Form,
  Input,
  Tabs,
  Empty,
  Tooltip,
  Badge,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  Spin,
  InputNumber,
} from 'antd';
import {
  Bell,
  BellOff,
  BellRing,
  Settings,
  Trash2,
  Plus,
  Mail,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Eye,
  Calendar,
  Globe,
  Package,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatHtsCode } from '@/utils/htsFormatting';

const { Title, Text, Paragraph } = Typography;

// Types
interface TariffAlert {
  id: string;
  htsCode: string;
  countryOfOrigin: string | null;
  originalRate: number;
  currentRate: number | null;
  alertType: 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
  threshold: number | null;
  isActive: boolean;
  lastChecked: string | null;
  lastAlertSent: string | null;
  createdAt: string;
  savedProduct?: {
    id: string;
    name: string;
  } | null;
}

interface AlertEvent {
  id: string;
  alertId: string;
  previousRate: number;
  newRate: number;
  changePercent: number;
  changeType: string;
  changeReason: string | null;
  notifiedAt: string | null;
  notifyMethod: string | null;
  createdAt: string;
}

interface AlertPreferences {
  emailEnabled: boolean;
  emailFrequency: 'instant' | 'daily' | 'weekly';
  inAppEnabled: boolean;
  notifyOnIncrease: boolean;
  notifyOnDecrease: boolean;
  minimumChangePercent: number;
}

const ALERT_TYPE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  ANY_CHANGE: { label: 'Any Change', color: 'blue', description: 'Notify on any rate change' },
  INCREASE_ONLY: { label: 'Increases Only', color: 'red', description: 'Only notify when rates go up' },
  DECREASE_ONLY: { label: 'Decreases Only', color: 'green', description: 'Only notify when rates go down' },
  THRESHOLD: { label: 'Threshold', color: 'orange', description: 'Notify when change exceeds threshold' },
};

const COUNTRIES: Record<string, string> = {
  CN: 'China',
  VN: 'Vietnam',
  IN: 'India',
  MX: 'Mexico',
  TH: 'Thailand',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
  BD: 'Bangladesh',
  PK: 'Pakistan',
  KR: 'South Korea',
  TW: 'Taiwan',
  JP: 'Japan',
  DE: 'Germany',
  IT: 'Italy',
  CA: 'Canada',
  GB: 'United Kingdom',
  FR: 'France',
};

export const ComplianceAlerts: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<TariffAlert[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>({
    emailEnabled: true,
    emailFrequency: 'daily',
    inAppEnabled: true,
    notifyOnIncrease: true,
    notifyOnDecrease: true,
    minimumChangePercent: 5,
  });
  const [activeTab, setActiveTab] = useState('alerts');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [eventDetailModal, setEventDetailModal] = useState<AlertEvent | null>(null);
  const [form] = Form.useForm();

  // Load alerts and events on mount
  useEffect(() => {
    fetchAlerts();
    fetchEvents();
    loadPreferences();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tariff-alerts');
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/tariff-alerts/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const loadPreferences = () => {
    // Load from localStorage
    const saved = localStorage.getItem('sourcify_alert_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        // Use defaults
      }
    }
  };

  const savePreferences = (newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('sourcify_alert_preferences', JSON.stringify(newPrefs));
    message.success('Alert preferences saved');
  };

  const handleCreateAlert = async (values: {
    htsCode: string;
    countryOfOrigin?: string;
    alertType: string;
    threshold?: number;
  }) => {
    try {
      const response = await fetch('/api/tariff-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        message.success('Alert created successfully');
        setCreateModalOpen(false);
        form.resetFields();
        fetchAlerts();
      } else {
        message.error(data.error || 'Failed to create alert');
      }
    } catch (error) {
      message.error('Failed to create alert');
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/tariff-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isActive } : a));
        message.success(isActive ? 'Alert enabled' : 'Alert paused');
      }
    } catch (error) {
      message.error('Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/tariff-alerts/${alertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        message.success('Alert deleted');
      }
    } catch (error) {
      message.error('Failed to delete alert');
    }
  };

  const renderRateChange = (previousRate: number, newRate: number) => {
    const change = newRate - previousRate;
    const percentChange = previousRate > 0 ? ((change / previousRate) * 100) : 0;
    const isIncrease = change > 0;

    return (
      <Space>
        <Text>{previousRate.toFixed(1)}%</Text>
        <ArrowRight size={14} className="text-gray-400" />
        <Text strong className={isIncrease ? 'text-red-600' : 'text-green-600'}>
          {newRate.toFixed(1)}%
        </Text>
        <Tag color={isIncrease ? 'red' : 'green'}>
          {isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="ml-1">{isIncrease ? '+' : ''}{percentChange.toFixed(1)}%</span>
        </Tag>
      </Space>
    );
  };

  // Alerts Tab
  const renderAlertsTab = () => {
    const columns = [
      {
        title: 'HTS Code',
        dataIndex: 'htsCode',
        key: 'htsCode',
        render: (code: string, record: TariffAlert) => (
          <Space direction="vertical" size={0}>
            <Text code className="font-mono">{formatHtsCode(code)}</Text>
            {record.savedProduct && (
              <Text type="secondary" className="text-xs">
                <Package size={10} className="inline mr-1" />
                {record.savedProduct.name}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Country',
        dataIndex: 'countryOfOrigin',
        key: 'countryOfOrigin',
        render: (country: string | null) => country ? (
          <Tag icon={<Globe size={12} />}>{COUNTRIES[country] || country}</Tag>
        ) : (
          <Text type="secondary">All Countries</Text>
        ),
      },
      {
        title: 'Alert Type',
        dataIndex: 'alertType',
        key: 'alertType',
        render: (type: string, record: TariffAlert) => (
          <Space direction="vertical" size={0}>
            <Tag color={ALERT_TYPE_CONFIG[type]?.color || 'default'}>
              {ALERT_TYPE_CONFIG[type]?.label || type}
            </Tag>
            {type === 'THRESHOLD' && record.threshold && (
              <Text type="secondary" className="text-xs">
                ≥ {record.threshold}% change
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Current Rate',
        key: 'rates',
        render: (_: unknown, record: TariffAlert) => (
          <Space direction="vertical" size={0}>
            <Text>{record.currentRate?.toFixed(1) || record.originalRate.toFixed(1)}%</Text>
            <Text type="secondary" className="text-xs">
              Original: {record.originalRate.toFixed(1)}%
            </Text>
          </Space>
        ),
      },
      {
        title: 'Status',
        key: 'status',
        render: (_: unknown, record: TariffAlert) => (
          <Space>
            <Switch
              checked={record.isActive}
              onChange={(checked) => handleToggleAlert(record.id, checked)}
              checkedChildren={<Bell size={12} />}
              unCheckedChildren={<BellOff size={12} />}
            />
            {record.lastChecked && (
              <Tooltip title={`Last checked: ${new Date(record.lastChecked).toLocaleString()}`}>
                <Clock size={14} className="text-gray-400" />
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, record: TariffAlert) => (
          <Space>
            <Popconfirm
              title="Delete this alert?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteAlert(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={14} />}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Text type="secondary">
            {alerts.filter(a => a.isActive).length} active alert{alerts.filter(a => a.isActive).length !== 1 ? 's' : ''} monitoring
          </Text>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Create Alert
          </Button>
        </div>

        <Table
          dataSource={alerts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                description="No alerts configured"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create Your First Alert
                </Button>
              </Empty>
            ),
          }}
        />
      </div>
    );
  };

  // Events Tab (Alert History)
  const renderEventsTab = () => {
    const columns = [
      {
        title: 'Date',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (date: string) => (
          <Space>
            <Calendar size={14} className="text-gray-400" />
            {new Date(date).toLocaleDateString()}
          </Space>
        ),
        sorter: (a: AlertEvent, b: AlertEvent) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      },
      {
        title: 'Rate Change',
        key: 'change',
        render: (_: unknown, record: AlertEvent) =>
          renderRateChange(record.previousRate, record.newRate),
      },
      {
        title: 'Reason',
        dataIndex: 'changeReason',
        key: 'changeReason',
        ellipsis: true,
        render: (reason: string | null) => reason || <Text type="secondary">—</Text>,
      },
      {
        title: 'Notification',
        key: 'notification',
        render: (_: unknown, record: AlertEvent) => (
          <Space>
            {record.notifiedAt ? (
              <Tag color="green" icon={<CheckCircle size={12} />}>
                Sent via {record.notifyMethod}
              </Tag>
            ) : (
              <Tag color="default" icon={<Clock size={12} />}>
                Pending
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 60,
        render: (_: unknown, record: AlertEvent) => (
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => setEventDetailModal(record)}
          />
        ),
      },
    ];

    return (
      <div className="space-y-4">
        <Text type="secondary">
          Recent tariff changes detected for your monitored products
        </Text>

        <Table
          dataSource={events}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
          locale={{
            emptyText: (
              <Empty
                description="No alert events yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Paragraph type="secondary">
                  When tariff rates change for your monitored codes, events will appear here.
                </Paragraph>
              </Empty>
            ),
          }}
        />
      </div>
    );
  };

  // Preferences Tab
  const renderPreferencesTab = () => (
    <div className="space-y-6 max-w-2xl">
      <Card title={<Space><Mail size={18} /><span>Email Notifications</span></Space>}>
        <Space direction="vertical" className="w-full" size="middle">
          <div className="flex items-center justify-between">
            <div>
              <Text strong>Enable Email Alerts</Text>
              <Text type="secondary" className="block text-sm">
                Receive tariff change notifications via email
              </Text>
            </div>
            <Switch
              checked={preferences.emailEnabled}
              onChange={(checked) => savePreferences({ ...preferences, emailEnabled: checked })}
            />
          </div>

          {preferences.emailEnabled && (
            <>
              <Divider className="my-3" />
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>Email Frequency</Text>
                  <Text type="secondary" className="block text-sm">
                    How often to send email digests
                  </Text>
                </div>
                <Select
                  value={preferences.emailFrequency}
                  onChange={(value) => savePreferences({ ...preferences, emailFrequency: value })}
                  style={{ width: 140 }}
                  options={[
                    { label: 'Instant', value: 'instant' },
                    { label: 'Daily Digest', value: 'daily' },
                    { label: 'Weekly Digest', value: 'weekly' },
                  ]}
                />
              </div>
            </>
          )}
        </Space>
      </Card>

      <Card title={<Space><BellRing size={18} /><span>In-App Notifications</span></Space>}>
        <Space direction="vertical" className="w-full" size="middle">
          <div className="flex items-center justify-between">
            <div>
              <Text strong>Enable In-App Alerts</Text>
              <Text type="secondary" className="block text-sm">
                Show notifications in the dashboard
              </Text>
            </div>
            <Switch
              checked={preferences.inAppEnabled}
              onChange={(checked) => savePreferences({ ...preferences, inAppEnabled: checked })}
            />
          </div>
        </Space>
      </Card>

      <Card title={<Space><AlertTriangle size={18} /><span>Alert Triggers</span></Space>}>
        <Space direction="vertical" className="w-full" size="middle">
          <div className="flex items-center justify-between">
            <div>
              <Text strong>Rate Increases</Text>
              <Text type="secondary" className="block text-sm">
                Alert when tariff rates go up
              </Text>
            </div>
            <Switch
              checked={preferences.notifyOnIncrease}
              onChange={(checked) => savePreferences({ ...preferences, notifyOnIncrease: checked })}
            />
          </div>

          <Divider className="my-3" />

          <div className="flex items-center justify-between">
            <div>
              <Text strong>Rate Decreases</Text>
              <Text type="secondary" className="block text-sm">
                Alert when tariff rates go down
              </Text>
            </div>
            <Switch
              checked={preferences.notifyOnDecrease}
              onChange={(checked) => savePreferences({ ...preferences, notifyOnDecrease: checked })}
            />
          </div>

          <Divider className="my-3" />

          <div className="flex items-center justify-between">
            <div>
              <Text strong>Minimum Change Threshold</Text>
              <Text type="secondary" className="block text-sm">
                Only alert if change exceeds this percentage
              </Text>
            </div>
            <InputNumber
              value={preferences.minimumChangePercent}
              onChange={(value) => savePreferences({ ...preferences, minimumChangePercent: value || 0 })}
              min={0}
              max={100}
              addonAfter="%"
              style={{ width: 100 }}
            />
          </div>
        </Space>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Email Integration Coming Soon"
        description="Email notifications require server-side integration with Resend or SendGrid. Currently, alerts are stored and can be viewed in the Events tab."
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title level={3} className="mb-2 flex items-center gap-2">
          <BellRing className="text-teal-600" />
          Compliance Alerts
        </Title>
        <Paragraph type="secondary">
          Monitor tariff rate changes and get notified when duties change for your products.
        </Paragraph>
      </div>

      {/* Stats */}
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Active Alerts"
              value={alerts.filter(a => a.isActive).length}
              prefix={<Bell size={16} className="text-teal-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Total Alerts"
              value={alerts.length}
              prefix={<BellRing size={16} className="text-blue-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Recent Events"
              value={events.length}
              prefix={<AlertTriangle size={16} className="text-orange-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Notifications Sent"
              value={events.filter(e => e.notifiedAt).length}
              prefix={<Mail size={16} className="text-green-600" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'alerts',
            label: (
              <Space>
                <Bell size={16} />
                My Alerts
                <Badge count={alerts.filter(a => a.isActive).length} size="small" />
              </Space>
            ),
            children: renderAlertsTab(),
          },
          {
            key: 'events',
            label: (
              <Space>
                <AlertTriangle size={16} />
                Alert History
                <Badge count={events.length} size="small" />
              </Space>
            ),
            children: renderEventsTab(),
          },
          {
            key: 'preferences',
            label: (
              <Space>
                <Settings size={16} />
                Preferences
              </Space>
            ),
            children: renderPreferencesTab(),
          },
        ]}
      />

      {/* Create Alert Modal */}
      <Modal
        title="Create New Alert"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateAlert}
          initialValues={{ alertType: 'ANY_CHANGE' }}
        >
          <Form.Item
            name="htsCode"
            label="HTS Code"
            rules={[{ required: true, message: 'Please enter an HTS code' }]}
          >
            <Input
              placeholder="e.g., 8471.30.0100"
              className="font-mono"
            />
          </Form.Item>

          <Form.Item
            name="countryOfOrigin"
            label="Country of Origin"
          >
            <Select
              placeholder="All countries (optional)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={Object.entries(COUNTRIES).map(([code, name]) => ({
                value: code,
                label: name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="alertType"
            label="Alert Type"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => ({
                value: key,
                label: (
                  <Space>
                    <Tag color={config.color}>{config.label}</Tag>
                    <Text type="secondary" className="text-xs">{config.description}</Text>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.alertType !== currentValues.alertType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('alertType') === 'THRESHOLD' && (
                <Form.Item
                  name="threshold"
                  label="Change Threshold (%)"
                  rules={[{ required: true, message: 'Please enter a threshold' }]}
                >
                  <InputNumber
                    min={1}
                    max={100}
                    placeholder="e.g., 5"
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setCreateModalOpen(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" className="bg-teal-600 hover:bg-teal-700">
                Create Alert
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        title="Alert Event Details"
        open={!!eventDetailModal}
        onCancel={() => setEventDetailModal(null)}
        footer={
          <Button onClick={() => setEventDetailModal(null)}>Close</Button>
        }
      >
        {eventDetailModal && (
          <div className="space-y-4">
            <div>
              <Text type="secondary">Date</Text>
              <div>{new Date(eventDetailModal.createdAt).toLocaleString()}</div>
            </div>

            <div>
              <Text type="secondary">Rate Change</Text>
              <div className="mt-1">
                {renderRateChange(eventDetailModal.previousRate, eventDetailModal.newRate)}
              </div>
            </div>

            <div>
              <Text type="secondary">Change Type</Text>
              <div>
                <Tag color={eventDetailModal.changeType === 'increase' ? 'red' : 'green'}>
                  {eventDetailModal.changeType === 'increase' ? (
                    <TrendingUp size={12} className="inline mr-1" />
                  ) : (
                    <TrendingDown size={12} className="inline mr-1" />
                  )}
                  {eventDetailModal.changeType}
                </Tag>
              </div>
            </div>

            {eventDetailModal.changeReason && (
              <div>
                <Text type="secondary">Reason</Text>
                <div>{eventDetailModal.changeReason}</div>
              </div>
            )}

            <div>
              <Text type="secondary">Notification Status</Text>
              <div>
                {eventDetailModal.notifiedAt ? (
                  <Tag color="green" icon={<CheckCircle size={12} />}>
                    Sent via {eventDetailModal.notifyMethod} on{' '}
                    {new Date(eventDetailModal.notifiedAt).toLocaleString()}
                  </Tag>
                ) : (
                  <Tag color="default" icon={<Clock size={12} />}>
                    Not yet sent
                  </Tag>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ComplianceAlerts;
