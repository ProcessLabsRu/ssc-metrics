import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface SmtpSettingsData {
  id?: string;
  host: string;
  port: number;
  username: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
}

export const SmtpSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState<SmtpSettingsData>({
    host: '',
    port: 587,
    username: '',
    from_email: '',
    from_name: '',
    use_tls: true,
    is_active: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error: any) {
      console.error('Error loading SMTP settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { id, ...dataToSave } = formData;

      if (id) {
        const { error } = await supabase
          .from('smtp_settings')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('smtp_settings')
          .insert([dataToSave]);

        if (error) throw error;
      }

      toast({
        title: 'Настройки сохранены',
        description: 'SMTP настройки успешно обновлены',
      });

      await loadSettings();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка сохранения',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: { 
          host: formData.host,
          port: formData.port,
          username: formData.username,
          from_email: formData.from_email,
          use_tls: formData.use_tls,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Соединение успешно',
          description: 'SMTP настройки работают корректно',
        });
      } else {
        throw new Error(data?.error || 'Ошибка подключения');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка подключения',
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Настройки SMTP
        </CardTitle>
        <CardDescription>
          Настройте SMTP сервер для автоматической отправки приглашений новым пользователям
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Сервер</Label>
            <Input
              id="host"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Порт</Label>
            <Input
              id="port"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
              placeholder="587"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Имя пользователя</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="your-email@gmail.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from_email">Email отправителя</Label>
            <Input
              id="from_email"
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              placeholder="noreply@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_name">Имя отправителя</Label>
            <Input
              id="from_name"
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              placeholder="Система"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="use_tls">Использовать TLS</Label>
            <p className="text-sm text-muted-foreground">
              Включить шифрование соединения
            </p>
          </div>
          <Switch
            id="use_tls"
            checked={formData.use_tls}
            onCheckedChange={(checked) => setFormData({ ...formData, use_tls: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="is_active" className="flex items-center gap-2">
              Активировать настройки
              {formData.is_active && <CheckCircle className="h-4 w-4 text-green-500" />}
            </Label>
            <p className="text-sm text-muted-foreground">
              Автоматически отправлять приглашения новым пользователям
            </p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleTest} disabled={testing || loading} variant="outline">
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Тестировать подключение
          </Button>
          <Button onClick={handleSave} disabled={loading || testing}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить настройки
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Важно:</strong> Пароль SMTP хранится в защищенном хранилище Supabase Secrets 
            (переменная SMTP_PASSWORD). Настройте его в панели Supabase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
