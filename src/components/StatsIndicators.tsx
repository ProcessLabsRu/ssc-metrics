import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ListChecks, CheckCircle2 } from 'lucide-react';
import { HoursGauge } from './HoursGauge';

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
      (r) => r.labor_hours !== null && r.labor_hours > 0
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
      <Card className="px-3 py-3 flex-1 h-[140px]">
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <div className="text-xs text-muted-foreground">Доступно</div>
          <div className="text-2xl font-bold">{stats.totalAvailable}</div>
        </div>
      </Card>

      <Card className="px-3 py-3 flex-1 h-[140px]">
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <div className="text-xs text-muted-foreground">Заполнено</div>
          <div className="text-2xl font-bold">{stats.filled}</div>
        </div>
      </Card>

      <HoursGauge hours={stats.totalHours} />
    </div>
  );
};
