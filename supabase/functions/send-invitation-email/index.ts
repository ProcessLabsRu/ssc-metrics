import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  password: string;
  full_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, full_name }: InvitationRequest = await req.json();

    console.log('Sending invitation to:', email);

    // Get active SMTP settings
    const { data: smtpSettings, error: settingsError } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching SMTP settings:', settingsError);
      throw new Error('Не удалось получить настройки SMTP');
    }

    if (!smtpSettings) {
      throw new Error('SMTP настройки не активированы');
    }

    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      throw new Error('SMTP_PASSWORD не настроен');
    }

    // Send email using SMTP
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; background: white; }
            .credentials { background: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Добро пожаловать!</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${full_name}!</p>
              <p>Для вас был создан аккаунт в нашей системе. Используйте следующие учетные данные для входа:</p>
              
              <div class="credentials">
                <strong>Email:</strong> ${email}<br>
                <strong>Пароль:</strong> ${password}
              </div>

              <p>Пожалуйста, войдите в систему и смените пароль на более безопасный при первой возможности.</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://bpnzpiileyneehtihivc.supabase.co', 'https://id-preview--ec885cf1-8926-457e-a564-71a22dfaa5a2.lovable.app')}/auth" class="button">
                  Войти в систему
                </a>
              </p>

              <p>Если у вас возникли вопросы, свяжитесь с администратором.</p>
            </div>
            <div class="footer">
              <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use nodemailer-compatible approach with Deno
    const emailData = {
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: email,
      subject: 'Приглашение в систему',
      html: emailBody,
    };

    // Create SMTP connection
    const conn = await Deno.connect({
      hostname: smtpSettings.host,
      port: smtpSettings.port,
    });

    if (smtpSettings.use_tls) {
      const tlsConn = await Deno.startTls(conn, { hostname: smtpSettings.host });
      
      // Simple SMTP communication
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Read greeting
      const buffer = new Uint8Array(1024);
      await tlsConn.read(buffer);
      
      // EHLO
      await tlsConn.write(encoder.encode(`EHLO ${smtpSettings.host}\r\n`));
      await tlsConn.read(buffer);
      
      // AUTH LOGIN
      await tlsConn.write(encoder.encode('AUTH LOGIN\r\n'));
      await tlsConn.read(buffer);
      
      // Username
      const base64Username = btoa(smtpSettings.username);
      await tlsConn.write(encoder.encode(`${base64Username}\r\n`));
      await tlsConn.read(buffer);
      
      // Password
      const base64Password = btoa(smtpPassword);
      await tlsConn.write(encoder.encode(`${base64Password}\r\n`));
      await tlsConn.read(buffer);
      
      // MAIL FROM
      await tlsConn.write(encoder.encode(`MAIL FROM:<${smtpSettings.from_email}>\r\n`));
      await tlsConn.read(buffer);
      
      // RCPT TO
      await tlsConn.write(encoder.encode(`RCPT TO:<${email}>\r\n`));
      await tlsConn.read(buffer);
      
      // DATA
      await tlsConn.write(encoder.encode('DATA\r\n'));
      await tlsConn.read(buffer);
      
      // Email content
      const emailContent = `From: ${emailData.from}\r\nTo: ${emailData.to}\r\nSubject: ${emailData.subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailData.html}\r\n.\r\n`;
      await tlsConn.write(encoder.encode(emailContent));
      await tlsConn.read(buffer);
      
      // QUIT
      await tlsConn.write(encoder.encode('QUIT\r\n'));
      
      tlsConn.close();
    }

    // Log email sending
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert([{
        user_id: null, // We don't have user_id yet during invitation
        email_type: 'invitation',
        status: 'success',
        error_message: null,
      }]);

    if (logError) {
      console.error('Error logging email:', logError);
    }

    console.log('Invitation email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Приглашение отправлено' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-invitation-email:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
