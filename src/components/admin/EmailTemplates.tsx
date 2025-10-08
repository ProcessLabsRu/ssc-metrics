import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmailTemplate {
  id: string;
  subject: string;
  html_template: string;
}

export const EmailTemplates = () => {
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setTemplate(data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: template.subject,
          html_template: template.html_template,
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: 'Шаблон сохранен',
        description: 'Изменения успешно применены',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка сохранения',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreviewHtml = () => {
    if (!template) return '';
    
    return template.html_template
      .replace(/\{\{full_name\}\}/g, 'Иван Иванов')
      .replace(/\{\{email\}\}/g, 'example@email.com')
      .replace(/\{\{password\}\}/g, 'TempPass123')
      .replace(/\{\{login_url\}\}/g, window.location.origin + '/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Шаблон не найден</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Шаблон письма-приглашения</CardTitle>
        <CardDescription>
          Используйте переменные: {'{{full_name}}'}, {'{{email}}'}, {'{{password}}'}, {'{{login_url}}'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Тема письма</Label>
          <Input
            id="subject"
            value={template.subject}
            onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
            placeholder="Введите тему письма"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="html_template">HTML-шаблон</Label>
          <Textarea
            id="html_template"
            value={template.html_template}
            onChange={(e) => setTemplate({ ...template, html_template: e.target.value })}
            placeholder="Введите HTML-код письма"
            className="font-mono text-sm min-h-[400px]"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить шаблон
              </>
            )}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Предпросмотр
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Предпросмотр письма</DialogTitle>
                <DialogDescription>
                  Так будет выглядеть письмо с тестовыми данными
                </DialogDescription>
              </DialogHeader>
              <div 
                className="border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};
