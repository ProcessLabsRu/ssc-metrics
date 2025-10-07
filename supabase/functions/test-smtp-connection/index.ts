const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  host: string;
  port: number;
  username: string;
  from_email: string;
  use_tls: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { host, port, username, from_email, use_tls }: TestRequest = await req.json();

    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      throw new Error('SMTP_PASSWORD не настроен в Secrets');
    }

    console.log('Testing SMTP connection to:', host, port);

    // Test connection
    const conn = await Deno.connect({
      hostname: host,
      port: port,
    });

    if (use_tls) {
      const tlsConn = await Deno.startTls(conn, { hostname: host });
      
      const encoder = new TextEncoder();
      const buffer = new Uint8Array(1024);
      
      // Read greeting
      await tlsConn.read(buffer);
      
      // EHLO
      await tlsConn.write(encoder.encode(`EHLO ${host}\r\n`));
      await tlsConn.read(buffer);
      
      // AUTH LOGIN
      await tlsConn.write(encoder.encode('AUTH LOGIN\r\n'));
      await tlsConn.read(buffer);
      
      // Username
      const base64Username = btoa(username);
      await tlsConn.write(encoder.encode(`${base64Username}\r\n`));
      await tlsConn.read(buffer);
      
      // Password
      const base64Password = btoa(smtpPassword);
      await tlsConn.write(encoder.encode(`${base64Password}\r\n`));
      await tlsConn.read(buffer);
      
      const decoder = new TextDecoder();
      const responseText = decoder.decode(buffer);
      
      // QUIT
      await tlsConn.write(encoder.encode('QUIT\r\n'));
      tlsConn.close();
      
      // Check if authentication was successful
      if (responseText.startsWith('235')) {
        console.log('SMTP connection test successful');
        return new Response(
          JSON.stringify({ success: true, message: 'Подключение успешно' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      } else {
        throw new Error('Ошибка аутентификации SMTP');
      }
    } else {
      conn.close();
      return new Response(
        JSON.stringify({ success: true, message: 'Базовое подключение успешно' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error('SMTP connection test failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
