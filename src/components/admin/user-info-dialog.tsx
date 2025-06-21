
"use client";

import { useState, useEffect } from 'react';
import type { UserProfile, WithdrawalRequest } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserCircle, FileText, Eye, DollarSign, Banknote, History, Loader2, CheckCircle, XCircle, Hourglass, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  stats: { postCount: number; totalViews: number };
}

async function getUserWithdrawalHistory(userId: string): Promise<WithdrawalRequest[]> {
    const requestsCol = collection(db, 'withdrawalRequests');
    const q = query(requestsCol, where('userId', '==', userId), orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt : Timestamp.now(),
            processedAt: data.processedAt instanceof Timestamp ? data.processedAt : null,
        } as WithdrawalRequest;
    });
}

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
      default: return <Hourglass className="mr-1.5 h-3.5 w-3.5" />;
    }
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="p-3 bg-muted rounded-lg flex flex-col items-center justify-center gap-1">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

export default function UserInfoDialog({ isOpen, onClose, user, stats }: UserInfoDialogProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (isOpen && user.uid) {
      setLoadingHistory(true);
      getUserWithdrawalHistory(user.uid)
        .then(setWithdrawals)
        .catch(err => console.error("Failed to fetch withdrawal history:", err))
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, user.uid]);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-xl">{user.displayName || 'N/A'}</p>
                <DialogDescription>{user.email}</DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <div className="py-4 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <StatCard icon={<FileText className="h-5 w-5"/>} label="Total Posts" value={stats.postCount} />
                    <StatCard icon={<Eye className="h-5 w-5"/>} label="Total Views" value={stats.totalViews} />
                    <StatCard icon={<DollarSign className="h-5 w-5 text-green-500"/>} label="Current Balance" value={`$${(user.virtualEarnings || 0).toFixed(2)}`} />
                    <StatCard icon={<Banknote className="h-5 w-5 text-blue-500"/>} label="Total Withdrawn" value={`$${totalWithdrawn.toFixed(2)}`} />
                </div>
                <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center"><History className="mr-2 h-4 w-4"/>Withdrawal History</h4>
                    {loadingHistory ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="animate-spin h-6 w-6 text-primary"/>
                        </div>
                    ) : withdrawals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-md">No withdrawal requests found.</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.slice(0, 5).map(req => ( // show latest 5
                                        <TableRow key={req.id}>
                                            <TableCell className="text-xs">{format(req.requestedAt.toDate(), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium">${req.amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColorClass(req.status)}>
                                                    {getStatusIcon(req.status)}
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
