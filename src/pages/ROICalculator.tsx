import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Clock, PoundSterling, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function ROICalculator() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(50);
  const [jobsPerWeek, setJobsPerWeek] = useState(20);
  const [timePerJob, setTimePerJob] = useState(30); // minutes
  const [adminHoursPerWeek, setAdminHoursPerWeek] = useState(5);

  // Calculations
  const jobsPerYear = jobsPerWeek * 52;
  const totalJobTime = (jobsPerYear * timePerJob) / 60; // hours
  const totalAdminTime = adminHoursPerWeek * 52; // hours
  const totalTimeSpent = totalJobTime + totalAdminTime;

  // Time saved estimates (conservative)
  const timeSavedPerJob = 5; // minutes saved per job with automation
  const timeSavedPerWeek = (jobsPerWeek * timeSavedPerJob) / 60; // hours
  const timeSavedPerYear = timeSavedPerWeek * 52; // hours

  // Admin time saved (SMS, scheduling, payment chasing)
  const adminTimeSavedPerWeek = 3; // hours
  const adminTimeSavedPerYear = adminTimeSavedPerWeek * 52; // hours

  const totalTimeSaved = timeSavedPerYear + adminTimeSavedPerYear;

  // Value calculations
  const hourlyRate = 25; // Conservative estimate for window cleaner's time value
  const timeValueSaved = totalTimeSaved * hourlyRate;

  // Cost of SoloWipe
  const monthlyCost = 25;
  const annualCost = monthlyCost * 12;

  // ROI
  const netSavings = timeValueSaved - annualCost;
  const roi = ((netSavings / annualCost) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            ROI Calculator: How Much Time Can You Save?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Calculate how much time and money SoloWipe can save your window cleaning business
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Business Details</CardTitle>
              <CardDescription>
                Enter your current business metrics to see potential savings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customers">Number of Customers</Label>
                <Input
                  id="customers"
                  type="number"
                  min="1"
                  value={customers}
                  onChange={(e) => setCustomers(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobsPerWeek">Jobs Per Week</Label>
                <Input
                  id="jobsPerWeek"
                  type="number"
                  min="1"
                  value={jobsPerWeek}
                  onChange={(e) => setJobsPerWeek(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timePerJob">Average Time Per Job (minutes)</Label>
                <Input
                  id="timePerJob"
                  type="number"
                  min="1"
                  value={timePerJob}
                  onChange={(e) => setTimePerJob(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminHours">Admin Hours Per Week</Label>
                <Input
                  id="adminHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={adminHoursPerWeek}
                  onChange={(e) => setAdminHoursPerWeek(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Time spent on scheduling, texting, payment chasing, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Potential Savings</CardTitle>
              <CardDescription>
                Based on your inputs, here's what SoloWipe could save you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Saved */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Time Saved Per Year</h3>
                </div>
                <div className="text-3xl font-bold text-primary mb-1">
                  {totalTimeSaved.toFixed(0)} hours
                </div>
                <p className="text-sm text-muted-foreground">
                  That's {Math.floor(totalTimeSaved / 8)} full working days saved
                </p>
              </div>

              {/* Value Saved */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <PoundSterling className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-foreground">Value of Time Saved</h3>
                </div>
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  £{timeValueSaved.toFixed(0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on £{hourlyRate}/hour value of your time
                </p>
              </div>

              {/* ROI */}
              <div className="p-4 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-foreground" />
                  <h3 className="font-semibold text-foreground">Return on Investment</h3>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {roi}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Net savings: £{netSavings.toFixed(0)} after SoloWipe costs (£{annualCost}/year)
                </p>
              </div>

              {/* CTA */}
              <Button
                onClick={() => navigate('/auth?mode=signup')}
                className="w-full"
                size="lg"
              >
                Start Saving Time Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>How We Calculate Your Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Time Saved Per Job:</strong> SoloWipe automates scheduling, 
                  route optimization, and payment collection, saving approximately 5 minutes per job.
                </p>
                <p>
                  <strong className="text-foreground">Admin Time Saved:</strong> Automated SMS reminders, 
                  payment chasing, and scheduling reduces admin work by an estimated 3 hours per week.
                </p>
                <p>
                  <strong className="text-foreground">Value Calculation:</strong> We value your time at £{hourlyRate}/hour 
                  to calculate the monetary value of time saved.
                </p>
                <p className="text-xs italic">
                  * These are conservative estimates. Actual savings may vary based on your specific workflow.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}





