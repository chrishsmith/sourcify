'use client';

import React, { useState, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Table,
  Tag,
  Space,
  Select,
  Alert,
  Typography,
  Collapse,
  Divider,
  Empty,
  Tooltip,
  Timeline,
  Tabs,
  Row,
  Col,
  Statistic,
  Spin,
} from 'antd';
import {
  Search,
  History,
  ArrowRight,
  ArrowLeft,
  GitMerge,
  GitBranch,
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Calendar,
  Info,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  BookOpen,
} from 'lucide-react';
import { formatHtsCode } from '@/utils/htsFormatting';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface HtsCodeChange {
  id: string;
  effectiveDate: string;
  changeType: string;
  oldCodes: string[];
  oldDescriptions?: string[];
  newCodes: string[];
  newDescriptions?: string[];
  chapter: string;
  reason?: string;
  federalRegister?: string;
  notes?: string;
}

interface HtsCodeMapping {
  oldCode: string;
  newCode: string;
  effectiveDate: string;
  changeType: string;
  confidence: 'exact' | 'likely' | 'possible';
}

interface CodeLookupResult {
  success: boolean;
  code: string;
  normalizedCode: string;
  forward: HtsCodeMapping[];
  backward: HtsCodeMapping[];
  relatedChanges: HtsCodeChange[];
  hasChanges: boolean;
}

interface AllChangesResult {
  success: boolean;
  changes: HtsCodeChange[];
  count: number;
  meta: {
    availableYears: number[];
    affectedChapters: string[];
    changeTypes: string[];
  };
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  split: { label: 'Code Split', color: 'blue', icon: <GitBranch size={14} /> },
  merge: { label: 'Codes Merged', color: 'purple', icon: <GitMerge size={14} /> },
  rename: { label: 'Renamed', color: 'cyan', icon: <RefreshCw size={14} /> },
  added: { label: 'New Code', color: 'green', icon: <Plus size={14} /> },
  deleted: { label: 'Discontinued', color: 'red', icon: <Minus size={14} /> },
  rate_change: { label: 'Rate Changed', color: 'orange', icon: <RefreshCw size={14} /> },
  description_update: { label: 'Description Updated', color: 'default', icon: <FileText size={14} /> },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  exact: { label: 'Exact Match', color: 'green' },
  likely: { label: 'Likely Match', color: 'blue' },
  possible: { label: 'Possible Match', color: 'orange' },
};

export const HTSHistoryLookup: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<CodeLookupResult | null>(null);
  const [allChanges, setAllChanges] = useState<AllChangesResult | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('lookup');

  // Fetch all changes on mount
  React.useEffect(() => {
    fetchAllChanges();
  }, []);

  const fetchAllChanges = async (year?: number, chapter?: string) => {
    setLoading(true);
    try {
      let url = '/api/hts-history';
      const params = new URLSearchParams();
      if (year) params.set('year', year.toString());
      if (chapter) params.set('chapter', chapter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAllChanges(data);
      }
    } catch (error) {
      console.error('Failed to fetch HTS changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeLookup = useCallback(async () => {
    if (!searchCode.trim()) return;
    
    setLoading(true);
    setLookupResult(null);
    
    try {
      const response = await fetch(`/api/hts-history?code=${encodeURIComponent(searchCode.trim())}`);
      const data = await response.json();
      if (data.success) {
        setLookupResult(data);
      }
    } catch (error) {
      console.error('Failed to lookup HTS code:', error);
    } finally {
      setLoading(false);
    }
  }, [searchCode]);

  const handleYearFilter = (year: number | null) => {
    setSelectedYear(year);
    if (year) {
      fetchAllChanges(year, selectedChapter || undefined);
    } else {
      fetchAllChanges(undefined, selectedChapter || undefined);
    }
  };

  const handleChapterFilter = (chapter: string | null) => {
    setSelectedChapter(chapter);
    if (chapter) {
      fetchAllChanges(selectedYear || undefined, chapter);
    } else {
      fetchAllChanges(selectedYear || undefined, undefined);
    }
  };

  const renderChangeTypeTag = (changeType: string) => {
    const config = CHANGE_TYPE_CONFIG[changeType] || { label: changeType, color: 'default', icon: null };
    return (
      <Tag color={config.color} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Tag>
    );
  };

  const renderMappingResult = (mappings: HtsCodeMapping[], direction: 'forward' | 'backward') => {
    if (mappings.length === 0) return null;

    const isForward = direction === 'forward';
    const title = isForward ? 'Current Code(s)' : 'Previous Code(s)';
    const description = isForward 
      ? 'This old code now maps to:' 
      : 'This code was previously:';
    const icon = isForward ? <ArrowRight size={16} /> : <ArrowLeft size={16} />;

    return (
      <Card 
        size="small" 
        title={
          <Space>
            {icon}
            <span>{title}</span>
          </Space>
        }
        className="mb-4"
      >
        <Text type="secondary" className="block mb-3">{description}</Text>
        <Space direction="vertical" className="w-full">
          {mappings.map((mapping, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <Space direction="vertical" size={0}>
                <Text strong className="font-mono text-lg">
                  {formatHtsCode(isForward ? mapping.newCode : mapping.oldCode)}
                </Text>
                <Space size={4}>
                  {renderChangeTypeTag(mapping.changeType)}
                  <Tag color={CONFIDENCE_CONFIG[mapping.confidence]?.color || 'default'}>
                    {CONFIDENCE_CONFIG[mapping.confidence]?.label || mapping.confidence}
                  </Tag>
                </Space>
              </Space>
              <Text type="secondary">
                <Calendar size={12} className="inline mr-1" />
                {new Date(mapping.effectiveDate).toLocaleDateString()}
              </Text>
            </div>
          ))}
        </Space>
      </Card>
    );
  };

  const renderRelatedChanges = (changes: HtsCodeChange[]) => {
    if (changes.length === 0) return null;

    return (
      <Card size="small" title={<Space><History size={16} /><span>Change History</span></Space>}>
        <Timeline
          items={changes.map((change) => ({
            color: CHANGE_TYPE_CONFIG[change.changeType]?.color || 'gray',
            children: (
              <div className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                  {renderChangeTypeTag(change.changeType)}
                  <Text type="secondary">
                    {new Date(change.effectiveDate).toLocaleDateString()}
                  </Text>
                </div>
                
                {change.oldCodes.length > 0 && (
                  <div className="text-sm">
                    <Text type="secondary">From: </Text>
                    <Text code>{change.oldCodes.map(c => formatHtsCode(c)).join(', ')}</Text>
                  </div>
                )}
                
                {change.newCodes.length > 0 && (
                  <div className="text-sm">
                    <Text type="secondary">To: </Text>
                    <Text code>{change.newCodes.map(c => formatHtsCode(c)).join(', ')}</Text>
                  </div>
                )}
                
                {change.reason && (
                  <Text type="secondary" className="text-sm block mt-1">
                    {change.reason}
                  </Text>
                )}
                
                {change.federalRegister && (
                  <a 
                    href={`https://www.federalregister.gov/documents/search?conditions[term]=${change.federalRegister}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink size={10} />
                    {change.federalRegister}
                  </a>
                )}
              </div>
            ),
          }))}
        />
      </Card>
    );
  };

  const renderLookupTab = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <Title level={5} className="mb-4">
          <Search size={18} className="inline mr-2" />
          HTS Code Lookup
        </Title>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Enter HTS code (e.g., 8471.30.0100 or 84713001)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onPressEnter={handleCodeLookup}
            prefix={<Search size={16} className="text-gray-400" />}
            className="flex-1"
            size="large"
          />
          <Button
            type="primary"
            onClick={handleCodeLookup}
            loading={loading}
            size="large"
            className="bg-teal-600 hover:bg-teal-700"
          >
            Look Up History
          </Button>
        </div>
        
        <Alert
          type="info"
          showIcon
          icon={<Info size={16} />}
          message="Enter an HTS code to see if it has changed over time"
          description="We'll show you what the code maps to now (if it was old) and what it used to be (if it's current)."
          className="bg-teal-50 border-teal-200"
        />
      </Card>

      {/* Results */}
      {loading && (
        <Card className="text-center py-8">
          <Spin size="large" />
          <Text className="block mt-4">Looking up code history...</Text>
        </Card>
      )}

      {lookupResult && !loading && (
        <div className="space-y-4">
          {!lookupResult.hasChanges ? (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircle size={16} />}
              message="No Changes Found"
              description={
                <span>
                  The code <Text code>{formatHtsCode(lookupResult.code)}</Text> has no recorded 
                  changes in our database from 2020-present. It appears to be stable.
                </span>
              }
            />
          ) : (
            <>
              {/* Forward mappings (old → new) */}
              {lookupResult.forward.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<AlertTriangle size={16} />}
                  message="This code has been updated"
                  description="The code you entered has been changed. See the current equivalent below."
                  className="mb-4"
                />
              )}
              {renderMappingResult(lookupResult.forward, 'forward')}
              
              {/* Backward mappings (new ← old) */}
              {lookupResult.backward.length > 0 && (
                <Alert
                  type="info"
                  showIcon
                  message="This code has a history"
                  description="This code was created from previous code(s). See the history below."
                  className="mb-4"
                />
              )}
              {renderMappingResult(lookupResult.backward, 'backward')}
              
              {/* Related changes timeline */}
              {renderRelatedChanges(lookupResult.relatedChanges)}
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderBrowseTab = () => {
    const columns = [
      {
        title: 'Date',
        dataIndex: 'effectiveDate',
        key: 'effectiveDate',
        width: 120,
        render: (date: string) => new Date(date).toLocaleDateString(),
        sorter: (a: HtsCodeChange, b: HtsCodeChange) => 
          new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
      },
      {
        title: 'Type',
        dataIndex: 'changeType',
        key: 'changeType',
        width: 150,
        render: (type: string) => renderChangeTypeTag(type),
        filters: Object.entries(CHANGE_TYPE_CONFIG).map(([key, config]) => ({
          text: config.label,
          value: key,
        })),
        onFilter: (value: React.Key | boolean, record: HtsCodeChange) => 
          record.changeType === value,
      },
      {
        title: 'From',
        dataIndex: 'oldCodes',
        key: 'oldCodes',
        render: (codes: string[], record: HtsCodeChange) => (
          <div>
            {codes.length > 0 ? (
              <Space direction="vertical" size={0}>
                {codes.map((code, idx) => (
                  <Text key={idx} code className="text-xs">
                    {formatHtsCode(code)}
                  </Text>
                ))}
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </div>
        ),
      },
      {
        title: '',
        key: 'arrow',
        width: 40,
        render: () => <ChevronRight size={16} className="text-gray-400" />,
      },
      {
        title: 'To',
        dataIndex: 'newCodes',
        key: 'newCodes',
        render: (codes: string[], record: HtsCodeChange) => (
          <div>
            {codes.length > 0 ? (
              <Space direction="vertical" size={0}>
                {codes.map((code, idx) => (
                  <Text key={idx} code className="text-xs">
                    {formatHtsCode(code)}
                  </Text>
                ))}
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </div>
        ),
      },
      {
        title: 'Chapter',
        dataIndex: 'chapter',
        key: 'chapter',
        width: 80,
        render: (chapter: string) => <Tag>{chapter}</Tag>,
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        key: 'reason',
        ellipsis: true,
        render: (reason: string) => (
          <Tooltip title={reason}>
            <Text type="secondary" className="text-sm">
              {reason || '—'}
            </Text>
          </Tooltip>
        ),
      },
      {
        title: 'Reference',
        dataIndex: 'federalRegister',
        key: 'federalRegister',
        width: 120,
        render: (fr: string) => fr ? (
          <a
            href={`https://www.federalregister.gov/documents/search?conditions[term]=${fr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline text-xs flex items-center gap-1"
          >
            <ExternalLink size={10} />
            {fr}
          </a>
        ) : <Text type="secondary">—</Text>,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8}>
              <label className="text-sm text-gray-500 block mb-1">Filter by Year</label>
              <Select
                placeholder="All Years"
                value={selectedYear}
                onChange={handleYearFilter}
                allowClear
                className="w-full"
                options={allChanges?.meta?.availableYears?.map(y => ({
                  label: y.toString(),
                  value: y,
                })) || []}
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="text-sm text-gray-500 block mb-1">Filter by Chapter</label>
              <Select
                placeholder="All Chapters"
                value={selectedChapter}
                onChange={handleChapterFilter}
                allowClear
                className="w-full"
                options={allChanges?.meta?.affectedChapters?.map(ch => ({
                  label: `Chapter ${ch}`,
                  value: ch,
                })) || []}
              />
            </Col>
            <Col xs={24} sm={8} className="flex items-end">
              <Statistic 
                title="Total Changes" 
                value={allChanges?.count || 0}
                className="text-right w-full"
              />
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card>
          <Table
            dataSource={allChanges?.changes || []}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: <Empty description="No HTS code changes found" />,
            }}
            expandable={{
              expandedRowRender: (record: HtsCodeChange) => (
                <div className="p-4 bg-gray-50 rounded">
                  {record.oldDescriptions && record.oldDescriptions.length > 0 && (
                    <div className="mb-3">
                      <Text strong className="text-sm">Previous Description(s):</Text>
                      <ul className="list-disc list-inside mt-1">
                        {record.oldDescriptions.map((desc, idx) => (
                          <li key={idx} className="text-sm text-gray-600">{desc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {record.newDescriptions && record.newDescriptions.length > 0 && (
                    <div className="mb-3">
                      <Text strong className="text-sm">New Description(s):</Text>
                      <ul className="list-disc list-inside mt-1">
                        {record.newDescriptions.map((desc, idx) => (
                          <li key={idx} className="text-sm text-gray-600">{desc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {record.notes && (
                    <div>
                      <Text strong className="text-sm">Notes:</Text>
                      <Paragraph className="text-sm text-gray-600 mt-1 mb-0">
                        {record.notes}
                      </Paragraph>
                    </div>
                  )}
                </div>
              ),
              rowExpandable: (record: HtsCodeChange) => 
                !!(record.oldDescriptions?.length || record.newDescriptions?.length || record.notes),
            }}
          />
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title level={3} className="mb-2 flex items-center gap-2">
          <History className="text-teal-600" />
          HTS Code History
        </Title>
        <Paragraph type="secondary">
          Track HTS code changes over time. Find what old codes map to now, or see what current codes used to be.
        </Paragraph>
      </div>

      {/* Stats */}
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic 
              title="Total Changes" 
              value={allChanges?.count || 0}
              prefix={<History size={16} className="text-teal-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic 
              title="Years Covered" 
              value={allChanges?.meta?.availableYears?.length || 0}
              prefix={<Calendar size={16} className="text-blue-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic 
              title="Chapters Affected" 
              value={allChanges?.meta?.affectedChapters?.length || 0}
              prefix={<BookOpen size={16} className="text-purple-600" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic 
              title="Change Types" 
              value={allChanges?.meta?.changeTypes?.length || 0}
              prefix={<GitBranch size={16} className="text-orange-600" />}
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
            key: 'lookup',
            label: (
              <Space>
                <Search size={16} />
                Code Lookup
              </Space>
            ),
            children: renderLookupTab(),
          },
          {
            key: 'browse',
            label: (
              <Space>
                <History size={16} />
                Browse All Changes
              </Space>
            ),
            children: renderBrowseTab(),
          },
        ]}
      />

      {/* External Resources */}
      <Card size="small" title="External Resources">
        <Space wrap>
          <Button
            type="link"
            href="https://hts.usitc.gov/"
            target="_blank"
            icon={<ExternalLink size={14} />}
          >
            USITC HTS Database
          </Button>
          <Button
            type="link"
            href="https://www.federalregister.gov/agencies/international-trade-commission"
            target="_blank"
            icon={<ExternalLink size={14} />}
          >
            Federal Register - ITC
          </Button>
          <Button
            type="link"
            href="https://www.cbp.gov/trade/rulings"
            target="_blank"
            icon={<ExternalLink size={14} />}
          >
            CBP Rulings
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default HTSHistoryLookup;
