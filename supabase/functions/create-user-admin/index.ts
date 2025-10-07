import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'user';
  processes: string[];
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
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      throw new Error('Unauthorized');
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { email, password, full_name, role, processes }: CreateUserRequest = await req.json();

    console.log('Creating user:', { email, full_name, role, processes });

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('User creation failed');
    }

    console.log('User created successfully:', newUser.user.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        full_name
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    // Insert user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role
      });

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError);
      throw roleInsertError;
    }

    // Insert user access for each process
    if (processes.length > 0) {
      const accessRecords = processes.map(f1_index => ({
        user_id: newUser.user.id,
        f1_index
      }));

      const { error: accessError } = await supabaseAdmin
        .from('user_access')
        .insert(accessRecords);

      if (accessError) {
        console.error('Error inserting access:', accessError);
        throw accessError;
      }
    }

    console.log('User setup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-user-admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
