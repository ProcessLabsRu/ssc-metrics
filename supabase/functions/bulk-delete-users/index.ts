import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkDeleteRequest {
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
      throw new Error('Only administrators can perform bulk delete');
    }

    const { user_ids }: BulkDeleteRequest = await req.json();

    if (!user_ids || user_ids.length === 0) {
      throw new Error('No user IDs provided');
    }

    console.log(`Bulk delete request for ${user_ids.length} users`);

    // Получить всех администраторов в системе
    const { data: allAdmins, error: adminsError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError) {
      throw new Error(`Failed to fetch admins: ${adminsError.message}`);
    }

    const totalAdmins = allAdmins?.length || 0;
    const adminIds = new Set(allAdmins?.map(a => a.user_id) || []);

    // Определить, сколько админов в списке на удаление
    const adminsToDelete = user_ids.filter(id => adminIds.has(id));

    console.log(`Total admins: ${totalAdmins}, Admins to delete: ${adminsToDelete.length}`);

    // Проверка: должен остаться хотя бы 1 администратор
    if (totalAdmins - adminsToDelete.length < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Невозможно удалить всех администраторов. В системе должен остаться хотя бы один администратор.',
          results: {
            deleted: [],
            failed: [],
            blocked_admins: adminsToDelete
          },
          summary: {
            total: user_ids.length,
            deleted: 0,
            failed: 0,
            blocked: adminsToDelete.length
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Удаление пользователей
    const deleted: string[] = [];
    const failed: Array<{ user_id: string; error: string }> = [];

    for (const userId of user_ids) {
      try {
        // Удаляем пользователя через Admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (deleteError) {
          throw deleteError;
        }

        deleted.push(userId);
        console.log(`Successfully deleted user: ${userId}`);
      } catch (error: any) {
        console.error(`Failed to delete user ${userId}:`, error);
        failed.push({
          user_id: userId,
          error: error.message || 'Unknown error'
        });
      }
    }

    const response = {
      success: true,
      results: {
        deleted,
        failed,
        blocked_admins: []
      },
      summary: {
        total: user_ids.length,
        deleted: deleted.length,
        failed: failed.length,
        blocked: 0
      }
    };

    console.log('Bulk delete completed:', response.summary);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in bulk-delete-users:', error);
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
