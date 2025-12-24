import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MonthlyEarningsChart() {
  const { user } = useAuth();

  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthlyEarnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('jobs')
        .select('completed_at, amount_collected')
        .eq('status', 'completed')
        .gte('completed_at', `${sixMonthsAgo}T00:00:00`)
        .order('completed_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const chartData = useMemo(() => {
    const months: { month: string; total: number; label: string }[] = [];
    
    // Create last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, 'yyyy-MM'),
        total: 0,
        label: format(date, 'MMM'),
      });
    }
    
    // Aggregate earnings by month
    monthlyData.forEach(job => {
      if (!job.completed_at) return;
      const jobMonth = format(new Date(job.completed_at), 'yyyy-MM');
      const month = months.find(m => m.month === jobMonth);
      if (month) {
        month.total += job.amount_collected || 0;
      }
    });
    
    return months;
  }, [monthlyData]);

  const totalSixMonths = chartData.reduce((sum, m) => sum + m.total, 0);
  const currentMonth = chartData[chartData.length - 1]?.total || 0;
  const previousMonth = chartData[chartData.length - 2]?.total || 0;
  const trend = previousMonth > 0 
    ? ((currentMonth - previousMonth) / previousMonth * 100).toFixed(0) 
    : '0';

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">6 Month Overview</h3>
          <p className="text-2xl font-bold text-foreground">£{totalSixMonths.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className={`w-4 h-4 ${Number(trend) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={Number(trend) >= 0 ? 'text-green-500' : 'text-red-500'}>
            {Number(trend) >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-muted-foreground ml-1">vs last month</span>
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`£${value.toFixed(2)}`, 'Earnings']}
            />
            <Bar 
              dataKey="total" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}