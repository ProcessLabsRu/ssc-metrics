import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkResendRequest {
  user_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Проверка, что вызывающий - администратор
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!callerRole) {
      throw new Error('Only administrators can resend invitations');
    }

    const { user_ids }: BulkResendRequest = await req.json();

    if (!user_ids || user_ids.length === 0) {
      throw new Error('No user IDs provided');
    }

    console.log(`Bulk resend invitations request for ${user_ids.length} users`);

    // Получить информацию о пользователях
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', user_ids);

    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      throw new Error('No users found');
    }

    // Получить настройки SMTP
    const { data: smtpSettings, error: smtpError } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      throw new Error('SMTP settings not configured');
    }

    // Получить шаблон письма
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .maybeSingle();

    if (templateError || !template) {
      throw new Error('Email template not configured');
    }

    const sent: string[] = [];
    const failed: Array<{ user_id: string; error: string }> = [];

    // Отправка приглашений
    for (const profile of profiles) {
      try {
        // Вызов функции отправки письма
        const { error: sendError } = await supabaseAdmin.functions.invoke('resend-invitation-email', {
          body: {
            user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name
          }
        });

        if (sendError) {
          throw sendError;
        }

        // Обновить дату отправки приглашения
        await supabaseAdmin
          .from('profiles')
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq('id', profile.id);

        sent.push(profile.id);
        console.log(`Successfully sent invitation to: ${profile.email}`);
      } catch (error: any) {
        console.error(`Failed to send invitation to ${profile.email}:`, error);
        failed.push({
          user_id: profile.id,
          error: error.message || 'Unknown error'
        });
      }
    }

    const response = {
      success: true,
      results: {
        sent,
        failed
      },
      summary: {
        total: user_ids.length,
        sent: sent.length,
        failed: failed.length
      }
    };

    console.log('Bulk resend completed:', response.summary);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in bulk-resend-invitations:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
