import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateUserAccessRequest {
  user_id: string;
  f1_indices: string[];
}

Deno.serve(async (req) => {
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
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // Проверяем, что пользователь является администратором
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !userRoles) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { user_id, f1_indices }: UpdateUserAccessRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!Array.isArray(f1_indices)) {
      return new Response(
        JSON.stringify({ error: 'f1_indices must be an array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Updating access for user ${user_id} with processes:`, f1_indices);

    // Удаляем все существующие записи доступа
    const { error: deleteError } = await supabaseAdmin
      .from('user_access')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting user access:', deleteError);
      throw deleteError;
    }

    // Вставляем новые записи доступа
    if (f1_indices.length > 0) {
      const accessRecords = f1_indices.map(f1_index => ({
        user_id,
        f1_index
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_access')
        .insert(accessRecords);

      if (insertError) {
        console.error('Error inserting user access:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully updated access for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User access updated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-user-access function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
