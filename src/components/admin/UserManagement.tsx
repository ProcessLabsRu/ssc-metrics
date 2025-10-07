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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { UserPlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
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

  const generatePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    // Гарантируем наличие хотя бы одного символа каждого типа
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Добавляем оставшиеся 4 символа случайным образом
    for (let i = 4; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Перемешиваем символы
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData({ ...formData, password });
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
      // Call Edge Function to create user with admin privileges
      const { data: userData, error: createError } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          role: formData.selectedRole,
          processes: Array.from(formData.selectedProcesses),
        },
      });

      if (createError) throw createError;
      if (!userData?.success) throw new Error('User creation failed');

      toast({
        title: "Пользователь создан",
        description: "Новый пользователь успешно добавлен в систему",
      });

      // Try to send invitation email
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName || formData.email,
          },
        });

        if (emailError) throw emailError;

        if (emailData?.success) {
          toast({
            title: "Приглашение отправлено",
            description: `На ${formData.email} отправлено письмо с данными для входа`,
          });
        }
      } catch (emailError: any) {
        console.error('Error sending invitation:', emailError);
        toast({
          variant: "destructive",
          title: "Письмо не отправлено",
          description: `Пользователь создан, но письмо не отправлено: ${emailError.message}`,
        });
      }

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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-admin', {
        body: {
          user_id: userToDelete.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Пользователь удален",
        description: `Пользователь ${userToDelete.email} успешно удален из системы`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка удаления пользователя",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteUser = (user: UserWithRoles) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
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
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    minLength={6}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generatePassword}
                    disabled={loading}
                    title="Сгенерировать пароль"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || formData.selectedProcesses.size === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать пользователя'
                )}
              </Button>
              {formData.selectedProcesses.size === 0 && (
                <p className="text-sm text-destructive text-center">
                  Необходимо выбрать хотя бы один процесс 1 уровня
                </p>
              )}
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
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingUsers ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Загрузка пользователей...</p>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDeleteUser(user)}
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить пользователя <strong>{userToDelete?.email}</strong>?
              <br />
              <br />
              Это действие удалит:
              <ul className="list-disc list-inside mt-2">
                <li>Профиль пользователя</li>
                <li>Все роли пользователя</li>
                <li>Доступы к процессам</li>
                <li>Все ответы пользователя ({userToDelete?.accessCount || 0} записей)</li>
              </ul>
              <br />
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
