import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ImpersonationBanner = () => {
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const impersonatedData = localStorage.getItem('impersonated_user');
    if (impersonatedData) {
      setImpersonatedUser(JSON.parse(impersonatedData));
    }
  }, []);

  const handleReturnToAdmin = async () => {
    try {
      const adminSessionBackup = localStorage.getItem('admin_session_backup');
      
      if (!adminSessionBackup) {
        throw new Error('Admin session backup not found');
      }

      const adminSession = JSON.parse(adminSessionBackup);
      
      // Restore admin session
      const { error } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (error) {
        throw error;
      }

      // Clear impersonation data
      localStorage.removeItem('impersonated_user');
      localStorage.removeItem('admin_session_backup');

      toast({
        title: "Успешно",
        description: "Вы вернулись к своему аккаунту администратора",
      });

      // Redirect to admin page
      window.location.href = '/admin';
      
    } catch (error: any) {
      console.error('Return to admin error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось вернуться к админскому аккаунту. Выполните выход и войдите заново.",
      });
      
      // If restore fails, logout completely for safety
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
  };

  if (!impersonatedUser) {
    return null;
  }

  return (
    <div className="bg-purple-600 text-white px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">
              Режим просмотра от имени пользователя
            </p>
            <p className="text-sm text-purple-100">
              Вы вошли как <strong>{impersonatedUser.email}</strong> (Админ: {impersonatedUser.admin_email})
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReturnToAdmin}
          className="bg-white text-purple-600 hover:bg-purple-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Вернуться к админу
        </Button>
      </div>
    </div>
  );
};
