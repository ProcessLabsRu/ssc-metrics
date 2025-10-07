import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/admin/UserManagement';
import { SmtpSettings } from '@/components/admin/SmtpSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, Mail } from 'lucide-react';

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Ждем завершения загрузки перед проверкой
    if (loading) return;
    
    // Если пользователь не авторизован, отправляем на /auth
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Если пользователь авторизован, но не админ, отправляем на главную
    if (!isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  // Показываем загрузку, пока идет проверка
  if (loading || (user && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  // Если нет пользователя, не показываем контент (идет редирект)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Панель администратора</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              Перейти к работе
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Выход
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              SMTP настройки
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
          <TabsContent value="smtp" className="mt-6">
            <SmtpSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
