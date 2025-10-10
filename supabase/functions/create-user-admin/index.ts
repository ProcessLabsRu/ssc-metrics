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
  organization_id: string;
  department_id?: string;
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

    const { email, password, full_name, role, processes, organization_id, department_id }: CreateUserRequest = await req.json();

    console.log('Creating user:', { email, full_name, role, processes, organization_id, department_id });

    // Validate required fields
    if (!organization_id) {
      throw new Error('Organization is required');
    }

    // Validate organization exists
    const { data: orgExists, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgError || !orgExists) {
      throw new Error('Invalid organization');
    }

    // Validate department if provided
    if (department_id) {
      const { data: deptExists, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id, organization_id')
        .eq('id', department_id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (deptError || !deptExists) {
        throw new Error('Invalid department or department does not belong to organization');
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      throw new Error('A user with this email already exists');
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name,
        organization_id,
        department_id 
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      if (createError.message?.includes('already been registered')) {
        throw new Error('A user with this email already exists');
      }
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('User creation failed');
    }

    console.log('User created successfully:', newUser.user.id);

    // Wait for handle_new_user trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 200));

    // Update profile with organization and department
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id,
        department_id: department_id || null,
      })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      // Don't throw, just log - user is already created
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
