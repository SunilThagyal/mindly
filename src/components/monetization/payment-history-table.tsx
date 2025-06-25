
"use client";

import type { WithdrawalRequest } from '@/lib/types';
import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import WithdrawalDetailsDialog from './withdrawal-details-dialog';

interface PaymentHistoryTableProps {
  requests: WithdrawalRequest[];
}

export default function PaymentHistoryTable({ requests }: PaymentHistoryTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

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
      case 'approved': return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />;
      case 'processing': return <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />;
      case 'completed': return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="mr-1.5 h-3.5 w-3.5" />;
      default: return <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />;
    }
  };

  const handleOpenDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
  };

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processed At</TableHead>
              <TableHead className="text-center">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
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
                <TableCell>
                  {req.processedAt ? format(req.processedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(req)}>
                    <Info className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRequest && (
        <WithdrawalDetailsDialog
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </>
  );
}
