'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X } from 'lucide-react';
import { getAppBySlug } from '@/lib/registry';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchApprovals();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/current-user');
      const user = await response.json();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approvals');
      const result = await response.json();
      setApprovals(result.approvals || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = (approval: any) => {
    if (!currentUser) return false;
    const app = getAppBySlug(approval.app);
    if (!app) return false;
    return app.roles.approve?.includes(currentUser.role);
  };

  const handleApprove = async (id: number) => {
    try {
      setProcessing(id);
      setError(null);
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, action: 'approve' }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Failed to approve');
        return;
      }
      
      // Refresh the list
      await fetchApprovals();
      // Trigger a custom event to update the sidebar badge
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (error) {
      console.error('Failed to approve:', error);
      setError('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setProcessing(id);
      setError(null);
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, action: 'reject' }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Failed to reject');
        return;
      }
      
      // Refresh the list
      await fetchApprovals();
      // Trigger a custom event to update the sidebar badge
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (error) {
      console.error('Failed to reject:', error);
      setError('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve pending actions
          </p>
        </div>
        <Badge variant="outline" className="text-lg">
          <Shield className="mr-2 h-4 w-4" />
          {approvals.length} pending
        </Badge>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending approvals</h3>
            <p className="text-muted-foreground text-center">
              All caught up! Check back later for new approval requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {approval.action} - {approval.app}
                    </CardTitle>
                    <CardDescription>
                      Requested by {approval.requesterName || approval.requesterId} • {new Date(approval.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Before</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(approval.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">After</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(approval.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {canApprove(approval) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(approval.id)}
                          disabled={processing === approval.id}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprove(approval.id)}
                          disabled={processing === approval.id}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
