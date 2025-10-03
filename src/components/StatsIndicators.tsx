import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ListChecks, CheckCircle2, Clock } from 'lucide-react';

export const StatsIndicators = () => {
  const [stats, setStats] = useState({
    totalAvailable: 0,
    filled: 0,
    totalHours: 0,
  });

  useEffect(() => {
    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('stats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_responses',
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_responses')
      .select('f4_index, system_id, notes, labor_hours')
      .eq('user_id', user.id);

    if (!data) return;

    const totalAvailable = data.length;
    const filled = data.filter(
      (r) => r.system_id !== null || r.notes !== null || (r.labor_hours !== null && r.labor_hours > 0)
    ).length;
    const totalHours = data.reduce((sum, r) => sum + (r.labor_hours || 0), 0);

    setStats({
      totalAvailable,
      filled,
      totalHours,
    });
  };

  return (
    <div className="flex gap-4">
      <Card className="px-4 py-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-blue-500" />
          <div>
            <div className="text-xs text-muted-foreground">Доступно</div>
            <div className="text-lg font-bold">{stats.totalAvailable}</div>
          </div>
        </div>
      </Card>

      <Card className="px-4 py-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <div className="text-xs text-muted-foreground">Заполнено</div>
            <div className="text-lg font-bold">{stats.filled}</div>
          </div>
        </div>
      </Card>

      <Card className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <div>
            <div className="text-xs text-muted-foreground">Человеко-часов</div>
            <div className="text-lg font-bold">{stats.totalHours.toFixed(2)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
