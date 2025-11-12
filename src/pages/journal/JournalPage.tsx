import React, { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Heatmap } from '@/components/charts/Heatmap';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { EditEntryForm } from '@/components/EditEntryForm';
import { Input } from '@/components/ui/Input';
import { KeyboardShortcutsProvider } from '@/components/ui/KeyboardShortcuts';
import { Modal } from '@/components/ui/Modal';
import { Sidebar } from '@/components/ui/Sidebar';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { ToastContainer } from '@/components/ui/Toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { fmtDate, fmtMoney } from '@/lib/format';
import { JournalDrawer } from '@/pages/journal/components/drawers/JournalDrawer';
import { useJournal } from '@/store/journal';
import { useClientFilterStore } from '@/stores/useClientFilterStore';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useJournalUIStore } from '@/stores/useJournalUIStore';
import type { Entry } from '@/types/entry';
import { env } from '@/utils/env';

import { EntrySidebar } from './components/EntrySidebar';
import { FilterBar } from './components/filters/FilterBar';
import { SwipeableCard } from './components/SwipeableCard';
import { useWheelCalculations } from './hooks/useWheelCalculations';

/**
 * Professional Refactored Journal Page
 *
 * Architecture:
 * - Zustand stores for state management (useEntriesStore, useFilterStore)
 * - Component composition pattern (FilterBar, table components, modal)
 * - Custom hooks for calculations (useWheelCalculations)
 * - Database-level filtering with status logic in queryBuilder
 * - SQL.js persistence via stores
 *
 * Data flow and DB interactions:
 * - This page reads entries from useEntriesStore. When filters change, we call
 *   loadEntries(filters). That function (in the store) builds an SQL WHERE clause
 *   via src/db/queryBuilder.ts and executes a parameterized SELECT against the
 *   in-browser SQLite (sql.js) "journal" table. Results are set back into the store.
 * - Totals are computed in the store via a separate SQL SUM query that reuses the
 *   exact same WHERE clause so the totals always mirror the current filter.
 * - Creating a new entry calls addEntry(...), which uses a template to generate one
 *   or more JournalRow records, inserts them into the journal table, saves the DB,
 *   and finally triggers a reload (loadEntries) so the table reflects the change.
 */

const JournalPage: React.FC = () => {
  const {
    loadEntries,
    addEntry,
    entries,
    loading,
    deleteEntry,
    editEntry,
    getDeletedEntries,
    restoreEntry,
  } = useEntriesStore();
  const filters = useFilterStore();
  const { add: addLocal } = useJournal(); // For WheelModern compatibility

  const [open, setOpen] = useState(false);
  const [tmpl, setTmpl] = useState<
    'sellPut' | 'putAssigned' | 'sellCC' | 'callAssigned' | 'dividend' | 'fee'
  >('sellPut');

  // Form state
  const [symbol, setSymbol] = useState(() => {
    const lastSymbol = localStorage.getItem('journal_last_symbol');
    return lastSymbol || '';
  });
  const [date, setDate] = useState<string>(() => fmtDate(new Date()));
  const [contracts, setContracts] = useState(1);
  const [strike, setStrike] = useState<number>(100);
  const [expiration, setExpiration] = useState<string>(() => fmtDate(new Date()));
  const [premium, setPremium] = useState<number>(1.0);
  const [amount, setAmount] = useState<number>(0);
  const [fee, setFee] = useState<number>(0.0);
  const [notes, setNotes] = useState<string>('');

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Symbol autocomplete
  const uniqueSymbols = React.useMemo(() => {
    const symbols = new Set<string>();
    entries.forEach(e => {
      if (e.symbol) symbols.add(e.symbol.toUpperCase());
    });
    return Array.from(symbols).sort();
  }, [entries]);

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredSymbols, setFilteredSymbols] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (symbol && symbol.length > 0) {
      const filtered = uniqueSymbols
        .filter(s => s.toLowerCase().startsWith(symbol.toLowerCase()))
        .slice(0, 5);
      setFilteredSymbols(filtered);
      setShowAutocomplete(filtered.length > 0 && symbol.toUpperCase() !== filtered[0]);
    } else {
      setFilteredSymbols(uniqueSymbols.slice(0, 5));
      setShowAutocomplete(uniqueSymbols.length > 0);
    }
  }, [symbol, uniqueSymbols]);

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const openDrawer = useJournalUIStore(s => s.openEdit);

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deletedEntries, setDeletedEntries] = useState<Entry[]>([]);

  // Notes expansion state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Expanded rows state (for full details)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Collapsed entries state (for hiding related expiration entries)
  // Initialize with all opening entries that have related expiration entries (default to collapsed)
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(() => {
    // This will be initialized after entries are loaded
    return new Set();
  });

  // Sidebar state
  const [sidebarEntry, setSidebarEntry] = useState<Entry | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // View preferences
  const [viewMode] = useState<'compact' | 'detailed' | 'heatmap'>(() => {
    const saved = localStorage.getItem('journal_view_mode');
    return saved === 'compact' || saved === 'detailed' || saved === 'heatmap' ? saved : 'detailed';
  });

  // Charts visibility
  const [showCharts] = useState<boolean>(() => {
    const saved = localStorage.getItem('journal_show_charts');
    return saved === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('journal_show_charts', String(showCharts));
  }, [showCharts]);

  /**
   * Identify related entries (opening trade + expiration pairs)
   * For sell_to_open entries, find matching expiration entries with same symbol, strike, and expiration date
   */
  const findRelatedEntries = React.useMemo(() => {
    const relationMap = new Map<string, Entry[]>(); // opening entry ID -> related entries

    // Find all sell_to_open entries
    const openingEntries = entries.filter(
      e =>
        e.type === 'sell_to_open' && !e.deleted_at && e.symbol && e.strike !== null && e.expiration
    );

    // Find all expiration entries
    const expirationEntries = entries.filter(
      e => e.type === 'expiration' && !e.deleted_at && e.symbol && e.strike !== null && e.expiration
    );

    // Match opening entries with their expiration entries
    openingEntries.forEach(opening => {
      const related: Entry[] = [];

      // Find matching expiration entry
      // Match on symbol, strike, and expiration date
      // Optionally check meta.closes field if available
      const matchingExpiration = expirationEntries.find(
        exp =>
          exp.symbol === opening.symbol &&
          exp.strike === opening.strike &&
          exp.expiration === opening.expiration &&
          // If meta.closes exists, it should match; otherwise just match on symbol/strike/expiration
          (!exp.meta ||
            typeof exp.meta !== 'object' ||
            !('closes' in exp.meta) ||
            exp.meta.closes === 'sell_to_open')
      );

      if (matchingExpiration) {
        related.push(matchingExpiration);
        relationMap.set(opening.id, related);
      }
    });

    return relationMap;
  }, [entries]);

  // Initialize collapsed state when entries change (default to collapsed for entries with related expiration)
  React.useEffect(() => {
    if (entries.length > 0) {
      setCollapsedEntries(prev => {
        const newSet = new Set(prev);
        // Add all opening entries that have related expiration entries to collapsed set
        findRelatedEntries.forEach((_, openingId) => {
          if (!newSet.has(openingId)) {
            newSet.add(openingId);
          }
        });
        return newSet;
      });
    }
  }, [entries.length, findRelatedEntries]);

  // Calculate trend indicators (month-over-month)
  const premiumTrend = React.useMemo(() => {
    const now = new Date();
    const thisMonth = entries
      .filter(e => {
        const date = new Date(e.ts);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (e.type === 'sell_to_open' && e.amount > 0 ? e.amount : 0), 0);

    const lastMonth = entries
      .filter(e => {
        const date = new Date(e.ts);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return (
          date.getMonth() === lastMonthDate.getMonth() &&
          date.getFullYear() === lastMonthDate.getFullYear()
        );
      })
      .reduce((sum, e) => sum + (e.type === 'sell_to_open' && e.amount > 0 ? e.amount : 0), 0);

    if (lastMonth === 0) return undefined;
    return ((thisMonth - lastMonth) / lastMonth) * 100;
  }, [entries]);

  const pnlTrend = React.useMemo(() => {
    const now = new Date();
    const thisMonth = entries.reduce((sum, e) => {
      const date = new Date(e.ts);
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        return sum + e.amount;
      }
      return sum;
    }, 0);

    const lastMonth = entries.reduce((sum, e) => {
      const date = new Date(e.ts);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      if (
        date.getMonth() === lastMonthDate.getMonth() &&
        date.getFullYear() === lastMonthDate.getFullYear()
      ) {
        return sum + e.amount;
      }
      return sum;
    }, 0);

    if (lastMonth === 0) return undefined;
    return ((thisMonth - lastMonth) / Math.abs(lastMonth)) * 100;
  }, [entries]);

  // Prepare chart data
  const premiumChartData = React.useMemo(() => {
    const byDate = new Map<string, number>();
    entries.forEach(entry => {
      if (entry.type === 'sell_to_open' && entry.amount > 0) {
        const date = fmtDate(entry.ts);
        byDate.set(date, (byDate.get(date) || 0) + entry.amount);
      }
    });
    const sorted = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30); // Last 30 days

    return sorted.map(([date, amount], i) => ({
      x: i,
      y: Math.round(amount * 100) / 100,
      label: date,
    }));
  }, [entries]);

  const pnlChartData = React.useMemo(() => {
    const bySymbol = new Map<string, number>();
    entries.forEach(entry => {
      bySymbol.set(entry.symbol, (bySymbol.get(entry.symbol) || 0) + entry.amount);
    });
    const sorted = Array.from(bySymbol.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Top 10 symbols

    return sorted.map(([symbol, pnl], i) => ({
      x: i,
      y: Math.round(pnl * 100) / 100,
      label: symbol,
    }));
  }, [entries]);

  // Heatmap data (always calculated, only rendered when viewMode === 'heatmap')
  const heatmapData = React.useMemo(() => {
    // Create heatmap data: symbol vs date
    const heatmapDataArray: Array<{ x: string; y: string; value: number; label?: string }> = [];
    const symbols = Array.from(new Set(entries.map(e => e.symbol))).sort();
    const dates = Array.from(new Set(entries.map(e => fmtDate(e.ts)))).sort();

    symbols.forEach(symbol => {
      dates.forEach(date => {
        const entriesForCell = entries.filter(e => e.symbol === symbol && fmtDate(e.ts) === date);
        const totalAmount = entriesForCell.reduce((sum, e) => sum + e.amount, 0);
        if (totalAmount !== 0 || entriesForCell.length > 0) {
          heatmapDataArray.push({
            x: symbol,
            y: date,
            value: totalAmount,
            label: `${symbol} on ${date}: ${fmtMoney(totalAmount)}`,
          });
        }
      });
    });

    return heatmapDataArray;
  }, [entries]);

  const heatmapXLabels = React.useMemo(
    () => Array.from(new Set(entries.map(e => e.symbol))).sort(),
    [entries]
  );
  const heatmapYLabels = React.useMemo(
    () => Array.from(new Set(entries.map(e => fmtDate(e.ts)))).sort(),
    [entries]
  );

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('journal_visible_columns');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set([
          'date',
          'symbol',
          'type',
          'qty',
          'strike',
          'exp',
          'dte',
          'stock',
          'amount',
          'notes',
          'delta',
          'iv_rank',
          'actions',
        ]);
      }
    }
    return new Set([
      'date',
      'symbol',
      'type',
      'qty',
      'strike',
      'exp',
      'dte',
      'stock',
      'amount',
      'notes',
      'delta',
      'iv_rank',
      'actions',
    ]);
  });

  // Save view preferences
  React.useEffect(() => {
    localStorage.setItem('journal_view_mode', viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    localStorage.setItem('journal_visible_columns', JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('journal_page_size');
    return saved ? Number(saved) : 50;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Grouped view state
  const [groupBy] = useState<'none' | 'symbol' | 'date'>(() => {
    const saved = localStorage.getItem('journal_group_by');
    return saved === 'none' || saved === 'symbol' || saved === 'date' ? saved : 'none';
  });

  React.useEffect(() => {
    localStorage.setItem('journal_group_by', groupBy);
  }, [groupBy]);

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Enhanced search - filter client-side for notes, type, amount
  const searchTerm = filters.symbol.toLowerCase();
  const filteredEntries = React.useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return entries;

    return entries.filter(entry => {
      const symbolMatch = entry.symbol.toLowerCase().includes(searchTerm);
      const notesMatch = entry.notes?.toLowerCase().includes(searchTerm);
      const typeMatch = entry.type.toLowerCase().includes(searchTerm);
      const amountMatch = Math.abs(entry.amount).toString().includes(searchTerm);

      return symbolMatch || notesMatch || typeMatch || amountMatch;
    });
  }, [entries, searchTerm]);

  // Amount range filter from client filter store
  const { minAmount, maxAmount } = useClientFilterStore();

  // Apply amount range filter
  const amountFilteredEntries = React.useMemo(() => {
    if (minAmount === null && maxAmount === null) return filteredEntries;

    return filteredEntries.filter(entry => {
      if (minAmount !== null && entry.amount < minAmount) return false;
      if (maxAmount !== null && entry.amount > maxAmount) return false;
      return true;
    });
  }, [filteredEntries, minAmount, maxAmount]);

  const sortedEntries = React.useMemo(() => {
    const source = amountFilteredEntries;
    if (!sortField) return source;

    const sorted = [...source].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.ts).getTime();
          bVal = new Date(b.ts).getTime();
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'strike':
          aVal = a.strike ?? 0;
          bVal = b.strike ?? 0;
          break;
        case 'dte': {
          const aDte = a.expiration
            ? Math.ceil((new Date(a.expiration).getTime() - new Date(a.ts).getTime()) / 86400000)
            : null;
          const bDte = b.expiration
            ? Math.ceil((new Date(b.expiration).getTime() - new Date(b.ts).getTime()) / 86400000)
            : null;
          aVal = aDte ?? 9999;
          bVal = bDte ?? 9999;
          break;
        }
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [amountFilteredEntries, sortField, sortDirection]);

  // Group entries
  const groupedEntries = React.useMemo(() => {
    if (groupBy === 'none') return null;

    const groups = new Map<string, Entry[]>();

    amountFilteredEntries.forEach(entry => {
      let key: string;
      if (groupBy === 'symbol') {
        key = entry.symbol;
      } else if (groupBy === 'date') {
        key = fmtDate(entry.ts);
      } else {
        key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    return Array.from(groups.entries()).map(([key, entries]) => {
      const sorted = sortField
        ? [...entries].sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;

            switch (sortField) {
              case 'date':
                aVal = new Date(a.ts).getTime();
                bVal = new Date(b.ts).getTime();
                break;
              case 'symbol':
                aVal = a.symbol;
                bVal = b.symbol;
                break;
              case 'amount':
                aVal = a.amount;
                bVal = b.amount;
                break;
              case 'strike':
                aVal = a.strike ?? 0;
                bVal = b.strike ?? 0;
                break;
              case 'dte': {
                const aDte = a.expiration
                  ? Math.ceil(
                      (new Date(a.expiration).getTime() - new Date(a.ts).getTime()) / 86400000
                    )
                  : null;
                const bDte = b.expiration
                  ? Math.ceil(
                      (new Date(b.expiration).getTime() - new Date(b.ts).getTime()) / 86400000
                    )
                  : null;
                aVal = aDte ?? 9999;
                bVal = bDte ?? 9999;
                break;
              }
              default:
                return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          })
        : entries;

      const total = entries.reduce((sum, e) => sum + e.amount, 0);
      const count = entries.length;

      return { key, entries: sorted, total, count };
    });
  }, [amountFilteredEntries, groupBy, sortField, sortDirection]);

  /**
   * Helper function to check if an expiration entry should be hidden
   * (because its opening entry is collapsed)
   */
  const shouldHideExpirationEntry = React.useCallback(
    (entry: Entry): boolean => {
      if (entry.type !== 'expiration') return false;

      // Find the opening entry that this expiration entry relates to
      for (const [openingId, relatedEntries] of findRelatedEntries.entries()) {
        if (relatedEntries.some(rel => rel.id === entry.id)) {
          // This expiration entry is related to this opening entry
          // Hide it if the opening entry is collapsed
          return collapsedEntries.has(openingId);
        }
      }

      return false;
    },
    [findRelatedEntries, collapsedEntries]
  );

  // Calculate pagination - use grouped entries if grouped, otherwise sorted entries
  // Filter out expiration entries that should be hidden
  const entriesToPaginate = React.useMemo(() => {
    const baseEntries =
      groupBy === 'none' ? sortedEntries : (groupedEntries?.flatMap(g => g.entries) ?? []);
    // Filter out expiration entries that are collapsed
    return baseEntries.filter(entry => !shouldHideExpirationEntry(entry));
  }, [groupBy, sortedEntries, groupedEntries, shouldHideExpirationEntry]);
  const totalPages = Math.ceil(entriesToPaginate.length / pageSize);
  const paginatedEntries = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return entriesToPaginate.slice(start, end);
  }, [entriesToPaginate, currentPage, pageSize]);

  // For grouped view, paginate at group level
  const paginatedGroups = React.useMemo(() => {
    if (groupBy === 'none' || !groupedEntries) return null;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return groupedEntries.slice(start, end);
  }, [groupedEntries, currentPage, pageSize, groupBy]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters.symbol, filters.type, filters.from, filters.to, filters.status, sortField]);

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await loadEntries(filters);
    },
    threshold: 80,
    disabled: loading,
  });

  // Bulk selection state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Toast notifications
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type?: 'success' | 'error' | 'info' | 'warning';
      undo?: () => void;
    }>
  >([]);

  const showToast = (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    undo?: () => void
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, undo }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        // Search input is now in AppHeader
      } else if (e.key === 'Escape') {
        if (open) {
          setOpen(false);
        }
        if (editModalOpen) {
          setEditModalOpen(false);
          setEditingEntry(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, editModalOpen]);

  // Listen for new entry event from AppHeader
  React.useEffect(() => {
    const handleNewEntry = () => {
      setOpen(true);
    };
    window.addEventListener('journal:new-entry', handleNewEntry);
    return () => {
      window.removeEventListener('journal:new-entry', handleNewEntry);
    };
  }, []);

  // Load entries on mount and when filters change
  useEffect(() => {
    // When any primitive filter changes, fetch matching rows from the DB.
    // Internally: useEntriesStore.loadEntries -> buildWhere(filters) -> SELECT ... FROM journal
    loadEntries({
      symbol: filters.symbol,
      type: filters.type,
      from: filters.from,
      to: filters.to,
      status: filters.status,
    });
  }, [filters.symbol, filters.type, filters.from, filters.to, filters.status, loadEntries]);

  // Load deleted entries when tab switches to deleted
  useEffect(() => {
    if (activeTab === 'deleted') {
      const fetchDeleted = async () => {
        const deleted = await getDeletedEntries();
        setDeletedEntries(deleted);
      };
      fetchDeleted();
    }
  }, [activeTab, getDeletedEntries]);

  // Calculate wheel metrics
  const wheelCalcs = useWheelCalculations(entries);

  // Delete handler
  const handleDeleteClick = async (entry: Entry) => {
    const confirmed = window.confirm(
      `Delete entry for ${entry.symbol}?\n\n` +
        `Date: ${entry.ts}\n` +
        `Type: ${entry.type}\n\n` +
        `This will soft-delete the entry (can be restored later).`
    );

    if (!confirmed) return;

    try {
      const deletedEntry = { ...entry };
      await deleteEntry(entry.id, 'Deleted by user from Journal page');

      // Show toast with undo functionality
      const undoHandler = async () => {
        try {
          await restoreEntry(deletedEntry.id);
          showToast(`Entry for ${deletedEntry.symbol} restored`, 'success');
        } catch (err) {
          showToast(
            `Failed to restore: ${err instanceof Error ? err.message : String(err)}`,
            'error'
          );
        }
      };

      showToast(`Entry for ${entry.symbol} deleted successfully`, 'success', undoHandler);

      // Clear undo option after 5 seconds
      setTimeout(() => {
        setToasts(prev =>
          prev.map(toast => (toast.undo === undoHandler ? { ...toast, undo: undefined } : toast))
        );
      }, 5000);
    } catch (err) {
      showToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  /* TODO: Export to CSV - wire up to UI button
  const handleExportCSV = () => {
    const headers = ['Date', 'Symbol', 'Type', 'Qty', 'Strike', 'Expiration', 'DTE', 'Stock Price', 'Amount', 'Notes', 'Delta', 'IV Rank'];
    const rows = sortedEntries.map(entry => {
      const dte = entry.expiration
        ? Math.ceil((new Date(entry.expiration).getTime() - new Date(entry.ts).getTime()) / 86400000)
        : '';
      const delta = entry.meta && typeof entry.meta === 'object' && 'delta' in entry.meta
        ? (typeof entry.meta.delta === 'number' ? entry.meta.delta.toFixed(2) : '')
        : '';
      const ivRank = entry.meta && typeof entry.meta === 'object' && 'iv_rank' in entry.meta
        ? (typeof entry.meta.iv_rank === 'number' ? entry.meta.iv_rank : '')
        : '';
      
      return [
        fmtDate(entry.ts),
        entry.symbol,
        entry.type.replace(/_/g, ' '),
        entry.qty ?? '',
        entry.strike ? entry.strike.toFixed(2) : '',
        entry.expiration ? fmtDate(entry.expiration) : '',
        dte,
        entry.underlying_price ? entry.underlying_price.toFixed(2) : '',
        entry.amount.toFixed(2),
        entry.notes ?? '',
        delta,
        ivRank,
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journal-export-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Journal exported to CSV successfully', 'success');
  };
  */

  // Edit handler
  // Handle sidebar open
  const handleSidebarOpen = (entry: Entry) => {
    setSidebarEntry(entry);
    setIsSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    setSidebarEntry(null);
  };

  // Calculate related entries for sidebar
  const relatedEntries = React.useMemo(() => {
    if (!sidebarEntry) return [];

    // Find entries with same symbol, strike, and expiration
    return entries
      .filter(
        e =>
          e.id !== sidebarEntry.id &&
          e.symbol === sidebarEntry.symbol &&
          e.strike === sidebarEntry.strike &&
          e.expiration === sidebarEntry.expiration
      )
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [sidebarEntry, entries]);

  const handleEditClick = (entry: Entry) => {
    if (env.features.journalEditDrawer) {
      openDrawer(entry);
      return;
    }
    setEditingEntry(entry);
    setEditModalOpen(true);
  };

  const handleEditSave = async (updates: Partial<Entry>, reason: string) => {
    if (!editingEntry) return;

    try {
      await editEntry(editingEntry.id, updates, reason);
      setEditModalOpen(false);
      setEditingEntry(null);
      showToast(`Entry for ${editingEntry.symbol} updated successfully`, 'success');
    } catch (err) {
      showToast(`Failed to edit: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Restore handler
  const handleRestoreClick = async (entry: Entry) => {
    const confirmed = window.confirm(
      `Restore entry for ${entry.symbol}?\n\n` +
        `Date: ${entry.ts}\n` +
        `Type: ${entry.type}\n\n` +
        `This will make the entry active again.`
    );

    if (!confirmed) return;

    try {
      await restoreEntry(entry.id);
      // Refresh deleted entries list
      const deleted = await getDeletedEntries();
      setDeletedEntries(deleted);
      showToast(`Entry for ${entry.symbol} restored successfully`, 'success');
    } catch (err) {
      showToast(`Failed to restore: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!symbol || symbol.trim() === '') {
      newErrors.symbol = 'Symbol is required';
    }

    if (!date) {
      newErrors.date = 'Trade date is required';
    }

    if (
      tmpl === 'sellPut' ||
      tmpl === 'sellCC' ||
      tmpl === 'putAssigned' ||
      tmpl === 'callAssigned'
    ) {
      if (contracts <= 0) {
        newErrors.contracts = 'Contracts must be greater than 0';
      }
      if (strike <= 0) {
        newErrors.strike = 'Strike must be greater than 0';
      }
      if ((tmpl === 'sellPut' || tmpl === 'sellCC') && expiration) {
        const expDate = new Date(expiration);
        const tradeDate = new Date(date);
        if (expDate <= tradeDate) {
          newErrors.expiration = 'Expiration date must be after trade date';
        }
      }
      if ((tmpl === 'sellPut' || tmpl === 'sellCC') && premium <= 0) {
        newErrors.premium = 'Premium must be greater than 0';
      }
    }

    if ((tmpl === 'dividend' || tmpl === 'fee') && amount === 0) {
      newErrors.amount = 'Amount must not be zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const base = { accountId: 'acct-1', symbol: symbol.toUpperCase(), date };

    try {
      // Persist new entry/entries:
      // - We update an in-memory wheel journal for compatibility (useJournal.add)
      // - We call useEntriesStore.addEntry with a template name; templates
      //   expand into concrete JournalRow records which are inserted into the
      //   SQLite journal table (see models/templates and db/sql.ts).
      // - After insert, the store saves the DB and reloads entries so the UI
      //   immediately reflects the new data under current filters.
      switch (tmpl) {
        case 'sellPut':
          addLocal({
            kind: 'sell_put',
            symbol: base.symbol,
            contracts,
            strike,
            premium,
            dte: Math.max(
              0,
              Math.ceil((new Date(expiration).getTime() - new Date(date).getTime()) / 86400000)
            ),
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplSellPut', {
            ...base,
            contracts,
            premiumPerContract: premium,
            strike,
            expiration,
            fee,
          });
          break;
        case 'sellCC':
          addLocal({
            kind: 'sell_call',
            symbol: base.symbol,
            contracts,
            strike,
            premium,
            dte: Math.max(
              0,
              Math.ceil((new Date(expiration).getTime() - new Date(date).getTime()) / 86400000)
            ),
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplSellCoveredCall', {
            ...base,
            contracts,
            premiumPerContract: premium,
            strike,
            expiration,
            fee,
          });
          break;
        case 'putAssigned':
          addLocal({
            kind: 'put_assigned',
            symbol: base.symbol,
            contracts,
            price: strike,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplPutAssigned', { ...base, contracts, strike, expiration, fee });
          break;
        case 'callAssigned':
          addLocal({
            kind: 'call_assigned',
            symbol: base.symbol,
            contracts,
            price: strike,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplCallAssigned', { ...base, contracts, strike, expiration, fee });
          break;
        case 'dividend':
          addLocal({
            kind: 'dividend',
            symbol: base.symbol,
            when: new Date(date + 'T00:00:00').toISOString(),
            meta: { amount },
          });
          await addEntry('tmplDividend', { ...base, amount });
          break;
        case 'fee':
          addLocal({
            kind: 'fee',
            symbol: base.symbol,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: amount,
          });
          await addEntry('tmplFee', { ...base, amount });
          break;
      }

      setOpen(false);
      // Reset form
      setSymbol('');
      setDate(fmtDate(new Date()));
      setNotes('');
      setErrors({});
      // Save last used symbol
      if (symbol) {
        localStorage.setItem('journal_last_symbol', symbol.toUpperCase());
      }
      showToast(`Entry for ${base.symbol} created successfully`, 'success');
    } catch (error) {
      showToast('Failed to save entry: ' + (error as Error).message, 'error');
    }
  };

  return (
    <KeyboardShortcutsProvider>
      <div className="relative min-h-screen overflow-hidden text-zinc-100" style={{ backgroundColor: '#0B0F0E' }}>
        {/* Base background image layer - same as Wheel page */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'url(/goldcitypng.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
          }}
        />

        {/* Gold Spine Grid CSS overlay - same as Wheel page */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(60% 40% at 50% 120%, rgba(0,227,159,.18), transparent 60%),
              radial-gradient(40% 30% at 100% 0%, rgba(195,0,255,.10), transparent 60%),
              linear-gradient(to bottom, rgba(245,179,66,.25), transparent 12%),
              linear-gradient(to top, rgba(245,179,66,.25), transparent 12%),
              repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0px, transparent 1px, transparent 24px),
              repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0px, transparent 1px, transparent 24px)
            `,
            backgroundSize: '100% 100%, 100% 100%, 100% 12%, 100% 12%, 24px 24px, 24px 24px',
            backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat',
            zIndex: 2,
          }}
        />

        {/* Column Visibility Menu */}
        <div
          id="column-visibility-menu"
          className="no-print absolute top-20 right-4 z-50 hidden rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-lg"
          style={{ display: 'none' }}
        >
          <div className="mb-2 text-sm font-semibold text-zinc-300">Column Visibility</div>
          <div className="space-y-2">
            {[
              { key: 'date', label: 'Date' },
              { key: 'symbol', label: 'Symbol' },
              { key: 'type', label: 'Type' },
              { key: 'qty', label: 'Qty' },
              { key: 'strike', label: 'Strike' },
              { key: 'exp', label: 'Exp' },
              { key: 'dte', label: 'DTE' },
              { key: 'stock', label: 'Stock' },
              { key: 'amount', label: 'Amount' },
              { key: 'notes', label: 'Notes' },
              { key: 'delta', label: 'Delta' },
              { key: 'iv_rank', label: 'IV Rank' },
              { key: 'actions', label: 'Actions' },
            ].map(col => (
              <label key={col.key} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col.key)}
                  onChange={e => {
                    setVisibleColumns(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) {
                        next.add(col.key);
                      } else {
                        next.delete(col.key);
                      }
                      return next;
                    });
                  }}
                  className="rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-green-500"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex justify-center px-4 py-8 sm:px-6 lg:px-8">
          <main
            ref={pullToRefresh.ref as React.RefObject<HTMLElement>}
            className="relative w-full max-w-7xl"
          >
            {/* Page Title */}
            <h1 className="mb-6 text-2xl font-bold text-zinc-100" data-testid="journal.title">
              Journal
            </h1>

            {/* Summary Cards */}
            <div className="no-print mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                title="Total Premium"
                value={fmtMoney(wheelCalcs.totalIn)}
                trend={premiumTrend}
                trendLabel="vs last month"
                valueClassName="text-green-400"
                icon="💰"
                onClick={() => {
                  // Filter to show only premium entries
                  filters.setFilters({ type: 'sell_to_open' });
                }}
              />
              <SummaryCard
                title="Net P/L"
                value={fmtMoney(wheelCalcs.netPL)}
                trend={pnlTrend}
                trendLabel="vs last month"
                valueClassName={wheelCalcs.netPL >= 0 ? 'text-green-400' : 'text-red-400'}
                icon="📈"
                onClick={() => {
                  // Filter to show profitable entries
                  if (wheelCalcs.netPL >= 0) {
                    useClientFilterStore.getState().setAmountRange(0, null);
                  } else {
                    useClientFilterStore.getState().setAmountRange(null, 0);
                  }
                }}
              />
              <SummaryCard
                title="Active Positions"
                value={wheelCalcs.byTicker.length}
                valueClassName="text-zinc-300"
                icon="📊"
                onClick={() => {
                  // Filter to show only open positions
                  filters.setFilters({ status: 'open' });
                }}
              />
            </div>

            {/* Filter Bar with Summary Stats */}
            <div className="no-print">
              <FilterBar />
            </div>

            {/* Charts Section */}
            {showCharts && (premiumChartData.length > 0 || pnlChartData.length > 0) && (
              <div className="no-print mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {premiumChartData.length > 0 && (
                  <SimpleLineChart
                    data={premiumChartData}
                    width={600}
                    height={250}
                    color="#22c55e"
                    title="Premium Collected Over Time (Last 30 Days)"
                    showLabels={true}
                  />
                )}
                {pnlChartData.length > 0 && (
                  <SimpleLineChart
                    data={pnlChartData}
                    width={600}
                    height={250}
                    color="#10b981"
                    title="Net P/L by Symbol (Top 10)"
                    showLabels={true}
                  />
                )}
              </div>
            )}

            {/* Wheel Cycles Summary */}
            {wheelCalcs.byTicker.length > 0 && (
              <div className="glass-card no-print mb-6 rounded-2xl px-4 py-3">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                  <span>📊</span> Wheel Strategy Summary by Ticker
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {wheelCalcs.byTicker.map(ticker => (
                    <div
                      key={ticker.symbol}
                      className="rounded-lg border border-green-500/20 bg-zinc-950/40 p-3"
                    >
                      <div className="mb-2 text-base font-bold text-green-400">{ticker.symbol}</div>
                      <div className="mb-1 text-xs text-zinc-400">{ticker.daysActive} days</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-500">Premium:</span>{' '}
                          <span className="text-emerald-400">
                            {fmtMoney(ticker.premiumCollected)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Net P/L:</span>{' '}
                          <span className={ticker.netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {fmtMoney(ticker.netPL)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Shares:</span>{' '}
                          <span className="text-zinc-300">
                            {ticker.sharesOwned} @ ${ticker.avgCost.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Open Pos:</span>{' '}
                          <span className="text-zinc-300">
                            {ticker.openPuts}P / {ticker.openCalls}C
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                  activeTab === 'active'
                    ? 'border-2 border-green-500/50 bg-green-500/20 text-green-400'
                    : 'border-2 border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                📊 Active Entries ({entries.length})
              </button>
              <button
                onClick={() => setActiveTab('deleted')}
                className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                  activeTab === 'deleted'
                    ? 'border-2 border-red-500/50 bg-red-500/20 text-red-400'
                    : 'border-2 border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                Deleted Entries ({deletedEntries.length})
              </button>
            </div>

            {/* Entries Table */}
            <div className="glass-card rounded-2xl px-6 py-4">
              {loading ? (
                <div className="py-12">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex animate-pulse gap-4">
                        <div className="h-10 flex-1 rounded bg-zinc-800/40" />
                        <div className="h-10 w-24 rounded bg-zinc-800/40" />
                        <div className="h-10 w-32 rounded bg-zinc-800/40" />
                        <div className="h-10 w-20 rounded bg-zinc-800/40" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'active' ? (
                <>
                  {/* Mobile Card View */}
                  <div className="block space-y-4 md:hidden">
                    {paginatedEntries.map((r: Entry) => {
                      const dte = r.expiration
                        ? Math.ceil(
                            (new Date(r.expiration).getTime() - new Date(r.ts).getTime()) / 86400000
                          )
                        : null;
                      return (
                        <SwipeableCard
                          key={r.id}
                          entry={r}
                          onEdit={handleEditClick}
                          onOpenSidebar={handleSidebarOpen}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-zinc-200">{r.symbol}</h3>
                              <p className="text-xs text-zinc-500">{fmtDate(r.ts)}</p>
                            </div>
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs ${
                                r.type === 'sell_to_open'
                                  ? 'bg-green-500/20 text-green-400'
                                  : r.type === 'assignment_shares'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : r.type === 'share_sale'
                                      ? 'bg-purple-500/20 text-purple-400'
                                      : r.type === 'expiration'
                                        ? 'bg-zinc-500/20 text-zinc-400'
                                        : r.type === 'dividend'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-zinc-700/20 text-zinc-400'
                              }`}
                            >
                              {r.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {r.qty && (
                              <div>
                                <span className="text-zinc-500">Qty:</span>
                                <span className="ml-2 text-zinc-300">{r.qty}</span>
                              </div>
                            )}
                            {r.strike && (
                              <div>
                                <span className="text-zinc-500">Strike:</span>
                                <span className="ml-2 text-zinc-300">${r.strike.toFixed(2)}</span>
                              </div>
                            )}
                            {r.expiration && (
                              <div>
                                <span className="text-zinc-500">Exp:</span>
                                <span className="ml-2 text-zinc-300">{fmtDate(r.expiration)}</span>
                              </div>
                            )}
                            {dte !== null && (
                              <div>
                                <span className="text-zinc-500">DTE:</span>
                                <span
                                  className={`ml-2 font-semibold ${
                                    dte >= 0
                                      ? dte < 7
                                        ? 'text-red-400'
                                        : dte < 30
                                          ? 'text-yellow-400'
                                          : 'text-green-400'
                                      : 'text-zinc-400'
                                  }`}
                                >
                                  {dte >= 0 ? dte : `(${Math.abs(dte)})`}
                                </span>
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="text-zinc-500">Amount:</span>
                              <span
                                className={`ml-2 font-semibold ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                              >
                                {fmtMoney(r.amount)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(r)}
                              className="rounded border border-blue-500/50 bg-blue-900/20 px-3 py-1 text-sm text-blue-400 hover:bg-blue-900/30"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(r)}
                              className="rounded border border-red-500/50 bg-red-900/20 px-3 py-1 text-sm text-red-400 hover:bg-red-900/30"
                            >
                              Delete
                            </button>
                          </div>
                        </SwipeableCard>
                      );
                    })}
                    {paginatedEntries.length === 0 && entriesToPaginate.length > 0 && (
                      <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4 text-center text-zinc-500">
                        No entries on this page. Go to page 1.
                      </div>
                    )}
                    {entriesToPaginate.length === 0 && (
                      <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-4 text-center text-zinc-500">
                        {filters.symbol || filters.type || filters.from || filters.to ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-zinc-400">
                              No entries match your filters
                            </p>
                            <button
                              onClick={() => filters.resetFilters()}
                              className="rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm text-green-400 hover:bg-green-500/30"
                            >
                              Clear All Filters
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="font-semibold text-zinc-400">No entries yet</p>
                            <button
                              onClick={() => setOpen(true)}
                              className="rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm text-green-400 hover:bg-green-500/30"
                            >
                              Create First Entry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Heatmap View */}
                  {viewMode === 'heatmap' && (
                    <div className="mb-6">
                      <Heatmap
                        data={heatmapData}
                        xLabels={heatmapXLabels}
                        yLabels={heatmapYLabels}
                        onCellClick={cell => {
                          // Filter by symbol and date
                          filters.setFilters({
                            symbol: String(cell.x),
                            from: String(cell.y),
                            to: String(cell.y),
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Desktop Table View */}
                  {viewMode !== 'heatmap' && (
                    <div className="hidden md:block">
                      {groupBy === 'none' ? (
                        <div className="table-container">
                          <table className="table">
                            <thead>
                              <tr>
                                <th
                                  className="cursor-pointer text-left transition-colors select-none hover:text-zinc-200"
                                  onClick={() => handleSort('date')}
                                  title="Sort by date"
                                  role="button"
                                  aria-label="Sort by date"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleSort('date')}
                                >
                                  Date{' '}
                                  {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                  className="sticky left-0 z-10 cursor-pointer bg-zinc-800/95 text-left backdrop-blur-sm transition-colors select-none hover:text-zinc-200"
                                  onClick={() => handleSort('symbol')}
                                  title="Sort by symbol"
                                  role="button"
                                  aria-label="Sort by symbol"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleSort('symbol')}
                                >
                                  Symbol{' '}
                                  {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                  className={`text-left ${visibleColumns.has('type') ? '' : 'hidden'}`}
                                  aria-label="Trade type"
                                >
                                  Type
                                </th>
                                <th
                                  className={`text-right ${visibleColumns.has('qty') ? '' : 'hidden'}`}
                                  aria-label="Quantity"
                                >
                                  Qty
                                </th>
                                <th
                                  className={`cursor-pointer text-right transition-colors select-none hover:text-zinc-200 ${visibleColumns.has('strike') ? '' : 'hidden'}`}
                                  onClick={() => handleSort('strike')}
                                  title="Sort by strike"
                                  role="button"
                                  aria-label="Sort by strike"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleSort('strike')}
                                >
                                  Strike{' '}
                                  {sortField === 'strike' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                  className={`${visibleColumns.has('exp') ? '' : 'hidden'}`}
                                  aria-label="Expiration date"
                                >
                                  Exp
                                </th>
                                <th
                                  className={`cursor-pointer text-right transition-colors select-none hover:text-zinc-200 ${visibleColumns.has('dte') ? '' : 'hidden'}`}
                                  onClick={() => handleSort('dte')}
                                  title="Sort by days to expiration"
                                  role="button"
                                  aria-label="Sort by days to expiration"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleSort('dte')}
                                >
                                  DTE {sortField === 'dte' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                  className={`text-right ${visibleColumns.has('stock') ? '' : 'hidden'}`}
                                  aria-label="Stock price"
                                >
                                  Stock
                                </th>
                                <th
                                  className={`cursor-pointer text-right transition-colors select-none hover:text-zinc-200 ${visibleColumns.has('amount') ? '' : 'hidden'}`}
                                  onClick={() => handleSort('amount')}
                                  title="Sort by amount"
                                  role="button"
                                  aria-label="Sort by amount"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleSort('amount')}
                                >
                                  Amount{' '}
                                  {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                  className={`text-left ${visibleColumns.has('notes') ? '' : 'hidden'}`}
                                  aria-label="Notes"
                                >
                                  Notes
                                </th>
                                <th
                                  className={`text-right ${visibleColumns.has('delta') ? '' : 'hidden'}`}
                                  aria-label="Delta"
                                >
                                  Delta
                                </th>
                                <th
                                  className={`text-right ${visibleColumns.has('iv_rank') ? '' : 'hidden'}`}
                                  aria-label="IV Rank"
                                >
                                  IV Rank
                                </th>
                                <th
                                  className={`text-center ${visibleColumns.has('actions') ? '' : 'hidden'}`}
                                  aria-label="Actions"
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedEntries.map((r: Entry) => {
                                const dte = r.expiration
                                  ? Math.ceil(
                                      (new Date(r.expiration).getTime() -
                                        new Date(r.ts).getTime()) /
                                        86400000
                                    )
                                  : null;

                                // Calculate sparkline data for this entry
                                const symbolEntries = entries.filter(
                                  e => e.symbol === r.symbol && e.ts <= r.ts
                                );
                                const cumulative = symbolEntries.reduce((acc, e) => {
                                  acc.push((acc[acc.length - 1] || 0) + e.amount);
                                  return acc;
                                }, [] as number[]);
                                const sparklineData = cumulative.slice(-10); // Last 10 data points

                                return (
                                  <React.Fragment key={r.id}>
                                    <tr
                                      id={`entry-${r.id}`}
                                      data-testid="journal.entry"
                                      className={`cursor-pointer touch-manipulation transition-all duration-200 hover:bg-zinc-800/40 ${
                                        r.amount > 0
                                          ? 'bg-green-500/5'
                                          : r.amount < 0
                                            ? 'bg-red-500/5'
                                            : ''
                                      }`}
                                      onClick={e => {
                                        // Double-click to open sidebar, single click to expand row
                                        if (e.detail === 2) {
                                          handleSidebarOpen(r);
                                        } else {
                                          setExpandedRows(prev => {
                                            const next = new Set(prev);
                                            if (next.has(r.id)) {
                                              next.delete(r.id);
                                            } else {
                                              next.add(r.id);
                                            }
                                            return next;
                                          });
                                        }
                                      }}
                                    >
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5' : 'py-1'} ${visibleColumns.has('date') ? '' : 'hidden'}`}
                                      >
                                        {viewMode === 'detailed' && (
                                          <button
                                            className="mr-2 text-zinc-500 hover:text-zinc-300"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setExpandedRows(prev => {
                                                const next = new Set(prev);
                                                if (next.has(r.id)) {
                                                  next.delete(r.id);
                                                } else {
                                                  next.add(r.id);
                                                }
                                                return next;
                                              });
                                            }}
                                            title={expandedRows.has(r.id) ? 'Collapse' : 'Expand'}
                                          >
                                            {expandedRows.has(r.id) ? '▼' : '▶'}
                                          </button>
                                        )}
                                        {viewMode === 'compact' && (
                                          <input
                                            type="checkbox"
                                            checked={selectedEntries.has(r.id)}
                                            onChange={e => {
                                              e.stopPropagation();
                                              setSelectedEntries(prev => {
                                                const next = new Set(prev);
                                                if (e.target.checked) {
                                                  next.add(r.id);
                                                } else {
                                                  next.delete(r.id);
                                                }
                                                return next;
                                              });
                                            }}
                                            className="mr-2 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-green-500"
                                          />
                                        )}
                                        {fmtDate(r.ts)}
                                      </td>
                                      <td
                                        className={`sticky left-0 z-10 bg-zinc-900/95 px-3 backdrop-blur-sm ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} font-semibold ${visibleColumns.has('symbol') ? '' : 'hidden'}`}
                                      >
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            filters.setFilters({ symbol: r.symbol });
                                          }}
                                          className="underline decoration-dotted transition-colors hover:text-green-400"
                                          title={`Filter by ${r.symbol}`}
                                        >
                                          {r.symbol}
                                        </button>
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5' : 'py-1'} ${visibleColumns.has('type') ? '' : 'hidden'}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-block rounded px-2 py-0.5 text-xs ${
                                              r.type === 'sell_to_open'
                                                ? 'bg-green-500/20 text-green-400'
                                                : r.type === 'assignment_shares'
                                                  ? 'bg-blue-500/20 text-blue-400'
                                                  : r.type === 'share_sale'
                                                    ? 'bg-purple-500/20 text-purple-400'
                                                    : r.type === 'expiration'
                                                      ? 'bg-zinc-500/20 text-zinc-400'
                                                      : r.type === 'dividend'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-zinc-700/20 text-zinc-400'
                                            }`}
                                          >
                                            {r.type.replace(/_/g, ' ')}
                                          </span>
                                          {/* Show indicator if this entry has related expiration entries */}
                                          {findRelatedEntries.has(r.id) && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setCollapsedEntries(prev => {
                                                  const next = new Set(prev);
                                                  if (next.has(r.id)) {
                                                    next.delete(r.id);
                                                  } else {
                                                    next.add(r.id);
                                                  }
                                                  return next;
                                                });
                                              }}
                                              className="inline-flex touch-manipulation items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
                                              title={
                                                collapsedEntries.has(r.id)
                                                  ? 'Click to show related expiration entry'
                                                  : 'Click to hide related expiration entry'
                                              }
                                            >
                                              <span>{collapsedEntries.has(r.id) ? '▶' : '▼'}</span>
                                              <span className="text-[10px]">
                                                {findRelatedEntries.get(r.id)?.length || 0}
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right text-zinc-300 ${visibleColumns.has('qty') ? '' : 'hidden'}`}
                                      >
                                        {r.qty ?? '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right ${visibleColumns.has('strike') ? '' : 'hidden'}`}
                                      >
                                        {r.strike ? `$${r.strike.toFixed(2)}` : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-zinc-400 ${visibleColumns.has('exp') ? '' : 'hidden'}`}
                                      >
                                        {r.expiration ? fmtDate(r.expiration) : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right font-semibold ${visibleColumns.has('dte') ? '' : 'hidden'} ${
                                          dte !== null && dte >= 0
                                            ? dte < 7
                                              ? 'text-red-400'
                                              : dte < 30
                                                ? 'text-yellow-400'
                                                : 'text-green-400'
                                            : 'text-zinc-400'
                                        }`}
                                      >
                                        {dte !== null
                                          ? dte >= 0
                                            ? dte
                                            : `(${Math.abs(dte)})`
                                          : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right text-zinc-400 ${visibleColumns.has('stock') ? '' : 'hidden'}`}
                                      >
                                        {r.underlying_price
                                          ? `$${r.underlying_price.toFixed(2)}`
                                          : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right font-semibold ${visibleColumns.has('amount') ? '' : 'hidden'} ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                                      >
                                        <div className="flex items-center justify-end gap-2">
                                          <Sparkline
                                            data={sparklineData}
                                            width={60}
                                            height={20}
                                            color={r.amount >= 0 ? '#22c55e' : '#ef4444'}
                                          />
                                          <span>{fmtMoney(r.amount)}</span>
                                        </div>
                                      </td>
                                      <td
                                        className={`max-w-[150px] px-3 ${viewMode === 'compact' ? 'py-0.5 text-xs' : 'py-1 text-xs'} text-zinc-500 ${visibleColumns.has('notes') ? '' : 'hidden'}`}
                                      >
                                        {r.notes ? (
                                          <span
                                            className={`block cursor-pointer ${expandedNotes.has(r.id) ? 'whitespace-normal' : 'truncate'}`}
                                            title={
                                              expandedNotes.has(r.id)
                                                ? 'Click to collapse'
                                                : r.notes
                                            }
                                            onClick={e => {
                                              e.stopPropagation();
                                              setExpandedNotes(prev => {
                                                const next = new Set(prev);
                                                if (next.has(r.id)) {
                                                  next.delete(r.id);
                                                } else {
                                                  next.add(r.id);
                                                }
                                                return next;
                                              });
                                            }}
                                          >
                                            {r.notes}
                                          </span>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right text-zinc-400 ${visibleColumns.has('delta') ? '' : 'hidden'}`}
                                      >
                                        {r.meta && typeof r.meta === 'object' && 'delta' in r.meta
                                          ? typeof r.meta.delta === 'number'
                                            ? r.meta.delta.toFixed(2)
                                            : '—'
                                          : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5 text-sm' : 'py-1'} text-right text-zinc-400 ${visibleColumns.has('iv_rank') ? '' : 'hidden'}`}
                                      >
                                        {r.meta && typeof r.meta === 'object' && 'iv_rank' in r.meta
                                          ? typeof r.meta.iv_rank === 'number'
                                            ? r.meta.iv_rank
                                            : '—'
                                          : '—'}
                                      </td>
                                      <td
                                        className={`px-3 ${viewMode === 'compact' ? 'py-0.5' : 'py-1'} text-center ${visibleColumns.has('actions') ? '' : 'hidden'}`}
                                      >
                                        <button
                                          onClick={() => handleEditClick(r)}
                                          className="mr-2 rounded px-2 py-1 text-xs font-semibold touch-manipulation text-blue-400 transition-colors hover:text-blue-300"
                                          title="Edit entry"
                                          aria-label={`Edit entry for ${r.symbol}`}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClick(r)}
                                          className="rounded px-2 py-1 text-xs font-semibold touch-manipulation text-red-400 transition-colors hover:text-red-300"
                                          title="Delete entry"
                                          aria-label={`Delete entry for ${r.symbol}`}
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                    {expandedRows.has(r.id) && (
                                      <tr key={`${r.id}-expanded`} className="bg-zinc-900/60">
                                        <td colSpan={13} className="px-6 py-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <span className="text-zinc-500">Account:</span>
                                              <span className="ml-2 text-zinc-300">
                                                {r.account_id || '—'}
                                              </span>
                                            </div>
                                            {r.meta && typeof r.meta === 'object' && (
                                              <>
                                                {'delta' in r.meta && (
                                                  <div>
                                                    <span className="text-zinc-500">Delta:</span>
                                                    <span className="ml-2 text-zinc-300">
                                                      {typeof r.meta.delta === 'number'
                                                        ? r.meta.delta.toFixed(2)
                                                        : '—'}
                                                    </span>
                                                  </div>
                                                )}
                                                {'iv_rank' in r.meta && (
                                                  <div>
                                                    <span className="text-zinc-500">IV Rank:</span>
                                                    <span className="ml-2 text-zinc-300">
                                                      {typeof r.meta.iv_rank === 'number'
                                                        ? r.meta.iv_rank
                                                        : '—'}
                                                    </span>
                                                  </div>
                                                )}
                                                {'iv_percentile' in r.meta && (
                                                  <div>
                                                    <span className="text-zinc-500">
                                                      IV Percentile:
                                                    </span>
                                                    <span className="ml-2 text-zinc-300">
                                                      {typeof r.meta.iv_percentile === 'number'
                                                        ? r.meta.iv_percentile
                                                        : '—'}
                                                    </span>
                                                  </div>
                                                )}
                                                {'commission' in r.meta && (
                                                  <div>
                                                    <span className="text-zinc-500">
                                                      Commission:
                                                    </span>
                                                    <span className="ml-2 text-zinc-300">
                                                      {typeof r.meta.commission === 'number'
                                                        ? `$${r.meta.commission.toFixed(2)}`
                                                        : '—'}
                                                    </span>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            {r.notes && (
                                              <div className="col-span-2">
                                                <span className="text-zinc-500">Notes:</span>
                                                <p className="mt-1 text-zinc-300">{r.notes}</p>
                                              </div>
                                            )}
                                            {/* Related Entries & Edit History */}
                                            {(() => {
                                              const related = entries
                                                .filter(
                                                  e =>
                                                    e.id !== r.id &&
                                                    e.symbol === r.symbol &&
                                                    (r.strike ? e.strike === r.strike : true) &&
                                                    (r.expiration
                                                      ? e.expiration === r.expiration
                                                      : true)
                                                )
                                                .slice(0, 5);

                                              // Check for edit history (original_entry_id)
                                              const edits = entries.filter(
                                                e =>
                                                  e.original_entry_id === r.id ||
                                                  r.original_entry_id === e.id
                                              );

                                              if (related.length === 0 && edits.length === 0)
                                                return null;

                                              return (
                                                <div className="col-span-2 space-y-2">
                                                  {related.length > 0 && (
                                                    <div>
                                                      <span className="text-zinc-500">
                                                        Related Entries ({related.length}):
                                                      </span>
                                                      <div className="mt-2 flex flex-wrap gap-2">
                                                        {related.map(rel => (
                                                          <button
                                                            key={rel.id}
                                                            onClick={e => {
                                                              e.stopPropagation();
                                                              setExpandedRows(new Set([rel.id]));
                                                              document
                                                                .getElementById(`entry-${rel.id}`)
                                                                ?.scrollIntoView({
                                                                  behavior: 'smooth',
                                                                  block: 'center',
                                                                });
                                                            }}
                                                            className="touch-manipulation rounded border border-blue-500/50 bg-blue-900/20 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-900/30"
                                                          >
                                                            {fmtDate(rel.ts)} -{' '}
                                                            {rel.type.replace(/_/g, ' ')}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {edits.length > 0 && (
                                                    <div>
                                                      <span className="text-zinc-500">
                                                        Edit History ({edits.length}):
                                                      </span>
                                                      <div className="mt-2 flex flex-wrap gap-2">
                                                        {edits.map(edit => (
                                                          <button
                                                            key={edit.id}
                                                            onClick={e => {
                                                              e.stopPropagation();
                                                              setExpandedRows(new Set([edit.id]));
                                                              document
                                                                .getElementById(`entry-${edit.id}`)
                                                                ?.scrollIntoView({
                                                                  behavior: 'smooth',
                                                                  block: 'center',
                                                                });
                                                            }}
                                                            className="touch-manipulation rounded border border-amber-500/50 bg-amber-900/20 px-2 py-1 text-xs text-amber-400 transition-colors hover:bg-amber-900/30"
                                                          >
                                                            {fmtDate(edit.ts)} -{' '}
                                                            {edit.edit_reason || 'Edited'}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              {paginatedEntries.length === 0 && entriesToPaginate.length > 0 && (
                                <tr>
                                  <td className="px-3 py-12 text-center text-zinc-500" colSpan={13}>
                                    No entries on this page. Go to page 1.
                                  </td>
                                </tr>
                              )}
                              {entriesToPaginate.length === 0 && (
                                <tr>
                                  <td className="px-3 py-12 text-center text-zinc-500" colSpan={13}>
                                    {filters.symbol ||
                                    filters.type ||
                                    filters.from ||
                                    filters.to ? (
                                      <div className="space-y-2">
                                        <p className="text-lg font-semibold text-zinc-400">
                                          No entries match your filters
                                        </p>
                                        <p className="text-sm">
                                          Try adjusting your filters or clearing them to see all
                                          entries.
                                        </p>
                                        <button
                                          onClick={() => filters.resetFilters()}
                                          className="mt-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/30"
                                        >
                                          Clear All Filters
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <p className="text-lg font-semibold text-zinc-400">
                                          No entries yet
                                        </p>
                                        <p className="text-sm">
                                          Start tracking your wheel strategy by creating your first
                                          entry.
                                        </p>
                                        <button
                                          onClick={() => setOpen(true)}
                                          className="mt-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/30"
                                        >
                                          ✨ Create First Entry
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(paginatedGroups ?? groupedEntries ?? []).map(
                            ({ key, entries, total, count }) => (
                              <div
                                key={key}
                                className="rounded-xl border border-zinc-700/60 bg-zinc-900/60"
                              >
                                <div className="border-b border-zinc-700/60 bg-zinc-800/60 px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-zinc-300">
                                      {groupBy === 'symbol' ? key : `Date: ${key}`}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-zinc-500">{count} entries</span>
                                      <span
                                        className={`font-semibold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}
                                      >
                                        Total: {fmtMoney(total)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="table-container">
                                  <table className="table">
                                    <thead>
                                      <tr>
                                        <th className="text-left">Date</th>
                                        <th className="text-left">Type</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Strike</th>
                                        <th className="text-right">DTE</th>
                                        <th className="text-right">Amount</th>
                                        <th className="text-center">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entries.map((r: Entry) => {
                                        const dte = r.expiration
                                          ? Math.ceil(
                                              (new Date(r.expiration).getTime() -
                                                new Date(r.ts).getTime()) /
                                                86400000
                                            )
                                          : null;
                                        return (
                                          <tr
                                            key={r.id}
                                            className="cursor-pointer transition-all duration-200 hover:bg-zinc-800/40"
                                          >
                                            <td className="px-3 py-0.5 text-sm">{fmtDate(r.ts)}</td>
                                            <td className="px-3 py-0.5 text-sm">
                                              <span
                                                className={`inline-block rounded px-2 py-0.5 text-xs ${
                                                  r.type === 'sell_to_open'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : r.type === 'assignment_shares'
                                                      ? 'bg-blue-500/20 text-blue-400'
                                                      : r.type === 'share_sale'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : r.type === 'expiration'
                                                          ? 'bg-zinc-500/20 text-zinc-400'
                                                          : r.type === 'dividend'
                                                            ? 'bg-yellow-500/20 text-yellow-400'
                                                            : 'bg-zinc-700/20 text-zinc-400'
                                                }`}
                                              >
                                                {r.type.replace(/_/g, ' ')}
                                              </span>
                                            </td>
                                            <td className="px-3 py-0.5 text-right text-sm text-zinc-300">
                                              {r.qty ?? '—'}
                                            </td>
                                            <td className="px-3 py-0.5 text-right text-sm">
                                              {r.strike ? `$${r.strike.toFixed(2)}` : '—'}
                                            </td>
                                            <td
                                              className={`px-3 py-0.5 text-right text-sm font-semibold ${
                                                dte !== null && dte >= 0
                                                  ? dte < 7
                                                    ? 'text-red-400'
                                                    : dte < 30
                                                      ? 'text-yellow-400'
                                                      : 'text-green-400'
                                                  : 'text-zinc-400'
                                              }`}
                                            >
                                              {dte !== null
                                                ? dte >= 0
                                                  ? dte
                                                  : `(${Math.abs(dte)})`
                                                : '—'}
                                            </td>
                                            <td
                                              className={`px-3 py-0.5 text-right text-sm font-semibold ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                                            >
                                              {fmtMoney(r.amount)}
                                            </td>
                                            <td className="px-3 py-0.5 text-center">
                                              <button
                                                onClick={() => handleEditClick(r)}
                                                className="mr-2 rounded px-2 py-1 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                                                title="Edit entry"
                                                aria-label={`Edit entry for ${r.symbol}`}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => handleDeleteClick(r)}
                                                className="rounded px-2 py-1 text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                                                title="Delete entry"
                                                aria-label={`Delete entry for ${r.symbol}`}
                                              >
                                                Delete
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {entriesToPaginate.length > 0 && (
                    <div className="no-print mt-4 flex items-center justify-between border-t border-zinc-700/60 px-4 py-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-400">
                          Showing {(currentPage - 1) * pageSize + 1} to{' '}
                          {Math.min(currentPage * pageSize, entriesToPaginate.length)} of{' '}
                          {entriesToPaginate.length} entries
                        </span>
                        <select
                          value={pageSize}
                          onChange={e => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                            localStorage.setItem('journal_page_size', e.target.value);
                          }}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-300"
                        >
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                          <option value={999999}>All</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-zinc-400">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bulk Actions Bar */}
                  {selectedEntries.size > 0 && (
                    <div className="no-print mt-4 flex items-center justify-between rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3">
                      <span className="text-sm text-green-400">
                        {selectedEntries.size} entry{selectedEntries.size !== 1 ? 'ies' : ''}{' '}
                        selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Delete ${selectedEntries.size} entries?`
                            );
                            if (!confirmed) return;

                            for (const id of selectedEntries) {
                              try {
                                await deleteEntry(id, 'Bulk deleted');
                              } catch (err) {
                                showToast(
                                  `Failed to delete entry: ${err instanceof Error ? err.message : String(err)}`,
                                  'error'
                                );
                              }
                            }
                            setSelectedEntries(new Set());
                            showToast(
                              `${selectedEntries.size} entries deleted successfully`,
                              'success'
                            );
                          }}
                          className="rounded border border-red-500/50 bg-red-900/20 px-3 py-1 text-sm text-red-400 hover:bg-red-900/30"
                        >
                          Delete Selected
                        </button>
                        <button
                          onClick={() => {
                            const selected = sortedEntries.filter(e => selectedEntries.has(e.id));
                            const headers = [
                              'Date',
                              'Symbol',
                              'Type',
                              'Qty',
                              'Strike',
                              'Expiration',
                              'DTE',
                              'Stock Price',
                              'Amount',
                              'Notes',
                              'Delta',
                              'IV Rank',
                            ];
                            const rows = selected.map(entry => {
                              const dte = entry.expiration
                                ? Math.ceil(
                                    (new Date(entry.expiration).getTime() -
                                      new Date(entry.ts).getTime()) /
                                      86400000
                                  )
                                : '';
                              const delta =
                                entry.meta &&
                                typeof entry.meta === 'object' &&
                                'delta' in entry.meta
                                  ? typeof entry.meta.delta === 'number'
                                    ? entry.meta.delta.toFixed(2)
                                    : ''
                                  : '';
                              const ivRank =
                                entry.meta &&
                                typeof entry.meta === 'object' &&
                                'iv_rank' in entry.meta
                                  ? typeof entry.meta.iv_rank === 'number'
                                    ? entry.meta.iv_rank
                                    : ''
                                  : '';

                              return [
                                fmtDate(entry.ts),
                                entry.symbol,
                                entry.type.replace(/_/g, ' '),
                                entry.qty ?? '',
                                entry.strike ? entry.strike.toFixed(2) : '',
                                entry.expiration ? fmtDate(entry.expiration) : '',
                                dte,
                                entry.underlying_price ? entry.underlying_price.toFixed(2) : '',
                                entry.amount.toFixed(2),
                                entry.notes ?? '',
                                delta,
                                ivRank,
                              ];
                            });

                            const csvContent = [headers, ...rows]
                              .map(row =>
                                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                              )
                              .join('\n');
                            const blob = new Blob([csvContent], {
                              type: 'text/csv;charset=utf-8;',
                            });
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(blob);
                            link.setAttribute('href', url);
                            link.setAttribute(
                              'download',
                              `journal-selected-${new Date().toISOString().slice(0, 10)}.csv`
                            );
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            showToast(`${selectedEntries.size} entries exported to CSV`, 'success');
                          }}
                          className="rounded border border-green-500/50 bg-green-900/20 px-3 py-1 text-sm text-green-400 hover:bg-green-900/30"
                        >
                          Export Selected
                        </button>
                        <button
                          onClick={() => setSelectedEntries(new Set())}
                          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Deleted Entries Table
                <div className="table-container border-red-500/20">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="text-left">Deleted Date</th>
                        <th className="text-left">Symbol</th>
                        <th className="text-left">Type</th>
                        <th className="text-left">Original Date</th>
                        <th className="text-right">Amount</th>
                        <th className="text-left">Delete Reason</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedEntries.map((r: Entry) => (
                        <tr key={r.id} className="opacity-60">
                          <td className="px-3 py-0.5 text-sm text-zinc-500">
                            {r.deleted_at ? fmtDate(r.deleted_at) : '—'}
                          </td>
                          <td className="px-3 py-0.5 text-sm font-semibold text-zinc-400">
                            {r.symbol}
                          </td>
                          <td className="px-3 py-0.5 text-sm text-zinc-500">{r.type}</td>
                          <td className="px-3 py-0.5 text-sm text-zinc-500">{fmtDate(r.ts)}</td>
                          <td
                            className={`px-3 py-0.5 text-right text-sm font-semibold ${r.amount >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}
                          >
                            {fmtMoney(r.amount)}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-0.5 text-xs text-zinc-500">
                            {r.edit_reason || 'No reason provided'}
                          </td>
                          <td className="px-3 py-0.5 text-center">
                            <button
                              onClick={() => handleRestoreClick(r)}
                              className="rounded px-2 py-1 text-xs font-semibold text-green-400 transition-colors hover:text-green-300"
                              title="Restore entry"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                      {deletedEntries.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                            No deleted entries. Deleted entries will appear here and can be
                            restored.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* New Entry Modal */}
        <Modal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            setErrors({});
          }}
          title="✨ New Entry"
          size="xl"
        >
          <div className="space-y-4">
            {/* Template Selector */}
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Template Type
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={tmpl === 'sellPut' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('sellPut')}
                  size="sm"
                  title="Sell a cash-secured put option to collect premium"
                >
                  Sell Put
                </Button>
                <Button
                  variant={tmpl === 'putAssigned' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('putAssigned')}
                  size="sm"
                  title="Record assignment when a put option is exercised and shares are purchased"
                >
                  Put Assigned
                </Button>
                <Button
                  variant={tmpl === 'sellCC' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('sellCC')}
                  size="sm"
                  title="Sell a covered call option on existing shares to collect premium"
                >
                  Sell Covered Call
                </Button>
                <Button
                  variant={tmpl === 'callAssigned' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('callAssigned')}
                  size="sm"
                  title="Record assignment when a call option is exercised and shares are sold"
                >
                  Call Assigned
                </Button>
                <Button
                  variant={tmpl === 'dividend' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('dividend')}
                  size="sm"
                  title="Record dividend income received from shares"
                >
                  Dividend
                </Button>
                <Button
                  variant={tmpl === 'fee' ? 'primary' : 'secondary'}
                  onClick={() => setTmpl('fee')}
                  size="sm"
                  title="Record fees or commissions paid"
                >
                  Fee
                </Button>
              </div>
            </div>

            {/* Quick Entry Buttons */}
            {(tmpl === 'sellPut' || tmpl === 'sellCC') && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Quick Presets
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTmpl('sellPut');
                      setContracts(1);
                      // Auto-calculate premium: approximate 30-delta put premium
                      // For a 30-delta put, premium is typically ~0.30 * stock_price * 0.01
                      // This is a rough estimate - user can adjust
                      if (strike > 0) {
                        const estimatedPremium = strike * 0.3 * 0.01;
                        setPremium(Math.max(0.01, Math.round(estimatedPremium * 100) / 100));
                      }
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      setExpiration(fmtDate(nextWeek));
                    }}
                  >
                    Quick 30Δ Weekly Put
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTmpl('sellCC');
                      setContracts(1);
                      // Auto-calculate premium: approximate 30-delta call premium
                      if (strike > 0) {
                        const estimatedPremium = strike * 0.3 * 0.01;
                        setPremium(Math.max(0.01, Math.round(estimatedPremium * 100) / 100));
                      }
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      setExpiration(fmtDate(nextWeek));
                    }}
                  >
                    Quick Weekly CC
                  </Button>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Trade Date"
                  type="date"
                  value={date}
                  onChange={e => {
                    setDate(e.target.value);
                    if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                  }}
                />
                {errors.date && <p className="mt-1 text-xs text-red-400">{errors.date}</p>}
              </div>
              <div className="relative">
                <Input
                  label="Symbol"
                  value={symbol}
                  onChange={e => {
                    setSymbol(e.target.value);
                    if (e.target.value) {
                      localStorage.setItem('journal_last_symbol', e.target.value.toUpperCase());
                    }
                    if (errors.symbol) setErrors(prev => ({ ...prev, symbol: '' }));
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                  placeholder="AAPL"
                  className={errors.symbol ? 'border-red-500' : ''}
                />
                {errors.symbol && <p className="mt-1 text-xs text-red-400">{errors.symbol}</p>}
                {showAutocomplete && filteredSymbols.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
                    {filteredSymbols.map(sym => (
                      <button
                        key={sym}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                        onClick={() => {
                          setSymbol(sym);
                          localStorage.setItem('journal_last_symbol', sym);
                          setShowAutocomplete(false);
                        }}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(tmpl === 'sellPut' ||
              tmpl === 'sellCC' ||
              tmpl === 'putAssigned' ||
              tmpl === 'callAssigned') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Contracts"
                      type="number"
                      value={contracts}
                      onChange={e => {
                        setContracts(Number(e.target.value));
                        if (errors.contracts) setErrors(prev => ({ ...prev, contracts: '' }));
                      }}
                      className={errors.contracts ? 'border-red-500' : ''}
                    />
                    {errors.contracts && (
                      <p className="mt-1 text-xs text-red-400">{errors.contracts}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="Strike"
                      type="number"
                      step="0.01"
                      value={strike}
                      onChange={e => {
                        setStrike(Number(e.target.value));
                        if (errors.strike) setErrors(prev => ({ ...prev, strike: '' }));
                      }}
                      className={errors.strike ? 'border-red-500' : ''}
                    />
                    {errors.strike && <p className="mt-1 text-xs text-red-400">{errors.strike}</p>}
                  </div>
                </div>
                {(tmpl === 'sellPut' || tmpl === 'sellCC') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Premium/Contract"
                        type="number"
                        step="0.01"
                        value={premium}
                        onChange={e => {
                          setPremium(Number(e.target.value));
                          if (errors.premium) setErrors(prev => ({ ...prev, premium: '' }));
                        }}
                        className={errors.premium ? 'border-red-500' : ''}
                      />
                      {errors.premium && (
                        <p className="mt-1 text-xs text-red-400">{errors.premium}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        label="Expiration Date"
                        type="date"
                        value={expiration}
                        onChange={e => {
                          setExpiration(e.target.value);
                          if (errors.expiration) setErrors(prev => ({ ...prev, expiration: '' }));
                        }}
                        className={errors.expiration ? 'border-red-500' : ''}
                      />
                      {errors.expiration && (
                        <p className="mt-1 text-xs text-red-400">{errors.expiration}</p>
                      )}
                    </div>
                  </div>
                )}
                {(tmpl === 'putAssigned' || tmpl === 'callAssigned') && (
                  <div>
                    <Input
                      label="Expiration Date"
                      type="date"
                      value={expiration}
                      onChange={e => {
                        setExpiration(e.target.value);
                        if (errors.expiration) setErrors(prev => ({ ...prev, expiration: '' }));
                      }}
                      className={errors.expiration ? 'border-red-500' : ''}
                    />
                    {errors.expiration && (
                      <p className="mt-1 text-xs text-red-400">{errors.expiration}</p>
                    )}
                  </div>
                )}
                <Input
                  label="Fee"
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={e => setFee(Number(e.target.value))}
                />
              </>
            )}

            {(tmpl === 'dividend' || tmpl === 'fee') && (
              <div>
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => {
                    setAmount(Number(e.target.value));
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount}</p>}
              </div>
            )}

            <Input
              label="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Entry</Button>
            </div>
          </div>
        </Modal>

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Edit Drawer (feature-flagged) */}
        {env.features.journalEditDrawer && <JournalDrawer />}

        {/* Legacy Edit Modal (fallback) */}
        {!env.features.journalEditDrawer && (
          <Modal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            title="Edit Entry"
            size="lg"
          >
            <EditEntryForm
              entry={editingEntry}
              onSave={handleEditSave}
              onCancel={() => {
                setEditModalOpen(false);
                setEditingEntry(null);
              }}
            />
          </Modal>
        )}

        {/* Contextual Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
          title={sidebarEntry ? `Entry Details: ${sidebarEntry.symbol}` : undefined}
          width="420px"
        >
          {sidebarEntry && (
            <EntrySidebar
              entry={sidebarEntry}
              relatedEntries={relatedEntries}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          )}
        </Sidebar>
      </div>
    </KeyboardShortcutsProvider>
  );
};

export default JournalPage;
