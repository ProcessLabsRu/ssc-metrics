import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImpersonateRequest {
  user_id: string;
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

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !adminUser) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('Admin user:', adminUser.email);

    // Check if calling user is admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error('Role check error:', roleError);
      throw new Error('Unauthorized: Admin access required');
    }

    const { user_id }: ImpersonateRequest = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Cannot impersonate yourself
    if (user_id === adminUser.id) {
      throw new Error('Cannot impersonate yourself');
    }

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (targetError || !targetUser.user) {
      console.error('Target user error:', targetError);
      throw new Error('Target user not found');
    }

    console.log('Target user:', targetUser.user.email);

    // Check if target user is admin (cannot impersonate other admins)
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .eq('role', 'admin')
      .maybeSingle();

    if (targetRole) {
      throw new Error('Cannot impersonate another administrator');
    }

    // Log the impersonation attempt
    const { error: logError } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUser.id,
        target_user_id: user_id,
        action: 'impersonate',
        metadata: {
          admin_email: adminUser.email,
          target_email: targetUser.user.email,
          timestamp: new Date().toISOString(),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        }
      });

    if (logError) {
      console.error('Failed to log impersonation:', logError);
      // Don't fail the request if logging fails, but log the error
    }

    // Generate a new session for the target user using magic link
    const targetEmail = targetUser.user.email;
    if (!targetEmail) {
      throw new Error('Target user email not found');
    }
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
    });

    if (sessionError || !sessionData) {
      console.error('Session generation error:', sessionError);
      throw new Error('Failed to generate session for target user');
    }

    // Extract tokens from the magic link URL
    const actionLink = sessionData.properties.action_link;
    const accessToken = actionLink.split('access_token=')[1]?.split('&')[0];
    const refreshToken = actionLink.split('refresh_token=')[1]?.split('&')[0];

    if (!accessToken || !refreshToken) {
      throw new Error('Failed to extract tokens from magic link');
    }

    console.log('Impersonation successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully impersonating ${targetUser.user.email}`,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        target_user: {
          id: targetUser.user.id,
          email: targetUser.user.email,
        },
        admin_user: {
          id: adminUser.id,
          email: adminUser.email,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
