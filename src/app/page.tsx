'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X } from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for approvals
    setApprovals([
      {
        id: 1,
        requester: 'Bob Operator',
        app: 'transactions',
        action: 'refund',
        recordId: 'tx-123',
        before: { status: 'completed', amount: 10000 },
        after: { status: 'refunded', amount: 10000 },
        createdAt: Date.now() - 3600000,
      },
    ]);
    setLoading(false);
  }, []);

  const handleApprove = async (id: number) => {
    console.log('Approving', id);
    // Implement approval logic
  };

  const handleReject = async (id: number) => {
    console.log('Rejecting', id);
    // Implement rejection logic
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
                      Requested by {approval.requester} • {new Date(approval.createdAt).toLocaleString()}
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
                    <Button
                      variant="outline"
                      onClick={() => handleReject(approval.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(approval.id)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
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
