import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, MessageSquare, PoundSterling, CreditCard, Clock, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnpaidJobCardProps {
  job: JobWithCustomer;
  index: number;
  businessName?: string;
  onMarkPaid: () => void;
  profile?: { gocardless_organisation_id?: string | null } | null;
}

export function UnpaidJobCard({ job, index, businessName = 'Your window cleaner', onMarkPaid, profile }: UnpaidJobCardProps) {
  const [isSendingDDLink, setIsSendingDDLink] = useState(false);
  
  const isGoCardlessConnected = !!profile?.gocardless_organisation_id;
  const hasActiveMandate = !!job.customer.gocardless_id;
  const canSendDDLink = isGoCardlessConnected && !hasActiveMandate && !!job.customer.mobile_phone;
  
  const firstName = job.customer.name.split(' ')[0];
  const completedDate = job.completed_at ? format(new Date(job.completed_at), 'd MMM') : 'recently';
  const amount = (job.amount_collected || 0).toFixed(2);
  
  const handleSendReminder = () => {
    const message = encodeURIComponent(
      `Hi ${firstName}, ${businessName} here 👋\n\nJust a friendly reminder about your window clean from ${completedDate}.\n\nAmount due: £${amount}\n\nThanks so much!`
    );
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${message}`, '_self');
  };

  const handleCall = () => {
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`tel:${phone}`, '_self');
  };

  const sendDDLinkViaSMS = async () => {
    if (!job.customer.mobile_phone) return;

    setIsSendingDDLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
        body: { 
          customerId: job.customer.id,
          customerName: job.customer.name,
          exitUrl: window.location.origin
        }
      });

      if (error) throw error;
      if (!data?.authorisationUrl) throw new Error('No authorization URL returned');

      const message = encodeURIComponent(
        `Hi ${firstName}, please set up your Direct Debit for ${businessName} using this secure link: ${data.authorisationUrl}`
      );
      const phone = job.customer.mobile_phone.replace(/\s/g, '');
      window.open(`sms:${phone}?body=${message}`, '_blank');

      toast.success('SMS opened with DD link');
    } catch (error: any) {
      console.error('Failed to send DD link:', error);
      toast.error(error.message || 'Failed to generate DD link');
    } finally {
      setIsSendingDDLink(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate text-lg">
                {job.customer.name}
              </p>
              {/* Mandate Status Indicator */}
              {job.customer.gocardless_mandate_status === 'pending' ? (
                <span title="DD Pending"><Clock className="w-4 h-4 text-warning" /></span>
              ) : job.customer.gocardless_id ? (
                <span title="DD Active"><CreditCard className="w-4 h-4 text-success" /></span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.customer.address}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Completed: {job.completed_at ? format(new Date(job.completed_at), 'd MMM yyyy') : 'Unknown'}
            </p>
          </div>
          <div className="text-right ml-4">
            <div className="flex items-center gap-1 text-warning">
              <PoundSterling className="w-5 h-5" />
              <span className="text-2xl font-bold">{(job.amount_collected || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {job.customer.mobile_phone && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 min-w-[100px]"
                onClick={handleSendReminder}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Remind
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleCall}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </>
          )}
          {/* DD Link button for customers without mandate */}
          {canSendDDLink && (
            <Button
              variant="outline"
              size="lg"
              onClick={sendDDLinkViaSMS}
              disabled={isSendingDDLink}
              className="text-primary border-primary/20 hover:bg-primary/10"
            >
              {isSendingDDLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="success"
            size="lg"
            className="flex-1 min-w-[100px]"
            onClick={onMarkPaid}
          >
            Mark Paid
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
