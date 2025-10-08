import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubmitButtonProps {
  totalHours: number;
  isSubmitted: boolean;
  onSubmitSuccess: () => void;
}

export const SubmitButton = ({ totalHours, isSubmitted, onSubmitSuccess }: SubmitButtonProps) => {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Необходима авторизация');
      }

      const { data, error } = await supabase.functions.invoke('submit-user-responses', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Данные отправлены",
          description: data.message,
        });
        setSubmitDialogOpen(false);
        onSubmitSuccess();
      } else {
        throw new Error(data.error || 'Ошибка отправки данных');
      }
    } catch (error: any) {
      console.error('Error submitting responses:', error);
      toast({
        variant: "destructive",
        title: "Ошибка отправки",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setSubmitDialogOpen(true)}
        disabled={totalHours === 0}
        className="whitespace-nowrap"
      >
        <Send className="mr-2 h-4 w-4" />
        Отправить данные
      </Button>

      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение отправки данных</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отправить данные? После отправки вы не сможете их изменить.
              <br /><br />
              <strong>Сумма трудоемкости: {totalHours.toFixed(2)} ч/ч</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Отправка...' : 'Отправить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
