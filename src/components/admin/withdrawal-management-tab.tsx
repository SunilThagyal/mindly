
"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import type { WithdrawalRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, SendToBack, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


async function fetchWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const requestsCol = collection(db, 'withdrawalRequests');
  const q = query(requestsCol, orderBy('requestedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as WithdrawalRequest));
}

export default function WithdrawalManagementTab() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // Stores ID of request being updated


  const getStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'processing': return 'bg-indigo-500';
      case 'completed': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return <Hourglass className="mr-1.5 h-3.5 w-3.5" />;
      case 'approved':
      case 'processing':
      case 'completed': return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="mr-1.5 h-3.5 w-3.5" />;
      default: return null;
    }
  }


  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedRequests = await fetchWithdrawalRequests();
      setRequests(fetchedRequests);
    } catch (err: any) {
      console.error("Error fetching withdrawal requests:", err);
      setError(err.message || "Failed to load requests.");
      toast({ title: 'Error', description: 'Failed to load withdrawal requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusUpdate = async (requestId: string, newStatus: WithdrawalRequest['status']) => {
    setUpdatingStatus(requestId);
    try {
      const requestDocRef = doc(db, 'withdrawalRequests', requestId);
      const updateData: Partial<WithdrawalRequest> = { status: newStatus };
      if (['completed', 'rejected'].includes(newStatus)) {
        updateData.processedAt = Timestamp.now();
      }
      await updateDoc(requestDocRef, updateData);
      toast({ title: 'Status Updated', description: `Request status changed to ${newStatus}.` });
      // Refresh list or update local state
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updateData } : r));
    } catch (err: any) {
      toast({ title: 'Update Error', description: err.message || 'Failed to update status.', variant: 'destructive' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><SendToBack className="mr-2" /> Withdrawal Management</CardTitle>
          <CardDescription>Loading withdrawal requests...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><SendToBack className="mr-2" /> Withdrawal Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Requests</p>
          <p className="text-sm">{error}</p>
          <Button onClick={loadRequests} variant="outline" className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><SendToBack className="mr-2" /> Withdrawal Management</CardTitle>
        <CardDescription>Review and manage user withdrawal requests. Found {requests.length} requests.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No withdrawal requests found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.userDisplayName || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{req.userEmail || req.userId}</div>
                    </TableCell>
                    <TableCell>${req.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(req.requestedAt.toDate(), 'MMM d, yyyy, h:mm a')}</TableCell>
                    <TableCell>
                      {req.paymentDetailsSnapshot.paypalEmail ? `PayPal: ${req.paymentDetailsSnapshot.paypalEmail}` :
                       req.paymentDetailsSnapshot.upiId ? `UPI: ${req.paymentDetailsSnapshot.upiId}` :
                       req.paymentDetailsSnapshot.accountNumber ? `Bank Transfer (India)` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: getStatusColor(req.status) }} className="text-white hover:text-white/90">
                        {getStatusIcon(req.status)}
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.id && (
                        <Select
                          value={req.status}
                          onValueChange={(newStatus) => handleStatusUpdate(req.id!, newStatus as WithdrawalRequest['status'])}
                          disabled={updatingStatus === req.id}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            {(['pending', 'approved', 'processing', 'completed', 'rejected'] as WithdrawalRequest['status'][]).map(s => (
                              <SelectItem key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {updatingStatus === req.id && <Loader2 className="h-4 w-4 animate-spin ml-2 inline-block" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">Note: This is a simplified withdrawal management UI. Actual payout processing needs to be handled externally.</p>
      </CardContent>
    </Card>
  );
}
