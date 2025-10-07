import { Card } from '@/components/ui/card';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface HoursGaugeProps {
  hours: number;
}

const getHoursStatus = (hours: number) => {
  if (hours < 145) {
    return {
      status: 'Недостаточно',
      color: 'hsl(0 84% 60%)', // destructive
      level: 'low' as const,
    };
  }
  if (hours <= 175) {
    return {
      status: 'Норма',
      color: 'hsl(142 71% 45%)', // green
      level: 'normal' as const,
    };
  }
  return {
    status: 'Переработка',
    color: 'hsl(45 93% 47%)', // yellow
    level: 'high' as const,
  };
};

export const HoursGauge = ({ hours }: HoursGaugeProps) => {
  const { status, color, level } = getHoursStatus(hours);
  const percentage = (hours / 250) * 100;

  const data = [
    {
      name: 'hours',
      value: hours,
      fill: color,
    },
  ];

  return (
    <Card className="px-3 py-3 flex-1 h-[140px]">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-xs text-muted-foreground mb-1">Человеко-часов</div>
        <div className="relative w-full max-w-[80px] h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              barSize={8}
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 250]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: 'hsl(var(--muted))' }}
                dataKey="value"
                cornerRadius={5}
                fill={color}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold" style={{ color }}>
              {hours.toFixed(1)}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{status}</div>
      </div>
    </Card>
  );
};
