-- Создаем таблицу для хранения шаблона письма
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Только админы могут управлять шаблонами
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION update_email_templates_updated_at();

-- Вставляем дефолтный шаблон (из текущего кода)
INSERT INTO public.email_templates (subject, html_template)
VALUES (
  'Приглашение в систему',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Добро пожаловать!</h1>
    </div>
    <div class="content">
      <p>Здравствуйте, <strong>{{full_name}}</strong>!</p>
      <p>Для вас создан аккаунт в системе. Используйте следующие данные для входа:</p>
      
      <div class="credentials">
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Временный пароль:</strong> {{password}}</p>
      </div>
      
      <p>Для входа в систему перейдите по ссылке:</p>
      <a href="{{login_url}}" class="button">Войти в систему</a>
      
      <p style="color: #666; font-size: 14px;">
        Или скопируйте ссылку в браузер: {{login_url}}
      </p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        <strong>Важно:</strong> Рекомендуем изменить пароль после первого входа в систему.
      </p>
    </div>
    <div class="footer">
      <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
    </div>
  </div>
</body>
</html>'
);