import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Process1, UserAccess } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';

interface UserWithRoles extends Profile {
  roles: string[];
  accessCount: number;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [processes, setProcesses] = useState<Process1[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    selectedRole: 'user' as 'admin' | 'user',
    selectedProcesses: new Set<string>(),
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadProcesses();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Загружаем профили пользователей
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!profiles) {
        setUsers([]);
        return;
      }

      // Для каждого пользователя загружаем его роли и доступы
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          // Загружаем роли пользователя
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          // Загружаем количество доступных процессов
          const { count: accessCount } = await supabase
            .from('user_access')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: userRoles?.map(r => r.role) || [],
            accessCount: accessCount || 0,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: "destructive",
        title: "Ошибка загрузки",
        description: "Не удалось загрузить список пользователей",
      });
    } finally {
      setLoadingUsers(false);
    }
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

  const handleRoleChange = (value: 'admin' | 'user') => {
    if (value === 'admin') {
      // Для администратора автоматически выбираем все процессы
      const allProcesses = new Set(processes.map(p => p.f1_index));
      setFormData({ ...formData, selectedRole: value, selectedProcesses: allProcesses });
    } else {
      setFormData({ ...formData, selectedRole: value });
    }
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
          role: formData.selectedRole,
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
        selectedRole: 'user',
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
                <Label htmlFor="role">Роль</Label>
                <Select
                  value={formData.selectedRole}
                  onValueChange={handleRoleChange}
                  disabled={loading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
                {formData.selectedRole === 'admin' && (
                  <p className="text-sm text-muted-foreground">
                    Администратор имеет доступ ко всем процессам автоматически
                  </p>
                )}
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
                        disabled={loading || formData.selectedRole === 'admin'}
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
            <TableHead>Роли</TableHead>
            <TableHead>Доступные процессы</TableHead>
            <TableHead>Дата создания</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingUsers ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Загрузка пользователей...</p>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Пользователи не найдены
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.full_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge 
                          key={role} 
                          variant={role === 'admin' ? 'default' : 'secondary'}
                        >
                          {role === 'admin' ? 'Администратор' : 
                           role === 'moderator' ? 'Модератор' : 'Пользователь'}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Нет ролей</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.accessCount}</Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
