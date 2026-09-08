'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getAppBySlug } from '@/lib/registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DetailDrawer } from '@/components/DetailDrawer';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { AppConfig } from '@/lib/types';

export default function AppPage() {
  const params = useParams();
  const slug = params.slug as string;
  const app = getAppBySlug(slug);

  if (!app) {
    notFound();
  }

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState(app.viewState.defaultSort.column);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(app.viewState.defaultSort.direction);
  const [filters, setFilters] = useState<Record<string, string>>((app.viewState.defaultFilters as Record<string, string>) || {});
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort: sortColumn,
        order: sortDirection,
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/apps/${app.slug}?${params}`);
      const result = await response.json();
      if (!response.ok) {
        console.error('API error:', result);
        setData([]);
      } else {
        setData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, sortColumn, sortDirection, filters, app.slug]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleView = (row: any) => {
    setSelectedRecord(row);
    setDrawerOpen(true);
  };

  const renderCell = (row: any, column: any) => {
    const value = row[column.key];

    // Static tone-to-class mapping for Tailwind
    const toneClasses: Record<string, { bg: string; text: string }> = {
      neutral: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
      positive: { bg: 'bg-green-500/10', text: 'text-green-500' },
      warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
      critical: { bg: 'bg-red-500/10', text: 'text-red-500' },
    };

    switch (column.type) {
      case 'currency':
        return `$${(value / 100).toFixed(2)}`;
      case 'enum':
        const option = column.enumOptions?.find((opt: any) => opt.value === String(value));
        const classes = option ? toneClasses[option.tone] || toneClasses.neutral : null;
        return option ? (
          <Badge variant="outline" className={`${classes?.bg} ${classes?.text}`}>
            {option.label}
          </Badge>
        ) : value;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'boolean':
        // Handle SQLite 0/1 stored as numbers
        const boolValue = typeof value === 'number' ? value === 1 : value;
        return boolValue ? 'Yes' : 'No';
      case 'text':
      default:
        if (column.pii) {
          return '••••••••';
        }
        return value;
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{app.title}</h1>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {app.columns
          .filter(col => col.filterable && col.enumOptions)
          .map(column => (
            <select
              key={column.key as string}
              value={filters[column.key as string] || ''}
              onChange={(e) => setFilters({ ...filters, [column.key as string]: e.target.value })}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All {column.label}</option>
              {column.enumOptions?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
      </div>

      {/* Data Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {app.columns.map(column => (
                <TableHead
                  key={column.key as string}
                  className={column.sortable ? 'cursor-pointer hover:bg-muted' : ''}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && getSortIcon(column.key as string)}
                  </div>
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={app.columns.length + 1} className="text-center py-8">
                  <div className="text-muted-foreground">
                    No {app.title.toLowerCase()} found. Try adjusting your filters or search.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (data || []).map((row) => (
                <TableRow key={row.id}>
                  {app.columns.map(column => (
                    <TableCell key={column.key as string}>
                      {renderCell(row, column)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleView(row)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Drawer */}
      {selectedRecord && (
        <DetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          app={app}
          record={selectedRecord}
        />
      )}
    </div>
  );
}