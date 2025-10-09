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
import { UserPlus, Loader2, RefreshCw, Trash2, Mail, Upload, Download, X, Edit, Key, Copy } from 'lucide-react';

interface UserWithRoles extends Profile {
  roles: string[];
  accessCount: number;
  accessProcesses: string[]; // список f1_index
  invitation_sent_at: string | null;
  last_sign_in_at: string | null;
  questionnaire_completed: boolean;
  questionnaire_completed_at: string | null;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [processes, setProcesses] = useState<Process1[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: any[];
    duplicates: any[];
    errors: any[];
  }>({ valid: [], duplicates: [], errors: [] });
  const [bulkResults, setBulkResults] = useState<any>(null);
  
  // Массовые действия
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkResendDialogOpen, setBulkResendDialogOpen] = useState(false);
  const [bulkActionResults, setBulkActionResults] = useState<any>(null);
  
  // Редактирование процессов
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [showEditProcessesDialog, setShowEditProcessesDialog] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  
  // Сброс пароля
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRoles | null>(null);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
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

          // Загружаем доступные процессы
          const { data: userAccess, count: accessCount } = await supabase
            .from('user_access')
            .select('f1_index', { count: 'exact' })
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: userRoles?.map(r => r.role) || [],
            accessCount: accessCount || 0,
            accessProcesses: userAccess?.map(a => a.f1_index) || [],
            invitation_sent_at: profile.invitation_sent_at,
            last_sign_in_at: profile.last_sign_in_at,
            questionnaire_completed: profile.questionnaire_completed || false,
            questionnaire_completed_at: profile.questionnaire_completed_at,
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
            user_id: userData.user.id,
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

  const confirmDeleteUser = (userToDelete: UserWithRoles) => {
    setUserToDelete(userToDelete);
    setDeleteDialogOpen(true);
  };

  const handleResendInvitation = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('resend-invitation-email', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Приглашение отправлено повторно",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (user: UserWithRoles) => {
    if (user.last_sign_in_at) {
      return (
        <Badge variant="default" className="bg-green-500">
          Активен
        </Badge>
      );
    }
    if (user.invitation_sent_at) {
      return (
        <Badge variant="secondary">
          Письмо отправлено
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Ожидает приглашения
      </Badge>
    );
  };

  const getQuestionnaireBadge = (user: UserWithRoles) => {
    if (user.questionnaire_completed) {
      return (
        <Badge variant="default" className="bg-green-500">
          ✅ Завершена
        </Badge>
      );
    }
    // Check if user has any responses (in progress)
    if (user.accessCount > 0) {
      return (
        <Badge variant="secondary">
          ⏳ В процессе
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        ❌ Не начата
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const template = `email,full_name,processes
example1@company.com,Иван Иванов,"1.1,1.2"
example2@company.com,Петр Петров,"1.1,1.3,1.4"`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_users.csv';
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Файл пуст или содержит только заголовки",
        });
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        return row;
      });

      // Validate data
      const valid: any[] = [];
      const errors: any[] = [];
      const validProcessIds = new Set(processes.map(p => p.f1_index));

      // Get existing emails
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('email');
      const existingEmails = new Set(existingProfiles?.map(p => p.email.toLowerCase()) || []);

      const duplicates: any[] = [];

      for (const row of data) {
        const email = row.email?.toLowerCase().trim();
        let hasError = false;
        let errorMsg = '';

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errorMsg = 'Неверный формат email';
          hasError = true;
        } else if (existingEmails.has(email)) {
          duplicates.push({ ...row, reason: 'Email уже существует' });
          continue;
        }

        // Validate processes
        const processesStr = row.processes?.replace(/"/g, '').trim();
        const processArr = processesStr ? processesStr.split(',').map((p: string) => p.trim()) : [];
        
        if (processArr.length === 0) {
          errorMsg = 'Не указаны процессы';
          hasError = true;
        } else {
          const invalidProcesses = processArr.filter((p: string) => !validProcessIds.has(p));
          if (invalidProcesses.length > 0) {
            errorMsg = `Неверные процессы: ${invalidProcesses.join(', ')}`;
            hasError = true;
          }
        }

        if (hasError) {
          errors.push({ ...row, error: errorMsg });
        } else {
          valid.push({
            email,
            full_name: row.full_name || email,
            processes: processArr,
          });
        }
      }

      setCsvData(data);
      setValidationResults({ valid, duplicates, errors });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка чтения файла",
        description: error.message,
      });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleBulkImport = async () => {
    if (validationResults.valid.length === 0) {
      toast({
        variant: "destructive",
        title: "Нет данных",
        description: "Нет валидных записей для импорта",
      });
      return;
    }

    setBulkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-create-users', {
        body: {
          users: validationResults.valid,
          send_invitations: true,
        },
      });

      if (error) throw error;

      setBulkResults(data);
      
      toast({
        title: "Импорт завершен",
        description: `Создано пользователей: ${data.summary.created}, Ошибок: ${data.summary.errors}`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка импорта",
        description: error.message,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadResults = () => {
    if (!bulkResults) return;

    const lines = ['email,password,status,full_name'];
    
    bulkResults.results.created.forEach((r: any) => {
      lines.push(`${r.email},${r.password},created,"${r.full_name || ''}"`);
    });
    
    bulkResults.results.duplicates.forEach((r: any) => {
      lines.push(`${r.email},,duplicate,""`);
    });
    
    bulkResults.results.errors.forEach((r: any) => {
      lines.push(`${r.email},,error,"${r.error}"`);
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'import_results.csv';
    link.click();
  };

  const resetBulkUpload = () => {
    setCsvData([]);
    setValidationResults({ valid: [], duplicates: [], errors: [] });
    setBulkResults(null);
    setBulkUploadOpen(false);
  };

  // Функции для массовых действий
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const getSelectedUsers = () => {
    return users.filter(u => selectedUsers.has(u.id));
  };

  const handleBulkResendInvitations = async () => {
    setBulkResendDialogOpen(false);
    setBulkActionLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `https://bpnzpiileyneehtihivc.supabase.co/functions/v1/bulk-resend-invitations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_ids: Array.from(selectedUsers)
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to resend invitations');
      }

      setBulkActionResults(result);
      clearSelection();
      await loadUsers();

      toast({
        title: "Рассылка завершена",
        description: `Отправлено: ${result.summary.sent}, Ошибок: ${result.summary.failed}`,
      });
    } catch (error: any) {
      console.error('Error in bulk resend:', error);
      toast({
        variant: "destructive",
        title: "Ошибка массовой рассылки",
        description: error.message,
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteDialogOpen(false);
    setBulkActionLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `https://bpnzpiileyneehtihivc.supabase.co/functions/v1/bulk-delete-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_ids: Array.from(selectedUsers)
          })
        }
      );

      const result = await response.json();

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      setBulkActionResults(result);
      clearSelection();
      await loadUsers();

      toast({
        title: "Удаление завершено",
        description: `Удалено: ${result.summary.deleted}, Заблокировано: ${result.summary.blocked || 0}, Ошибок: ${result.summary.failed}`,
      });
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      toast({
        variant: "destructive",
        title: "Ошибка массового удаления",
        description: error.message,
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Редактирование доступных процессов
  const handleEditProcesses = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedProcesses(user.accessProcesses);
    setShowEditProcessesDialog(true);
  };

  const handleUpdateAccess = async () => {
    if (!editingUser) return;
    
    setIsUpdatingAccess(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('update-user-access', {
        body: { 
          user_id: editingUser.id,
          f1_indices: selectedProcesses
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Успешно",
        description: "Доступ к процессам обновлен",
      });

      setShowEditProcessesDialog(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user access:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить доступ",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  // Сброс пароля
  const handleResetPassword = (user: UserWithRoles) => {
    setResetPasswordUser(user);
    setGeneratedPassword('');
    setShowResetPasswordDialog(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    setIsResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('reset-user-password', {
        body: { user_id: resetPasswordUser.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      setGeneratedPassword(response.data.temporary_password);

      toast({
        title: "Успешно",
        description: "Пароль успешно сброшен",
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сбросить пароль",
        variant: "destructive",
      });
      setShowResetPasswordDialog(false);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: "Скопировано",
      description: "Пароль скопирован в буфер обмена",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление пользователями</h2>
        <div className="flex gap-2">
          <Dialog open={bulkUploadOpen} onOpenChange={(open) => {
            if (!open) resetBulkUpload();
            setBulkUploadOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Массовая загрузка
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Массовая загрузка пользователей</DialogTitle>
                <DialogDescription>
                  Загрузите CSV файл с пользователями (роль user назначается автоматически)
                </DialogDescription>
              </DialogHeader>
              
              {!bulkResults ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <Label htmlFor="csv-file" className="cursor-pointer">
                        <div className="text-sm text-muted-foreground mb-2">
                          Перетащите CSV файл или нажмите для выбора
                        </div>
                        <Button type="button" variant="secondary">
                          Выберите файл
                        </Button>
                      </Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={bulkLoading}
                      />
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-sm font-medium mb-2">ℹ️ Формат CSV:</div>
                    <code className="text-xs">email,full_name,processes</code>
                    <div className="text-xs text-muted-foreground mt-2">
                      Процессы указываются через запятую в кавычках: "1.1,1.2,1.3"
                    </div>
                  </div>

                  {validationResults.valid.length > 0 || validationResults.duplicates.length > 0 || validationResults.errors.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-green-900">✅ Валидные</div>
                          <div className="text-2xl font-bold text-green-700">{validationResults.valid.length}</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-yellow-900">⚠️ Дубликаты</div>
                          <div className="text-2xl font-bold text-yellow-700">{validationResults.duplicates.length}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-red-900">❌ Ошибки</div>
                          <div className="text-2xl font-bold text-red-700">{validationResults.errors.length}</div>
                        </div>
                      </div>

                      {validationResults.duplicates.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Дубликаты (будут пропущены):</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {validationResults.duplicates.map((dup, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground">
                                {dup.email} - {dup.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {validationResults.errors.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Ошибки валидации:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {validationResults.errors.map((err, idx) => (
                              <div key={idx} className="text-sm text-destructive">
                                {err.email} - {err.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={handleBulkImport}
                          disabled={bulkLoading || validationResults.valid.length === 0}
                          className="flex-1"
                        >
                          {bulkLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Импорт... ({validationResults.valid.length})
                            </>
                          ) : (
                            <>Импортировать {validationResults.valid.length} пользователей</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={downloadTemplate} variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Скачать шаблон CSV
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-900">✅ Создано</div>
                      <div className="text-2xl font-bold text-green-700">{bulkResults.summary.created}</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-yellow-900">⚠️ Пропущено</div>
                      <div className="text-2xl font-bold text-yellow-700">{bulkResults.summary.duplicates}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-900">❌ Ошибки</div>
                      <div className="text-2xl font-bold text-red-700">{bulkResults.summary.errors}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={downloadResults} variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Скачать отчет с паролями
                    </Button>
                    <Button onClick={resetBulkUpload} className="flex-1">
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
      </div>

      {/* Панель массовых действий */}
      {selectedUsers.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              Выбрано: {selectedUsers.size} {selectedUsers.size === 1 ? 'пользователь' : 'пользователей'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkResendDialogOpen(true)}
              disabled={bulkActionLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Отправить приглашения
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={bulkActionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={bulkActionLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedUsers.size === users.length && users.length > 0}
                onCheckedChange={toggleAllUsers}
                disabled={loadingUsers || users.length === 0}
              />
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Роли</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Статус анкеты</TableHead>
            <TableHead>Доступные процессы</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead>Последняя авторизация</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingUsers ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Загрузка пользователей...</p>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                Пользователи не найдены
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow 
                key={user.id}
                className={selectedUsers.has(user.id) ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                </TableCell>
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
                <TableCell>{getStatusBadge(user)}</TableCell>
                <TableCell>{getQuestionnaireBadge(user)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {user.accessProcesses.length > 0 
                      ? user.accessProcesses.join(', ') 
                      : '-'}
                  </div>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell>
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'
                  }
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditProcesses(user)}
                      disabled={loading}
                      title="Редактировать процессы"
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetPassword(user)}
                      disabled={loading}
                      title="Сбросить пароль"
                    >
                      <Key className="h-4 w-4 text-orange-500" />
                    </Button>
                    {!user.last_sign_in_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResendInvitation(user.id)}
                        disabled={loading}
                        title="Отправить приглашение повторно"
                      >
                        <Mail className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDeleteUser(user)}
                      disabled={loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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

      {/* Диалог подтверждения массового удаления */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Подтверждение массового удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить {selectedUsers.size} {selectedUsers.size === 1 ? 'пользователя' : 'пользователей'}:
              <div className="mt-4 max-h-40 overflow-y-auto space-y-1">
                {getSelectedUsers().slice(0, 10).map(user => (
                  <div key={user.id} className="text-sm">
                    • {user.email} {user.roles.includes('admin') && '(Администратор)'}
                  </div>
                ))}
                {selectedUsers.size > 10 && (
                  <div className="text-sm text-muted-foreground">
                    ... и еще {selectedUsers.size - 10}
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                <p className="text-sm font-medium text-destructive">
                  Это действие необратимо!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Будут удалены профили, роли, доступы и все ответы пользователей.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkActionLoading ? (
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

      {/* Диалог подтверждения массовой рассылки */}
      <AlertDialog open={bulkResendDialogOpen} onOpenChange={setBulkResendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>📧 Подтверждение массовой рассылки</AlertDialogTitle>
            <AlertDialogDescription>
              Отправить приглашения {selectedUsers.size} {selectedUsers.size === 1 ? 'пользователю' : 'пользователям'}?
              <div className="mt-4 max-h-40 overflow-y-auto space-y-1">
                {getSelectedUsers().slice(0, 10).map(user => (
                  <div key={user.id} className="text-sm">
                    • {user.email} 
                    {user.last_sign_in_at ? ' (Повторная отправка)' : ' (Письмо не отправлялось)'}
                  </div>
                ))}
                {selectedUsers.size > 10 && (
                  <div className="text-sm text-muted-foreground">
                    ... и еще {selectedUsers.size - 10}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkResendInvitations}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                'Отправить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог результатов массовых действий */}
      {bulkActionResults && (
        <AlertDialog open={!!bulkActionResults} onOpenChange={() => setBulkActionResults(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkActionResults.results.deleted !== undefined ? 'Результаты массового удаления' : 'Результаты массовой рассылки'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {bulkActionResults.results.deleted !== undefined ? (
                      <>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-green-900">✅ Удалено</div>
                          <div className="text-2xl font-bold text-green-700">{bulkActionResults.summary.deleted}</div>
                        </div>
                        {bulkActionResults.summary.blocked > 0 && (
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-yellow-900">⚠️ Заблокировано</div>
                            <div className="text-2xl font-bold text-yellow-700">{bulkActionResults.summary.blocked}</div>
                          </div>
                        )}
                        {bulkActionResults.summary.failed > 0 && (
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-red-900">❌ Ошибок</div>
                            <div className="text-2xl font-bold text-red-700">{bulkActionResults.summary.failed}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-green-900">✅ Отправлено</div>
                          <div className="text-2xl font-bold text-green-700">{bulkActionResults.summary.sent}</div>
                        </div>
                        {bulkActionResults.summary.failed > 0 && (
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-red-900">❌ Ошибок</div>
                            <div className="text-2xl font-bold text-red-700">{bulkActionResults.summary.failed}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {bulkActionResults.results.failed && bulkActionResults.results.failed.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2 text-sm">Детали ошибок:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {bulkActionResults.results.failed.map((err: any, idx: number) => (
                          <div key={idx} className="text-xs text-destructive">
                            • {err.user_id}: {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setBulkActionResults(null)}>
                Закрыть
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Диалог редактирования процессов */}
      <Dialog open={showEditProcessesDialog} onOpenChange={setShowEditProcessesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование доступа к процессам</DialogTitle>
            <DialogDescription>
              Пользователь: <strong>{editingUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Выберите доступные процессы</Label>
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-2">
              {processes.map((process) => (
                <div key={process.f1_index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`process-${process.f1_index}`}
                    checked={selectedProcesses.includes(process.f1_index)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProcesses([...selectedProcesses, process.f1_index]);
                      } else {
                        setSelectedProcesses(selectedProcesses.filter(p => p !== process.f1_index));
                      }
                    }}
                  />
                  <label
                    htmlFor={`process-${process.f1_index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {process.f1_index} - {process.f1_name}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditProcessesDialog(false)}
                disabled={isUpdatingAccess}
              >
                Отмена
              </Button>
              <Button
                onClick={handleUpdateAccess}
                disabled={isUpdatingAccess}
              >
                {isUpdatingAccess ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог сброса пароля */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сброс пароля</AlertDialogTitle>
            <AlertDialogDescription>
              {generatedPassword ? (
                <div className="space-y-4">
                  <p>Пароль успешно сброшен для пользователя: <strong>{resetPasswordUser?.email}</strong></p>
                  <div className="border rounded-md p-4 bg-muted">
                    <Label className="text-sm mb-2 block">Временный пароль:</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-3 py-2 rounded border font-mono text-sm">
                        {generatedPassword}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyPassword}
                        title="Скопировать"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Обязательно сохраните этот пароль и передайте его пользователю. 
                    После закрытия этого окна пароль будет недоступен.
                  </p>
                </div>
              ) : (
                <div>
                  Вы уверены, что хотите сбросить пароль для пользователя <strong>{resetPasswordUser?.email}</strong>?
                  <br /><br />
                  Будет создан временный пароль, который нужно будет передать пользователю.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {generatedPassword ? (
              <AlertDialogAction onClick={() => {
                setShowResetPasswordDialog(false);
                setGeneratedPassword('');
              }}>
                Закрыть
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={isResettingPassword}>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сброс...
                    </>
                  ) : (
                    'Сбросить пароль'
                  )}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
