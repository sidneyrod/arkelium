import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface RevenuePoint {
  month: string;
  revenue: number;
  forecast: number;
}

interface RevenueTrendChartProps {
  data: RevenuePoint[];
}

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const revenue = payload.find((p: any) => p.dataKey === 'revenue');
    const forecast = payload.find((p: any) => p.dataKey === 'forecast');

    return (
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {revenue && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C9A84B' }} />
            <span className="text-muted-foreground">Gross Revenue:</span>
            <span className="font-medium">${revenue.value.toLocaleString()}</span>
          </div>
        )}
        {forecast && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">Forecast:</span>
            <span className="font-medium">${forecast.value.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const RevenueTrendChart = ({ data }: RevenueTrendChartProps) => {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Revenue Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={formatCurrency}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={48}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground ml-1">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#C9A84B"
                strokeWidth={2.5}
                dot={{ fill: '#C9A84B', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#C9A84B', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueTrendChart;
