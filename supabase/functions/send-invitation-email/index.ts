import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  password: string;
  full_name: string;
  user_id?: string;
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

    const { email, password, full_name, user_id }: InvitationRequest = await req.json();

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

    // Загружаем шаблон письма из БД
    const { data: templateData, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('subject, html_template')
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.error('Error loading email template:', templateError);
      throw new Error('Failed to load email template');
    }

    if (!templateData) {
      throw new Error('Email template not found');
    }

    // Заменяем переменные в шаблоне
    const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://bpnzpiileyneehtihivc.supabase.co', 'https://id-preview--ec885cf1-8926-457e-a564-71a22dfaa5a2.lovable.app')}/auth`;
    const emailBody = templateData.html_template
      .replace(/\{\{full_name\}\}/g, full_name)
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{password\}\}/g, password)
      .replace(/\{\{login_url\}\}/g, loginUrl);

    const emailSubject = templateData.subject;

    // Use nodemailer-compatible approach with Deno
    const emailData = {
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: email,
      subject: emailSubject,
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

    // Update invitation_sent_at in profiles
    if (user_id) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq('id', user_id);

      if (updateError) {
        console.error('Error updating invitation_sent_at:', updateError);
      }
    }

    // Log email sending
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert([{
        user_id: user_id || null,
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
