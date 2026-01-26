import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface OperationalData {
  completed: number;
  inProgress: number;
  delayed: number;
}

interface OperationalDonutProps {
  data: OperationalData;
}

const COLORS = {
  completed: '#C9A84B', // Gold
  inProgress: 'hsl(220 15% 55%)', // Slate
  delayed: 'hsl(0 72% 60%)', // Muted red
};

const OperationalDonut = ({ data }: OperationalDonutProps) => {
  const total = data.completed + data.inProgress + data.delayed;
  const completedPercentage = total > 0 ? Math.round((data.completed / total) * 100) : 0;
  const delayedPercentage = total > 0 ? Math.round((data.delayed / total) * 100) : 0;

  const chartData = [
    { name: 'Completed', value: data.completed, color: COLORS.completed },
    { name: 'In Progress', value: data.inProgress, color: COLORS.inProgress },
    { name: 'Delayed', value: data.delayed, color: COLORS.delayed },
  ].filter((item) => item.value > 0);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          Operational Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center">
          {/* Donut Chart with Center Value */}
          <div className="relative h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Value */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">
                {completedPercentage}%
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.completed }}
                />
                <span className="text-muted-foreground">Completed</span>
              </div>
              <span className="font-medium">{completedPercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.inProgress }}
                />
                <span className="text-muted-foreground">In Progress</span>
              </div>
              <span className="font-medium">{data.inProgress}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.delayed }}
                />
                <span className="text-muted-foreground">Delayed</span>
              </div>
              <span className="font-medium">{delayedPercentage}%</span>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="w-full mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{completedPercentage}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Completed on time
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{100 - completedPercentage}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Avg service duration
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationalDonut;
