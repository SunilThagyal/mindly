
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import type { WithdrawalRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, SendToBack, CheckCircle, XCircle, Hourglass, Info } from 'lucide-react';
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
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function fetchWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const requestsCol = collection(db, 'withdrawalRequests');
  const q = query(requestsCol, orderBy('requestedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { 
          id: docSnap.id, 
          ...data,
          // Ensure timestamps are correctly cast if they come from Firestore
          requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt : Timestamp.now(), 
          processedAt: data.processedAt instanceof Timestamp ? data.processedAt : null,
        } as WithdrawalRequest;
    });
}

export default function WithdrawalManagementTab() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // Stores ID of request being updated


  const getStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-500/90';
      case 'approved': return 'bg-blue-500 hover:bg-blue-500/90';
      case 'processing': return 'bg-indigo-500 hover:bg-indigo-500/90';
      case 'completed': return 'bg-green-600 hover:bg-green-600/90';
      case 'rejected': return 'bg-red-600 hover:bg-red-600/90';
      default: return 'bg-gray-500 hover:bg-gray-500/90';
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


  const loadRequests = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleStatusUpdate = async (requestId: string, newStatus: WithdrawalRequest['status']) => {
    setUpdatingStatus(requestId);
    try {
      const requestDocRef = doc(db, 'withdrawalRequests', requestId);
      const updateData: Partial<WithdrawalRequest> = { status: newStatus };
      if (['completed', 'rejected'].includes(newStatus) && newStatus !== 'pending' && newStatus !== 'approved' && newStatus !== 'processing') { // only set processedAt for terminal states
        updateData.processedAt = Timestamp.now();
      }
      await updateDoc(requestDocRef, updateData);
      toast({ title: 'Status Updated', description: `Request status changed to ${newStatus}.` });
      loadRequests(); // Reload all requests to reflect changes
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
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                  <TableHead className="w-[100px]">Details</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <Accordion key={req.id} type="single" collapsible className="w-full">
                     <TableRow>
                        <TableCell>
                          <div className="font-medium">{req.userDisplayName || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{req.userEmail || req.userId}</div>
                        </TableCell>
                        <TableCell className="text-right">${req.amount.toFixed(2)}</TableCell>
                        <TableCell>{req.requestedAt ? format(req.requestedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(req.status)} text-primary-foreground`}>
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
                        <TableCell>
                            <AccordionItem value={`item-${req.id}`} className="border-b-0">
                                <AccordionTrigger className="py-2 px-2 hover:no-underline text-sm [&[data-state=open]>svg]:text-primary">View</AccordionTrigger>
                            </AccordionItem>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                           <AccordionContent className="bg-muted/50 p-4">
                                <h4 className="font-semibold mb-2 text-sm">Payment Details (Snapshot):</h4>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    {req.paymentDetailsSnapshot.country && <div><dt className="font-medium text-muted-foreground">Country:</dt> <dd>{req.paymentDetailsSnapshot.country}</dd></div>}
                                    {req.paymentDetailsSnapshot.contact && <div><dt className="font-medium text-muted-foreground">Contact:</dt> <dd>{req.paymentDetailsSnapshot.contact}</dd></div>}
                                    {req.paymentDetailsSnapshot.address && <div className="col-span-full"><dt className="font-medium text-muted-foreground">Address:</dt> <dd className="whitespace-pre-wrap">{req.paymentDetailsSnapshot.address}</dd></div>}
                                    
                                    <div className="col-span-full mt-1 mb-1 border-b"></div>

                                    {req.paymentDetailsSnapshot.chosenPaymentMethod && <div className="col-span-full font-semibold mb-1">Chosen: {req.paymentDetailsSnapshot.chosenPaymentMethod.toUpperCase()}</div>}
                                    
                                    {req.paymentDetailsSnapshot.paypalEmail && <div><dt className="font-medium text-muted-foreground">PayPal Email:</dt> <dd>{req.paymentDetailsSnapshot.paypalEmail}</dd></div>}
                                    {req.paymentDetailsSnapshot.upiId && <div><dt className="font-medium text-muted-foreground">UPI ID:</dt> <dd>{req.paymentDetailsSnapshot.upiId}</dd></div>}
                                    {req.paymentDetailsSnapshot.bankAccountHolderName && <div><dt className="font-medium text-muted-foreground">Account Holder:</dt> <dd>{req.paymentDetailsSnapshot.bankAccountHolderName}</dd></div>}
                                    {req.paymentDetailsSnapshot.accountNumber && <div><dt className="font-medium text-muted-foreground">Account Number:</dt> <dd>{req.paymentDetailsSnapshot.accountNumber}</dd></div>}
                                    {req.paymentDetailsSnapshot.bankName && <div><dt className="font-medium text-muted-foreground">Bank Name:</dt> <dd>{req.paymentDetailsSnapshot.bankName}</dd></div>}
                                    {req.paymentDetailsSnapshot.ifscCode && <div><dt className="font-medium text-muted-foreground">IFSC Code:</dt> <dd>{req.paymentDetailsSnapshot.ifscCode}</dd></div>}
                                </dl>
                                {req.processedAt && <p className="text-xs text-muted-foreground mt-3">Processed At: {format(req.processedAt.toDate(), 'MMM d, yyyy, h:mm a')}</p>}
                            </AccordionContent>
                        </TableCell>
                      </TableRow>
                  </Accordion>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-6 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-300 text-sm flex items-start gap-2">
            <Info className="h-5 w-5 mt-0.5 shrink-0" />
            <p>This panel allows changing the status of withdrawal requests. Actual financial transactions must be handled externally (e.g., manual PayPal transfer, bank payment). Marking a request as 'Completed' signifies that the payment has been made outside of this system. 'Rejected' means the request will not be processed.</p>
        </div>
      </CardContent>
    </Card>
  );
}

