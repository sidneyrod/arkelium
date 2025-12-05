import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator as CalcIcon, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Calculator = () => {
  const { t } = useLanguage();
  const [sqft, setSqft] = useState(1500);
  const [serviceType, setServiceType] = useState('standard');
  const [frequency, setFrequency] = useState('weekly');
  const [employees, setEmployees] = useState(1);
  const [calculated, setCalculated] = useState(false);

  // Calculation logic
  const baseRate = 0.08; // per sqft
  const serviceMultipliers: Record<string, number> = {
    standard: 1,
    deep: 1.5,
    moveOut: 2,
    commercial: 1.3,
  };
  const frequencyDiscounts: Record<string, number> = {
    oneTime: 1,
    monthly: 0.95,
    biweekly: 0.9,
    weekly: 0.85,
  };

  const price = Math.round(sqft * baseRate * serviceMultipliers[serviceType] * frequencyDiscounts[frequency]);
  const cost = Math.round(price * 0.45);
  const profit = price - cost;
  const margin = Math.round((profit / price) * 100);
  const estimatedTime = Math.round((sqft / 500) * serviceMultipliers[serviceType] * 10) / 10;

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader 
        title={t.calculator.title}
        description="Calculate service pricing, costs, and profit margins"
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Parameters */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalcIcon className="h-4 w-4 text-primary" />
              {t.calculator.parameters}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Square Footage */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.calculator.squareFootage}</Label>
                <span className="text-sm font-medium text-primary">{sqft.toLocaleString()} sq ft</span>
              </div>
              <Slider
                value={[sqft]}
                onValueChange={(v) => setSqft(v[0])}
                min={500}
                max={10000}
                step={100}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>500 sq ft</span>
                <span>10,000 sq ft</span>
              </div>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label>{t.calculator.serviceType}</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Clean</SelectItem>
                  <SelectItem value="deep">Deep Clean</SelectItem>
                  <SelectItem value="moveOut">Move-out Clean</SelectItem>
                  <SelectItem value="commercial">Commercial Clean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>{t.calculator.frequency}</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oneTime">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employees */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.calculator.employees}</Label>
                <span className="text-sm font-medium text-primary">{employees}</span>
              </div>
              <Slider
                value={[employees]}
                onValueChange={(v) => setEmployees(v[0])}
                min={1}
                max={5}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 person</span>
                <span>5 people</span>
              </div>
            </div>

            <Button onClick={handleCalculate} className="w-full gap-2" size="lg">
              <Sparkles className="h-4 w-4" />
              {t.calculator.simulate}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          <Card className={cn(
            "border-border/50 transition-all duration-500",
            calculated && "border-primary/30 shadow-soft-lg"
          )}>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t.calculator.results}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.calculator.servicePrice}</p>
                    <p className="text-3xl font-bold text-primary">${price}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.calculator.estimatedCost}</p>
                      <p className="text-xl font-semibold">${cost}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.calculator.estimatedTime}</p>
                      <p className="text-xl font-semibold">{estimatedTime}h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Margin */}
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-success/80">{t.calculator.profitMargin}</p>
                      <p className="text-2xl font-bold text-success">{margin}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-success/80">Profit</p>
                    <p className="text-xl font-semibold text-success">${profit}</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{employees} employee(s)</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">${Math.round(profit / employees)} profit/person</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <span className="font-medium">Tip:</span> Weekly recurring clients provide 15% discount but generate 4x monthly revenue with higher retention rates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
