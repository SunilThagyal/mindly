
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WithdrawalRequest } from '@/lib/types';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Hourglass, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';

interface WithdrawalDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: WithdrawalRequest;
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-muted/50">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground text-sm sm:text-right">{value}</dd>
    </div>
  );
};

export default function WithdrawalDetailsDialog({ isOpen, onClose, request }: WithdrawalDetailsDialogProps) {

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

  const formatPaymentMethod = (details: WithdrawalRequest['paymentDetailsSnapshot']) => {
    const method = details.chosenPaymentMethod;
    if (method === 'paypal') return "PayPal";
    if (method === 'upi') return "UPI";
    if (method === 'bank') return "Bank Transfer";
    return 'N/A';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Withdrawal Details</DialogTitle>
          <DialogDescription>
            Detailed information for your withdrawal request.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <dl className="space-y-1">
            <DetailRow label="Request ID" value={<code className="text-xs bg-muted p-1 rounded-sm">{request.id}</code>} />
            <DetailRow label="Amount" value={<span className="font-bold text-lg">${request.amount.toFixed(2)}</span>} />
            <DetailRow label="Status" value={
                <Badge className={getStatusColorClass(request.status)}>
                    {getStatusIcon(request.status)}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
            } />
            <DetailRow label="Requested At" value={request.requestedAt ? format(request.requestedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'} />
            <DetailRow label="Processed At" value={request.processedAt ? format(request.processedAt.toDate(), 'MMM d, yyyy, h:mm a') : 'N/A'} />
          </dl>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-foreground mb-2">Payment Information Snapshot</h4>
            <dl className="space-y-1 text-sm">
                <DetailRow label="Country" value={request.paymentDetailsSnapshot.country} />
                <DetailRow label="Method" value={formatPaymentMethod(request.paymentDetailsSnapshot)} />
                <DetailRow label="Contact" value={request.paymentDetailsSnapshot.contact} />
                <DetailRow label="Address" value={<p className="whitespace-pre-wrap">{request.paymentDetailsSnapshot.address}</p>} />
                <DetailRow label="PayPal Email" value={request.paymentDetailsSnapshot.paypalEmail} />
                <DetailRow label="UPI ID" value={request.paymentDetailsSnapshot.upiId} />
                <DetailRow label="Account Holder" value={request.paymentDetailsSnapshot.bankAccountHolderName} />
                <DetailRow label="Account Number" value={request.paymentDetailsSnapshot.accountNumber} />
                <DetailRow label="Bank Name" value={request.paymentDetailsSnapshot.bankName} />
                <DetailRow label="IFSC Code" value={request.paymentDetailsSnapshot.ifscCode} />
            </dl>
          </div>
          
          {request.status === 'rejected' && request.adminNotes && (
            <div className="pt-4 border-t">
                <h4 className="font-semibold text-destructive mb-2 flex items-center"><MessageSquare className="mr-2 h-4 w-4"/>Admin's Note</h4>
                <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20">{request.adminNotes}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
