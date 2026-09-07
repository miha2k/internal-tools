'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User } from 'lucide-react';
import type { AppConfig } from '@/lib/types';

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AppConfig;
  record: any;
}

export function DetailDrawer({ open, onOpenChange, app, record }: DetailDrawerProps) {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && record) {
      fetchAuditLog();
    }
  }, [open, record]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      // Mock audit log data for now
      setAuditLog([
        {
          id: 1,
          actor: 'Alice Viewer',
          action: 'create',
          createdAt: Date.now() - 86400000,
          before: null,
          after: record,
        },
        {
          id: 2,
          actor: 'Bob Operator',
          action: 'update',
          createdAt: Date.now() - 3600000,
          before: { ...record, status: 'pending' },
          after: record,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFieldValue = (key: string, value: any) => {
    const column = app.columns.find(col => col.key === key);
    
    if (column?.pii) {
      return '••••••••';
    }

    switch (column?.type) {
      case 'currency':
        return `$${(value / 100).toFixed(2)}`;
      case 'date':
        return new Date(value).toLocaleString();
      case 'enum':
        const option = column.enumOptions?.find(opt => opt.value === value);
        return option ? (
          <Badge variant="outline" className={`bg-${option.tone}-500/10 text-${option.tone}-500`}>
            {option.label}
          </Badge>
        ) : value;
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[800px]">
        <SheetHeader>
          <SheetTitle>
            {String(record[app.titleField])}
          </SheetTitle>
          <SheetDescription>
            {app.title} Details
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          {/* Grouped Fields */}
          <div className="space-y-6">
            {app.detailFields.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold mb-3">{group.label}</h3>
                <div className="space-y-3">
                  {group.fields.map((fieldKey) => {
                    const column = app.columns.find(col => col.key === fieldKey);
                    if (!column) return null;

                    return (
                      <div key={fieldKey} className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground min-w-[120px]">
                          {column.label}
                        </span>
                        <div className="text-sm font-medium text-right flex-1">
                          {renderFieldValue(fieldKey, record[fieldKey])}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
          </div>

          {/* Row Actions */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {app.rowActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant}
                  size="sm"
                  onClick={() => console.log('Action:', action.key)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3">Audit Timeline</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : auditLog.length === 0 ? (
              <div className="text-sm text-muted-foreground">No audit history</div>
            ) : (
              <div className="space-y-4">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="w-px h-full bg-border min-h-[24px]" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-muted-foreground">by {entry.actor}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}