# Phase 8: UI/UX 🎨

## Goals

- Create responsive, accessible user interface
- Implement dark mode and proper ARIA support
- Build efficient data tables with virtualization
- Design intuitive navigation and workflows

## Inputs

- All functional modules from previous phases
- UI/UX best practices and accessibility standards
- Performance requirements for large datasets

## Outputs

- Complete page components (Dashboard, Import, etc.)
- Responsive design system
- Accessibility compliance
- Dark mode support
- Virtualized data tables

## Tasks Checklist

### Page Components

- [ ] Create `/src/pages/Dashboard.tsx` with overview metrics
- [ ] Build `/src/pages/Import.tsx` with CSV upload flow
- [ ] Implement `/src/pages/Wheel.tsx` for lifecycle tracking
- [ ] Create `/src/pages/Lots.tsx` for tax lot management
- [ ] Build `/src/pages/Harvest.tsx` for tax-loss harvesting
- [ ] Implement `/src/pages/Settings.tsx` for configuration

### Reusable Components

- [ ] Create `/src/components/DataTable.tsx` with virtualization
- [ ] Build `/src/components/MetricCards.tsx` for key metrics
- [ ] Implement `/src/components/PayoffChart.tsx` with Recharts
- [ ] Create `/src/components/WhatIfTable.tsx` for scenario analysis
- [ ] Build `/src/components/RiskFlags.tsx` for alerts
- [ ] Implement `/src/components/LifecycleTimeline.tsx` visualization

### Design System

- [ ] Add responsive breakpoints and mobile support
- [ ] Implement dark/light mode toggle with persistence
- [ ] Set up basic global styles and CSS architecture
- [ ] Create loading states and error boundaries
- [ ] Build toast notification system
- [ ] Add progress indicators for long operations

### Accessibility

- [ ] Add ARIA labels and keyboard navigation
- [ ] Implement focus management and visual indicators
- [ ] Create high contrast mode for accessibility
- [ ] Add screen reader optimization
- [ ] Implement voice navigation support

## Page Architecture

### Dashboard Overview

```typescript
interface DashboardProps {
  totalPortfolioValue: number;
  unrealizedPL: number;
  realizedPL: number;
  activePositions: Position[];
  recentTrades: Trade[];
  upcomingExpirations: Trade[];
  riskAlerts: RiskFlag[];
}

const Dashboard: React.FC<DashboardProps> = ({
  totalPortfolioValue,
  unrealizedPL,
  realizedPL,
  activePositions,
  recentTrades,
  upcomingExpirations,
  riskAlerts
}) => {
  return (
    <div className="dashboard-container">
      <MetricCards
        portfolioValue={totalPortfolioValue}
        unrealizedPL={unrealizedPL}
        realizedPL={realizedPL}
      />
      <RiskFlags alerts={riskAlerts} />
      <PositionsSummary positions={activePositions} />
      <RecentActivity trades={recentTrades} />
      <ExpirationCalendar expirations={upcomingExpirations} />
    </div>
  );
};
```

### Import Page Flow

```typescript
interface ImportPageState {
  step: 'select' | 'preview' | 'mapping' | 'processing' | 'complete';
  files: File[];
  previewData: any[];
  mappingConfig: FieldMapping;
  importResults: ImportResult[];
  errors: ImportError[];
}

const ImportPage: React.FC = () => {
  const [state, setState] = useState<ImportPageState>({
    step: 'select',
    files: [],
    previewData: [],
    mappingConfig: {},
    importResults: [],
    errors: []
  });

  return (
    <div className="import-page">
      <ImportProgress currentStep={state.step} />

      {state.step === 'select' && (
        <UploadDropzone onFilesSelected={handleFilesSelected} />
      )}

      {state.step === 'preview' && (
        <DataPreview
          data={state.previewData}
          onApprove={handlePreviewApprove}
        />
      )}

      {/* Additional steps... */}
    </div>
  );
};
```

## Component Library

### Virtualized Data Table

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height: number;
  onRowSelect?: (row: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
}

interface Column<T> {
  key: keyof T;
  header: string;
  width: number;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

const DataTable = <T,>({
  data,
  columns,
  height,
  onRowSelect,
  sortable = true,
  filterable = true,
  exportable = true
}: DataTableProps<T>) => {
  // Use react-window or similar for virtualization
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});

  // Virtualization for large datasets
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    const row = data[index];
    return (
      <div style={style} className="table-row">
        {columns.map(col => (
          <div key={String(col.key)} className="table-cell">
            {col.render ? col.render(row[col.key], row) : row[col.key]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="data-table">
      <TableHeader columns={columns} />
      <FixedSizeList
        height={height}
        itemCount={data.length}
        itemSize={50}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};
```

### Metric Cards Component

```typescript
interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'currency' | 'percentage';
  status?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'currency',
  status = 'neutral',
  loading = false
}) => {
  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div className={`metric-card metric-card--${status}`}>
      <h3 className="metric-card__title">{title}</h3>
      <div className="metric-card__value">
        {typeof value === 'number' ? formatCurrency(value) : value}
      </div>

      {change !== undefined && (
        <div className={`metric-card__change metric-card__change--${status}`}>
          <ChangeIndicator value={change} type={changeType} />
        </div>
      )}
    </div>
  );
};
```

## Responsive Design System

### Breakpoint System

```css
/* Mobile-first responsive breakpoints */
:root {
  --breakpoint-sm: 640px; /* Small tablets */
  --breakpoint-md: 768px; /* Large tablets */
  --breakpoint-lg: 1024px; /* Laptops */
  --breakpoint-xl: 1280px; /* Desktops */
  --breakpoint-2xl: 1536px; /* Large desktops */
}

/* Container system */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

### Dark Mode Implementation

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check system preference and local storage
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

## Accessibility Features

### Keyboard Navigation

```typescript
const useKeyboardNavigation = (items: any[], onSelect: (item: any) => void) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;

        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => Math.min(items.length - 1, prev + 1));
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect(items[focusedIndex]);
          break;

        case 'Escape':
          event.preventDefault();
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex, setFocusedIndex };
};
```

### Screen Reader Support

```typescript
const ScreenReaderOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
);

const AccessibleTable: React.FC<TableProps> = ({ data, columns }) => (
  <table role="table" aria-label="Options trading data">
    <thead>
      <tr role="row">
        {columns.map(col => (
          <th
            key={col.key}
            role="columnheader"
            aria-sort={getSortDirection(col.key)}
          >
            {col.header}
            <ScreenReaderOnly>
              {getSortInstruction(col.key)}
            </ScreenReaderOnly>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, index) => (
        <tr key={index} role="row">
          {columns.map(col => (
            <td key={col.key} role="gridcell">
              {col.render ? col.render(row[col.key], row) : row[col.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
```

## Performance Optimizations

### Component Memoization

```typescript
const MemoizedDataTable = memo(DataTable, (prevProps, nextProps) => {
  // Custom equality check for performance
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.columns.length === nextProps.columns.length &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

const MemoizedMetricCard = memo(MetricCard);
const MemoizedPayoffChart = memo(PayoffChart);
```

### Lazy Loading

```typescript
// Lazy load heavy components
const LazyPayoffChart = lazy(() => import('./PayoffChart'));
const LazyLifecycleTimeline = lazy(() => import('./LifecycleTimeline'));

// Use Suspense for loading states
const ChartsSection: React.FC = () => (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyPayoffChart />
    <LazyLifecycleTimeline />
  </Suspense>
);
```

## Dependencies

- All functional phases (1-7) must be substantially complete
- Design system and component library choices

## Acceptance Tests

- [ ] All pages render correctly on desktop and mobile
- [ ] Dark mode works without visual artifacts
- [ ] Screen readers can navigate effectively
- [ ] Data tables perform well with 10k+ rows
- [ ] Keyboard navigation works for all interactions
- [ ] Loading states provide clear feedback
- [ ] Error messages are helpful and actionable
- [ ] Mobile experience is fully functional
- [ ] Touch gestures work on mobile devices
- [ ] High contrast mode improves accessibility

## Risks & Mitigations

- **Risk:** Poor performance with large datasets
  - **Mitigation:** Virtual scrolling, pagination, lazy loading
- **Risk:** Accessibility compliance gaps
  - **Mitigation:** ARIA testing, screen reader verification, accessibility audit
- **Risk:** Mobile usability issues
  - **Mitigation:** Mobile-first design, touch-friendly interactions

## Demo Script

```typescript
// Navigate through all pages
// Test responsive behavior at different screen sizes
// Toggle dark/light mode and verify no artifacts
// Test large data table performance (10k+ rows)
// Verify keyboard navigation with Tab/Arrow keys
// Check mobile layout on various devices
// Test screen reader compatibility
// Verify touch gestures on mobile
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Create basic page structure and routing

**Previous Phase:** [Phase 7 - Price Adapters](./phase-7-price-adapters.md)
**Next Phase:** [Phase 9 - Storage & Export](./phase-9-storage.md)
