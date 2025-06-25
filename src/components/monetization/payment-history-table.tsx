
"use client";

import type { WithdrawalRequest } from '@/lib/types';
import React from 'react';
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
import { CheckCircle, XCircle, Hourglass, RefreshCw, AlertTriangle, Info } from 'lucide-react'; 

interface PaymentHistoryTableProps {
  requests: WithdrawalRequest[];
}

export default function PaymentHistoryTable({ requests }: PaymentHistoryTableProps) {

  const getStatusVariant = (status: WithdrawalRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'secondary'; // Yellowish in theme might be better
      case 'approved': return 'default'; // Blueish, primary
      case 'processing': return 'outline'; // Could be a different color
      case 'completed': return 'default'; // Greenish, if we add custom success variant
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColorClass = (status: WithdrawalRequest['status']): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-500/90 text-primary-foreground';
      case 'approved': return 'bg-blue-500 hover:bg-blue-500/90 text-primary-foreground';
      case 'processing': return 'bg-indigo-500 hover:bg-indigo-500/90 text-primary-foreground';
      case 'completed': return 'bg-green-600 hover:bg-green-600/90 text-primary-foreground';
      case 'rejected': return 'bg-red-600 hover:bg-red-600/90 text-primary-foreground';
      default: return 'bg-gray-500 text-primary-foreground';
    }
  };
  
  const getStatusIcon = (status: WithdrawalRequest['status']): JSX.Element => {
    switch (status) {
      case 'pending': return <Hourglass className="mr-1.5 h-3.5 w-3.5" />;
      case 'approved': return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />; // Could use a different "approved" icon
      case 'processing': return <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />;
      case 'completed': return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="mr-1.5 h-3.5 w-3.5" />;
      default: return <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />;
    }
  };


  const formatPaymentMethod = (details: WithdrawalRequest['paymentDetailsSnapshot']): string => {
    if (!details) return 'N/A';
    const method = details.chosenPaymentMethod;
    if (method === 'paypal') return `PayPal (${details.paypalEmail || 'N/A'})`;
    if (method === 'upi') return `UPI (${details.upiId || 'N/A'})`;
    if (method === 'bank') return `Bank (${details.bankName || 'N/A'} - Acc: ...${(details.accountNumber || '').slice(-4)})`;
    return 'N/A';
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requested At</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Processed At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => (
            <React.Fragment key={req.id}>
              <TableRow>
                <TableCell>
                  {req.requestedAt ? format(req.requestedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'}
                </TableCell>
                <TableCell className="text-right font-medium">${req.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={getStatusColorClass(req.status)}>
                    {getStatusIcon(req.status)}
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{formatPaymentMethod(req.paymentDetailsSnapshot)}</TableCell>
                <TableCell>
                  {req.processedAt ? format(req.processedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'}
                </TableCell>
              </TableRow>
              {req.status === 'rejected' && req.adminNotes && (
                <TableRow>
                    <TableCell colSpan={5} className="p-0 border-t-0">
                        <div className="bg-destructive/10 text-destructive p-3 text-xs flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold text-destructive/80">Rejection Reason:</span>
                                <p className="whitespace-pre-wrap">{req.adminNotes}</p>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
