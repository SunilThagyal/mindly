
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection, runTransaction } from 'firebase/firestore';
import type { UserProfile, WithdrawalRequest, EarningsSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useEarningsSettings } from '@/context/earnings-settings-context';
import { Loader2, Send, CheckCircle, AlertTriangle, Landmark, CreditCard, Mail, ArrowRight } from 'lucide-react';

interface MonetizationFormProps {
  userProfile: UserProfile;
  userId: string;
}

type PaymentMethodIndia = 'upi' | 'bank' | 'paypal_india';

export default function MonetizationForm({ userProfile, userId }: MonetizationFormProps) {
  const { toast } = useToast();
  const earningsSettings = useEarningsSettings(); // Get full settings object

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    paymentCountry: userProfile.paymentCountry || null,
    paymentContactDetails: userProfile.paymentContactDetails || '',
    paymentAddress: userProfile.paymentAddress || '',
    paymentUpiId: userProfile.paymentUpiId || '',
    paymentBankAccountHolderName: userProfile.paymentBankAccountHolderName || '',
    paymentAccountNumber: userProfile.paymentAccountNumber || '',
    paymentBankName: userProfile.paymentBankName || '',
    paymentIfscCode: userProfile.paymentIfscCode || '',
    paymentPaypalEmail: userProfile.paymentPaypalEmail || '',
  });
  const [indiaPaymentMethod, setIndiaPaymentMethod] = useState<PaymentMethodIndia | null>(null);

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isRequestingWithdrawal, setIsRequestingWithdrawal] = useState(false);

  // Determine initial India payment method selection
  useEffect(() => {
    if (userProfile.paymentCountry === 'India') {
      if (userProfile.paymentUpiId) {
        setIndiaPaymentMethod('upi');
      } else if (userProfile.paymentAccountNumber) {
        setIndiaPaymentMethod('bank');
      } else if (userProfile.paymentPaypalEmail) {
        setIndiaPaymentMethod('paypal_india');
      }
    }
  }, [userProfile.paymentCountry, userProfile.paymentUpiId, userProfile.paymentAccountNumber, userProfile.paymentPaypalEmail]);


  const handleDetailsChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePaymentDetails = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);

    // Clear other payment fields based on selection for India
    const updatesToSave = { ...formData };
    if (formData.paymentCountry === 'India') {
      if (indiaPaymentMethod === 'upi') {
        updatesToSave.paymentBankAccountHolderName = null; // Clear bank details
        updatesToSave.paymentAccountNumber = null;
        updatesToSave.paymentBankName = null;
        updatesToSave.paymentIfscCode = null;
        if (updatesToSave.paymentPaypalEmail && formData.paymentPaypalEmail === userProfile.paymentPaypalEmail && !formData.paymentUpiId) {
            // if paypal was the original method and user just selected UPI without filling it, don't clear paypal
        } else if (indiaPaymentMethod !== 'paypal_india') {
             updatesToSave.paymentPaypalEmail = null;
        }

      } else if (indiaPaymentMethod === 'bank') {
        updatesToSave.paymentUpiId = null; // Clear UPI
         if (indiaPaymentMethod !== 'paypal_india') {
             updatesToSave.paymentPaypalEmail = null;
        }
      } else if (indiaPaymentMethod === 'paypal_india') {
        updatesToSave.paymentUpiId = null;
        updatesToSave.paymentBankAccountHolderName = null;
        updatesToSave.paymentAccountNumber = null;
        updatesToSave.paymentBankName = null;
        updatesToSave.paymentIfscCode = null;
      }
    } else if (formData.paymentCountry === 'USA' || formData.paymentCountry === 'Other') {
        updatesToSave.paymentUpiId = null;
        updatesToSave.paymentBankAccountHolderName = null;
        updatesToSave.paymentAccountNumber = null;
        updatesToSave.paymentBankName = null;
        updatesToSave.paymentIfscCode = null;
    }


    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, updatesToSave);
      toast({
        title: 'Payment Details Saved!',
        description: 'Your payment information has been updated.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error("Error saving payment details:", error);
      toast({
        title: 'Save Error',
        description: error.message || 'Failed to save payment details.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleWithdrawalRequest = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    const minWithdrawal = earningsSettings.minimumWithdrawalAmount || 0;

    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount.', variant: 'destructive' });
      return;
    }
    if (amount < minWithdrawal) {
      toast({ title: 'Minimum Not Met', description: `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}.`, variant: 'destructive' });
      return;
    }
    if (amount > (userProfile.virtualEarnings || 0)) {
      toast({ title: 'Insufficient Balance', description: 'Withdrawal amount exceeds your available earnings.', variant: 'destructive' });
      return;
    }

    // Check if essential payment details for chosen method are filled
    let paymentDetailsFilled = false;
    if (formData.paymentCountry === 'India') {
        if (indiaPaymentMethod === 'upi' && formData.paymentUpiId) paymentDetailsFilled = true;
        else if (indiaPaymentMethod === 'bank' && formData.paymentBankAccountHolderName && formData.paymentAccountNumber && formData.paymentBankName && formData.paymentIfscCode) paymentDetailsFilled = true;
        else if (indiaPaymentMethod === 'paypal_india' && formData.paymentPaypalEmail) paymentDetailsFilled = true;
    } else if ((formData.paymentCountry === 'USA' || formData.paymentCountry === 'Other') && formData.paymentPaypalEmail) {
        paymentDetailsFilled = true;
    }

    if (!paymentDetailsFilled) {
        toast({ title: 'Payment Details Incomplete', description: 'Please ensure all required payment details for your chosen method are filled and saved.', variant: 'destructive' });
        return;
    }


    setIsRequestingWithdrawal(true);
    try {
      const withdrawalData: Omit<WithdrawalRequest, 'id' | 'requestedAt'> = {
        userId: userId,
        userDisplayName: userProfile.displayName || null,
        userEmail: userProfile.email || null,
        amount: amount,
        status: 'pending',
        paymentDetailsSnapshot: {
          country: formData.paymentCountry,
          contact: formData.paymentContactDetails,
          address: formData.paymentAddress,
          upiId: formData.paymentCountry === 'India' && indiaPaymentMethod === 'upi' ? formData.paymentUpiId : null,
          bankAccountHolderName: formData.paymentCountry === 'India' && indiaPaymentMethod === 'bank' ? formData.paymentBankAccountHolderName : null,
          accountNumber: formData.paymentCountry === 'India' && indiaPaymentMethod === 'bank' ? formData.paymentAccountNumber : null,
          bankName: formData.paymentCountry === 'India' && indiaPaymentMethod === 'bank' ? formData.paymentBankName : null,
          ifscCode: formData.paymentCountry === 'India' && indiaPaymentMethod === 'bank' ? formData.paymentIfscCode : null,
          paypalEmail: (formData.paymentCountry !== 'India' || indiaPaymentMethod === 'paypal_india') ? formData.paymentPaypalEmail : null,
          chosenPaymentMethod: formData.paymentCountry === 'India' ? indiaPaymentMethod?.replace('_india', '') as any : 'paypal',
        },
      };

      const userDocRef = doc(db, 'users', userId);
      
      // Use a transaction to ensure atomicity for earnings deduction and request creation
      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) {
          throw "User document does not exist!";
        }
        const currentEarnings = userDocSnap.data().virtualEarnings || 0;
        if (amount > currentEarnings) {
          throw "Insufficient balance for withdrawal (checked again in transaction).";
        }
        const newEarnings = currentEarnings - amount;
        
        transaction.update(userDocRef, { virtualEarnings: newEarnings });
        
        const newRequestRef = doc(collection(db, 'withdrawalRequests'));
        transaction.set(newRequestRef, {...withdrawalData, requestedAt: serverTimestamp()});
      });


      toast({
        title: 'Withdrawal Requested!',
        description: `Your request for $${amount.toFixed(2)} has been submitted.`,
        variant: 'success',
      });
      setWithdrawalAmount('');
      // userProfile.virtualEarnings will update via AuthContext listener, or force refresh if needed
    } catch (error: any) {
      console.error("Error requesting withdrawal:", error);
      toast({
        title: 'Withdrawal Error',
        description: typeof error === 'string' ? error : error.message || 'Failed to submit withdrawal request.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingWithdrawal(false);
    }
  };
  

  return (
    <div className="space-y-10">
      <form onSubmit={handleSavePaymentDetails} className="space-y-6 p-6 border rounded-lg shadow-sm bg-background">
        <h3 className="text-xl font-semibold text-foreground border-b pb-3 mb-4">Payment Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="paymentCountry">Country</Label>
                <Select 
                    value={formData.paymentCountry || ''} 
                    onValueChange={(value) => handleDetailsChange('paymentCountry', value as UserProfile['paymentCountry'])}
                    disabled={isSavingDetails}
                >
                    <SelectTrigger id="paymentCountry"><SelectValue placeholder="Select your country" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">United States</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="paymentContactDetails">Contact Phone (Optional, with country code)</Label>
                <Input 
                    id="paymentContactDetails" 
                    value={formData.paymentContactDetails || ''} 
                    onChange={(e) => handleDetailsChange('paymentContactDetails', e.target.value)}
                    placeholder="+1 1234567890"
                    disabled={isSavingDetails} 
                />
            </div>
        </div>

        <div>
            <Label htmlFor="paymentAddress">Full Address (Optional)</Label>
            <Textarea 
                id="paymentAddress" 
                value={formData.paymentAddress || ''} 
                onChange={(e) => handleDetailsChange('paymentAddress', e.target.value)}
                placeholder="Street, City, State, Postal Code" 
                rows={3}
                disabled={isSavingDetails}
            />
        </div>

        {formData.paymentCountry === 'India' && (
          <div className="space-y-4 p-4 border rounded-md bg-muted/30">
            <Label className="text-md font-medium">Payment Method for India</Label>
            <RadioGroup 
                value={indiaPaymentMethod || ""} 
                onValueChange={(value) => setIndiaPaymentMethod(value as PaymentMethodIndia)}
                className="space-y-2"
                disabled={isSavingDetails}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="font-normal flex items-center"><CreditCard className="mr-2 h-4 w-4 text-primary"/>UPI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="font-normal flex items-center"><Landmark className="mr-2 h-4 w-4 text-primary"/>Bank Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal_india" id="paypal_india" />
                <Label htmlFor="paypal_india" className="font-normal flex items-center"><Mail className="mr-2 h-4 w-4 text-primary"/>PayPal</Label>
              </div>
            </RadioGroup>

            {indiaPaymentMethod === 'upi' && (
              <div>
                <Label htmlFor="paymentUpiId">UPI ID</Label>
                <Input id="paymentUpiId" value={formData.paymentUpiId || ''} onChange={(e) => handleDetailsChange('paymentUpiId', e.target.value)} placeholder="yourname@bank" disabled={isSavingDetails} />
              </div>
            )}
            {indiaPaymentMethod === 'bank' && (
              <div className="space-y-3">
                <div><Label htmlFor="paymentBankAccountHolderName">Bank Account Holder Name</Label><Input id="paymentBankAccountHolderName" value={formData.paymentBankAccountHolderName || ''} onChange={(e) => handleDetailsChange('paymentBankAccountHolderName', e.target.value)} placeholder="Full name as per bank records" disabled={isSavingDetails} /></div>
                <div><Label htmlFor="paymentAccountNumber">Account Number</Label><Input id="paymentAccountNumber" value={formData.paymentAccountNumber || ''} onChange={(e) => handleDetailsChange('paymentAccountNumber', e.target.value)} placeholder="e.g., 123456789012" disabled={isSavingDetails} /></div>
                <div><Label htmlFor="paymentBankName">Bank Name</Label><Input id="paymentBankName" value={formData.paymentBankName || ''} onChange={(e) => handleDetailsChange('paymentBankName', e.target.value)} placeholder="e.g., State Bank of India" disabled={isSavingDetails} /></div>
                <div><Label htmlFor="paymentIfscCode">IFSC Code</Label><Input id="paymentIfscCode" value={formData.paymentIfscCode || ''} onChange={(e) => handleDetailsChange('paymentIfscCode', e.target.value)} placeholder="e.g., SBIN0000000" disabled={isSavingDetails} /></div>
              </div>
            )}
             {indiaPaymentMethod === 'paypal_india' && (
              <div>
                <Label htmlFor="paymentPaypalEmailIndia">PayPal Email</Label>
                <Input id="paymentPaypalEmailIndia" type="email" value={formData.paymentPaypalEmail || ''} onChange={(e) => handleDetailsChange('paymentPaypalEmail', e.target.value)} placeholder="paypal@example.com" disabled={isSavingDetails} />
              </div>
            )}
          </div>
        )}

        {(formData.paymentCountry === 'USA' || formData.paymentCountry === 'Other') && (
          <div>
            <Label htmlFor="paymentPaypalEmailGlobal">PayPal Email</Label>
            <Input id="paymentPaypalEmailGlobal" type="email" value={formData.paymentPaypalEmail || ''} onChange={(e) => handleDetailsChange('paymentPaypalEmail', e.target.value)} placeholder="paypal@example.com" disabled={isSavingDetails} />
          </div>
        )}
        
        <Button type="submit" disabled={isSavingDetails} className="w-full sm:w-auto">
          {isSavingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Payment Details
        </Button>
      </form>

      <form onSubmit={handleWithdrawalRequest} className="space-y-6 p-6 border rounded-lg shadow-sm bg-background">
        <h3 className="text-xl font-semibold text-foreground border-b pb-3 mb-4">Request Withdrawal</h3>
        <div className="p-4 bg-primary/10 rounded-md text-center">
            <p className="text-sm text-primary-foreground/80">Available Earnings:</p>
            <p className="text-3xl font-bold text-primary">${(userProfile.virtualEarnings || 0).toFixed(2)}</p>
        </div>
        
        <div>
            <Label htmlFor="withdrawalAmount">Amount to Withdraw ($)</Label>
            <Input 
                id="withdrawalAmount" 
                type="number" 
                step="0.01"
                min="0"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder={`Min $${(earningsSettings.minimumWithdrawalAmount || 0).toFixed(2)}`}
                disabled={isRequestingWithdrawal} 
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal amount: ${ (earningsSettings.minimumWithdrawalAmount || 0).toFixed(2)}</p>
        </div>
        
        <Button type="submit" disabled={isRequestingWithdrawal || !withdrawalAmount} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
          {isRequestingWithdrawal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit Withdrawal Request
        </Button>
         <p className="text-xs text-muted-foreground">Withdrawals are processed manually by admins. Ensure your payment details above are correct and saved before requesting.</p>
      </form>
    </div>
  );
}
