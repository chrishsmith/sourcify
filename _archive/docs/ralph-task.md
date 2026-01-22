---
task: Sourcify Phase 0 - Foundation
test_command: "npm run build"
---

# Sourcify Phase 0: Foundation & Polish

Work through each story sequentially. Complete one story fully before moving to the next.

---

## Story 1: Products Table Displays Data
**Status:** [x] Complete

### Description
The My Products page at `/dashboard/products` should display saved products in a table.

### Files to Modify
- `src/features/compliance/components/ClassificationsTable.tsx`

### Acceptance Criteria
- [x] Table has columns: Product, HTS Code, Country, Duty Rate, Date Saved
- [x] HTS codes formatted with dots using `formatHtsCode()` from `src/utils/htsFormatting.ts`
- [x] `npm run build` passes

### Implementation
```typescript
// In ClassificationsTable.tsx, ensure columns are:
const columns = [
  { title: 'Product', dataIndex: 'description', key: 'description' },
  { title: 'HTS Code', dataIndex: 'htsCode', key: 'htsCode', 
    render: (code: string) => formatHtsCode(code) },
  { title: 'Country', dataIndex: 'countryOfOrigin', key: 'country' },
  { title: 'Duty Rate', dataIndex: 'effectiveDutyRate', key: 'duty',
    render: (rate: number) => rate ? `${rate}%` : '-' },
  { title: 'Saved', dataIndex: 'createdAt', key: 'date',
    render: (date: string) => new Date(date).toLocaleDateString() },
];
```

### When Complete
Change `[ ] Not Started` above to `[x] Complete`, then commit:
```bash
git add -A && git commit -m "feat: products table displays formatted data"
```

---

## Story 2: Empty State for No Products
**Status:** [x] Complete

### Description
When user has no saved products, show a helpful empty state instead of an empty table.

### Files to Modify
- `src/features/compliance/components/ClassificationsTable.tsx`

### Acceptance Criteria
- [x] Empty state shows "No products saved yet" message
- [x] Includes button linking to `/dashboard/classify`
- [x] `npm run build` passes

### Implementation
```typescript
import { Empty, Button } from 'antd';

// In render, before the Table:
if (!loading && products.length === 0) {
  return (
    <Empty
      description="No products saved yet"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      <Button type="primary" href="/dashboard/classify">
        Classify Your First Product
      </Button>
    </Empty>
  );
}
```

### When Complete
Change status to `[x] Complete`, commit:
```bash
git add -A && git commit -m "feat: empty state for products list"
```

---

## Story 3: Loading State
**Status:** [x] Complete

### Description
Show a loading skeleton while products are being fetched.

### Files to Modify
- `src/features/compliance/components/ClassificationsTable.tsx`

### Acceptance Criteria
- [x] Skeleton shown while `loading` is true
- [x] Skeleton disappears when data loads
- [x] `npm run build` passes

### Implementation
```typescript
import { Skeleton } from 'antd';

// In render:
if (loading) {
  return <Skeleton active paragraph={{ rows: 5 }} />;
}
```

### When Complete
Change status to `[x] Complete`, commit:
```bash
git add -A && git commit -m "feat: loading skeleton for products"
```

---

## Story 4: Delete Product
**Status:** [x] Complete

### Description
User can delete a saved product with confirmation.

### Files to Modify
- `src/features/compliance/components/ClassificationsTable.tsx`

### Acceptance Criteria
- [x] Delete button on each row
- [x] Clicking shows confirmation modal
- [x] Confirming calls `DELETE /api/saved-products/[id]`
- [x] Row removed from table after delete
- [x] Success message shown
- [x] `npm run build` passes

### Implementation
```typescript
import { Modal, message, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const handleDelete = (id: string) => {
  Modal.confirm({
    title: 'Delete Product?',
    content: 'This cannot be undone.',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      const res = await fetch(`/api/saved-products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        message.success('Product deleted');
      } else {
        message.error('Failed to delete');
      }
    },
  });
};

// Add to columns:
{
  title: '',
  key: 'actions',
  width: 50,
  render: (_, record) => (
    <Button 
      type="text" 
      danger 
      icon={<DeleteOutlined />}
      onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
    />
  ),
}
```

### When Complete
Change status to `[x] Complete`, commit:
```bash
git add -A && git commit -m "feat: delete product with confirmation"
```

---

## Story 5: Search Products
**Status:** [x] Complete

### Description
User can search/filter products by name or HTS code.

### Files to Modify
- `src/features/compliance/components/ClassificationsTable.tsx`

### Acceptance Criteria
- [x] Search input above table
- [x] Filters by product name OR HTS code
- [x] Case-insensitive search
- [x] `npm run build` passes

### Implementation
```typescript
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const [searchTerm, setSearchTerm] = useState('');

const filteredProducts = products.filter(p => {
  const term = searchTerm.toLowerCase();
  return (
    p.description?.toLowerCase().includes(term) ||
    p.htsCode?.toLowerCase().includes(term)
  );
});

// Above table:
<Input
  placeholder="Search by product or HTS code..."
  prefix={<SearchOutlined />}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{ marginBottom: 16, maxWidth: 400 }}
  allowClear
/>

// Use filteredProducts in table:
<Table dataSource={filteredProducts} ... />
```

### When Complete
Change status to `[x] Complete`, commit:
```bash
git add -A && git commit -m "feat: search products by name or HTS"
```

---

## Definition of Done

All stories complete when:
- [x] Story 1 complete
- [x] Story 2 complete  
- [x] Story 3 complete
- [x] Story 4 complete
- [x] Story 5 complete
- [x] `npm run build` passes
- [x] All changes committed
