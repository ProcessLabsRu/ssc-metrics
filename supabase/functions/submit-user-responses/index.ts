import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Submit responses for user: ${user.id}`);

    // Check total labor_hours for this user
    const { data: responses, error: fetchError } = await supabase
      .from('user_responses')
      .select('labor_hours')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    // Calculate total labor_hours
    const totalHours = responses?.reduce((sum, r) => sum + (r.labor_hours || 0), 0) || 0;
    
    console.log(`Total labor hours: ${totalHours}`);

    if (totalHours === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Невозможно отправить данные. Сумма трудоемкости должна быть больше 0.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const now = new Date().toISOString();

    // Update all user_responses to mark as submitted
    const { error: updateResponsesError } = await supabase
      .from('user_responses')
      .update({ 
        is_submitted: true, 
        submitted_at: now 
      })
      .eq('user_id', user.id)
      .is('is_submitted', false);

    if (updateResponsesError) throw updateResponsesError;

    // Update profile to mark questionnaire as completed
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ 
        questionnaire_completed: true, 
        questionnaire_completed_at: now 
      })
      .eq('id', user.id);

    if (updateProfileError) throw updateProfileError;

    console.log(`Successfully submitted responses for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Данные успешно отправлены и заблокированы',
        submitted_at: now
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error submitting responses:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
