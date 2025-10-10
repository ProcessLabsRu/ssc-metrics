import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkUser {
  email: string;
  full_name?: string;
  processes: string[];
  organization_id: string;
  department_id?: string;
}

interface BulkCreateRequest {
  users: BulkUser[];
  send_invitations: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only admins can bulk create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { users, send_invitations }: BulkCreateRequest = await req.json();

    // Get all existing emails
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('email');
    
    const existingEmails = new Set(existingProfiles?.map(p => p.email.toLowerCase()) || []);

    // Get all valid processes
    const { data: validProcesses } = await supabaseClient
      .from('process_1')
      .select('f1_index')
      .eq('is_active', true);
    
    const validProcessIds = new Set(validProcesses?.map(p => p.f1_index) || []);

    const results = {
      created: [] as Array<{ email: string; user_id: string; password: string }>,
      duplicates: [] as Array<{ email: string; reason: string }>,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Process each user
    for (const userData of users) {
      try {
        // Validate email
        const email = userData.email.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push({ email: userData.email, error: 'Invalid email format' });
          continue;
        }

        // Check for duplicates
        if (existingEmails.has(email)) {
          results.duplicates.push({ email, reason: 'Email already exists' });
          continue;
        }

        // Validate organization
        if (!userData.organization_id) {
          results.errors.push({ email, error: 'Organization is required' });
          continue;
        }

        const { data: orgExists } = await supabaseClient
          .from('organizations')
          .select('id')
          .eq('id', userData.organization_id)
          .maybeSingle();

        if (!orgExists) {
          results.errors.push({ email, error: 'Invalid organization' });
          continue;
        }

        // Validate department if provided
        if (userData.department_id) {
          const { data: deptExists } = await supabaseClient
            .from('departments')
            .select('id, organization_id')
            .eq('id', userData.department_id)
            .eq('organization_id', userData.organization_id)
            .maybeSingle();

          if (!deptExists) {
            results.errors.push({ 
              email, 
              error: 'Invalid department or department does not belong to organization' 
            });
            continue;
          }
        }

        // Validate processes
        if (!userData.processes || userData.processes.length === 0) {
          results.errors.push({ email, error: 'No processes specified' });
          continue;
        }

        const invalidProcesses = userData.processes.filter(p => !validProcessIds.has(p));
        if (invalidProcesses.length > 0) {
          results.errors.push({ 
            email, 
            error: `Invalid processes: ${invalidProcesses.join(', ')}` 
          });
          continue;
        }

        // Generate password
        const password = generatePassword();

        // Create user
        const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name || email,
          },
        });

        if (createError) {
          results.errors.push({ email, error: createError.message });
          continue;
        }

        if (!authData.user) {
          results.errors.push({ email, error: 'User creation failed' });
          continue;
        }

      // Create profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: userData.full_name || email,
          organization_id: userData.organization_id,
          department_id: userData.department_id || null,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Try to delete the auth user if profile creation failed
          await supabaseClient.auth.admin.deleteUser(authData.user.id);
          results.errors.push({ email, error: `Profile creation failed: ${profileError.message}` });
          continue;
        }

        // Add user role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'user',
          });

        if (roleError) {
          console.error('Role assignment error:', roleError);
          await supabaseClient.auth.admin.deleteUser(authData.user.id);
          results.errors.push({ email, error: `Role assignment failed: ${roleError.message}` });
          continue;
        }

        // Add process access
        const accessRecords = userData.processes.map(f1_index => ({
          user_id: authData.user.id,
          f1_index,
        }));

        const { error: accessError } = await supabaseClient
          .from('user_access')
          .insert(accessRecords);

        if (accessError) {
          console.error('Access assignment error:', accessError);
          await supabaseClient.auth.admin.deleteUser(authData.user.id);
          results.errors.push({ email, error: `Access assignment failed: ${accessError.message}` });
          continue;
        }

        results.created.push({
          email,
          user_id: authData.user.id,
          password,
        });

        // Add email to existing set to prevent duplicates in the same batch
        existingEmails.add(email);

        // Send invitation email if requested
        if (send_invitations) {
          try {
            await supabaseClient.functions.invoke('send-invitation-email', {
              body: {
                email,
                password,
                full_name: userData.full_name || email,
                user_id: authData.user.id,
              },
            });
          } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Don't fail the user creation if email fails
          }
        }
      } catch (error: any) {
        results.errors.push({ 
          email: userData.email, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    const summary = {
      total: users.length,
      created: results.created.length,
      duplicates: results.duplicates.length,
      errors: results.errors.length,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        results, 
        summary 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Bulk create error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generatePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + special;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = 4; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
