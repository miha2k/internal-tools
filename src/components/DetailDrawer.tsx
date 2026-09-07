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
import { Clock, User, Eye, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [revealedFields, setRevealedFields] = useState<Map<string, string>>(new Map());
  const [revealing, setRevealing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: any; inputFields?: any } | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (open && record) {
      fetchAuditLog();
      setRevealedFields(new Map()); // Reset revealed state when opening
    }
  }, [open, record]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/apps/${app.slug}/audit?recordId=${record.id}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.data || []);
      } else {
        console.error('Failed to fetch audit log');
        setAuditLog([]);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      setAuditLog([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealPII = async (fieldKey: string) => {
    try {
      setRevealing(true);
      const response = await fetch('/api/reveal-pii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: app.slug,
          recordId: record.id,
          field: fieldKey,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setRevealedFields(prev => new Map(prev).set(fieldKey, data.value));
      }
    } catch (error) {
      console.error('Failed to reveal PII:', error);
    } finally {
      setRevealing(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.destructive || action.requiresApproval) {
      setConfirmAction({ action });
    } else {
      executeAction(action.key);
    }
  };

  const executeAction = async (actionKey: string, inputFields?: any) => {
    try {
      setExecutingAction(true);
      const response = await fetch(`/api/apps/${app.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionKey,
          recordId: record.id,
          inputFields: inputFields || {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setToast({ 
          message: data.requiresApproval 
            ? 'Approval request created' 
            : `${app.rowActions.find(a => a.key === actionKey)?.label} completed`, 
          type: 'success' 
        });
        if (!data.requiresApproval) {
          // Refresh the record
          window.location.reload();
        }
      } else {
        setToast({ message: 'Action failed', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      setToast({ message: 'Action failed', type: 'error' });
    } finally {
      setExecutingAction(false);
      setConfirmAction(null);
    }
  };

  const renderFieldValue = (key: string, value: any) => {
    const column = app.columns.find(col => col.key === key);
    
    // Static tone-to-class mapping for Tailwind
    const toneClasses: Record<string, { bg: string; text: string }> = {
      neutral: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
      positive: { bg: 'bg-green-500/10', text: 'text-green-500' },
      warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
      critical: { bg: 'bg-red-500/10', text: 'text-red-500' },
    };
    
    if (column?.pii) {
      const revealedValue = revealedFields.get(key);
      if (revealedValue !== undefined) {
        return revealedValue;
      }
      return (
        <div className="flex items-center gap-2">
          <span>••••••••</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => handleRevealPII(key)}
            disabled={revealing}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    switch (column?.type) {
      case 'currency':
        return `$${(value / 100).toFixed(2)}`;
      case 'date':
        return new Date(value).toLocaleString();
      case 'enum':
        const option = column.enumOptions?.find(opt => opt.value === value);
        const classes = option ? toneClasses[option.tone] || toneClasses.neutral : null;
        return option ? (
          <Badge variant="outline" className={`${classes?.bg} ${classes?.text}`}>
            {option.label}
          </Badge>
        ) : value;
      case 'boolean':
        // Handle SQLite 0/1 stored as numbers
        const boolValue = typeof value === 'number' ? value === 1 : value;
        return boolValue ? 'Yes' : 'No';
      default:
        return value;
    }
  };

  return (
    <>
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
                    onClick={() => handleActionClick(action)}
                    disabled={executingAction}
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

      {/* Confirmation Dialog */}
      {confirmAction && (
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction.action.destructive ? (
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirm Action
                  </span>
                ) : (
                  'Confirm Action'
                )}
              </DialogTitle>
              <DialogDescription>
                {confirmAction.action.destructive
                  ? `This action cannot be undone. Are you sure you want to ${confirmAction.action.label.toLowerCase()}?`
                  : confirmAction.action.requiresApproval
                  ? `This action will require approval. Are you sure you want to ${confirmAction.action.label.toLowerCase()}?`
                  : `Are you sure you want to ${confirmAction.action.label.toLowerCase()}?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmAction.action.destructive ? 'destructive' : 'default'}
                onClick={() => executeAction(confirmAction.action.key, confirmAction.inputFields)}
                disabled={executingAction}
              >
                {executingAction ? 'Executing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-2 rounded-md shadow-lg ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}