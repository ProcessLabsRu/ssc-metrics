import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Process1, UserAccess } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2 } from 'lucide-react';

export const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [processes, setProcesses] = useState<Process1[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    selectedProcesses: new Set<string>(),
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadProcesses();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    setUsers(data || []);
  };

  const loadProcesses = async () => {
    const { data } = await supabase
      .from('process_1')
      .select('*')
      .eq('is_active', true)
      .order('sort');
    
    setProcesses(data || []);
  };

  const toggleProcess = (f1Index: string) => {
    const newSelected = new Set(formData.selectedProcesses);
    if (newSelected.has(f1Index)) {
      newSelected.delete(f1Index);
    } else {
      newSelected.add(f1Index);
    }
    setFormData({ ...formData, selectedProcesses: newSelected });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedProcesses.size === 0) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Выберите хотя бы один процесс 1 уровня",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'user',
        });

      for (const f1Index of Array.from(formData.selectedProcesses)) {
        await supabase
          .from('user_access')
          .insert({
            user_id: authData.user.id,
            f1_index: f1Index,
          });
      }

      toast({
        title: "Пользователь создан",
        description: "Новый пользователь успешно добавлен в систему",
      });

      setOpen(false);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        selectedProcesses: new Set(),
      });
      loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка создания пользователя",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление пользователями</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Создать пользователя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создание нового пользователя</DialogTitle>
              <DialogDescription>
                Заполните данные пользователя и выберите доступные процессы
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Полное имя</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Доступные процессы 1 уровня</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                  {processes.map((process) => (
                    <div key={process.f1_index} className="flex items-center space-x-2">
                      <Checkbox
                        id={process.f1_index}
                        checked={formData.selectedProcesses.has(process.f1_index)}
                        onCheckedChange={() => toggleProcess(process.f1_index)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={process.f1_index}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {process.f1_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать пользователя'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Дата создания</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.full_name || '-'}</TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
