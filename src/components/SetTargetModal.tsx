import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: number) => Promise<void>;
  currentTarget: number | null;
  targetType: 'weekly' | 'monthly';
  avgJobValue: number;
  activeCustomers: number;
  currentEarnings: number;
}

export function SetTargetModal({
  isOpen,
  onClose,
  onSave,
  currentTarget,
  targetType,
  avgJobValue,
  activeCustomers,
  currentEarnings,
}: SetTargetModalProps) {
  // For weekly: use slider (100-2500), for monthly: use input
  const isWeekly = targetType === 'weekly';
  const minValue = isWeekly ? 100 : 0;
  const maxValue = isWeekly ? 2500 : 10000;
  const step = isWeekly ? 50 : 10;
  
  const initialValue = currentTarget 
    ? Math.max(minValue, Math.min(maxValue, currentTarget))
    : (isWeekly ? 500 : 2000);
  
  const [targetValue, setTargetValue] = useState<string>(initialValue.toString());
  const [sliderValue, setSliderValue] = useState<number[]>([initialValue]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset value when modal opens or currentTarget changes
  useEffect(() => {
    if (isOpen) {
      const value = currentTarget 
        ? Math.max(minValue, Math.min(maxValue, currentTarget))
        : initialValue;
      setTargetValue(value.toString());
      setSliderValue([value]);
    }
  }, [isOpen, currentTarget, minValue, maxValue, initialValue]);

  if (!isOpen) return null;

  const numericValue = isWeekly 
    ? sliderValue[0] 
    : parseFloat(targetValue) || 0;
  
  // Sync slider and input for weekly
  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    setTargetValue(value[0].toString());
  };
  
  const handleInputChange = (value: string) => {
    setTargetValue(value);
    const numValue = parseFloat(value) || minValue;
    const clampedValue = Math.max(minValue, Math.min(maxValue, numValue));
    if (isWeekly) {
      setSliderValue([clampedValue]);
    }
  };
  
  // Calculate benchmark: avg job value * active customers * frequency
  const benchmark = avgJobValue * activeCustomers * (targetType === 'weekly' ? 0.25 : 1); // Weekly = monthly / 4
  const isAmbitious = numericValue > benchmark * 1.5; // 50% higher than benchmark
  const jobsNeeded = numericValue > avgJobValue 
    ? Math.ceil((numericValue - currentEarnings) / avgJobValue)
    : 0;

  const handleSave = async () => {
    // Clamp value to valid range
    const clampedValue = Math.max(minValue, Math.min(maxValue, numericValue));
    
    if (clampedValue < minValue || clampedValue > maxValue) {
      toast({
        title: 'Invalid target',
        description: isWeekly 
          ? `Please enter a target between £${minValue} and £${maxValue}`
          : 'Please enter a target greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(clampedValue);
      toast({
        title: 'Target saved',
        description: `Your ${targetType === 'weekly' ? 'weekly' : 'monthly'} target has been updated.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save target. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl border-2 border-border shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground">
                    Set {targetType === 'weekly' ? 'Weekly' : 'Monthly'} Target
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors touch-sm"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="target" className="text-sm font-semibold text-foreground mb-2 block">
                    Target Amount (£)
                  </Label>
                  
                  {/* Slider for Weekly Target */}
                  {isWeekly ? (
                    <div className="space-y-4">
                      {/* Large display value */}
                      <div className="text-center py-2">
                        <div className="text-4xl font-extrabold text-primary mb-1">
                          £{numericValue.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Slide to adjust your weekly target
                        </div>
                      </div>
                      
                      {/* Slider */}
                      <div className="px-2 py-4">
                        <Slider
                          value={sliderValue}
                          onValueChange={handleSliderChange}
                          min={minValue}
                          max={maxValue}
                          step={step}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Min/Max labels */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                        <span>£{minValue}</span>
                        <span>£{maxValue}</span>
                      </div>
                      
                      {/* Optional: Manual input for precise values */}
                      <div className="relative">
                        <Label htmlFor="target-input" className="text-xs text-muted-foreground mb-1 block">
                          Or enter exact amount:
                        </Label>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">£</span>
                        <Input
                          id="target-input"
                          type="number"
                          min={minValue}
                          max={maxValue}
                          step={step}
                          value={targetValue}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="pl-8 h-12 text-lg font-semibold touch-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Number Input for Monthly Goal */
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">£</span>
                      <Input
                        id="target"
                        type="number"
                        min="0"
                        step="10"
                        value={targetValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className="pl-8 h-12 text-lg font-semibold touch-sm"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Smart Benchmarking Insight */}
                {numericValue > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={cn(
                      "rounded-xl p-4 border-2",
                      isAmbitious
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className={cn(
                        "w-5 h-5 mt-0.5 shrink-0",
                        isAmbitious ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        {isAmbitious ? (
                          <>
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                              Ambitious Target!
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              To reach this target, you'd need to complete approximately <strong>{jobsNeeded} more jobs</strong> this {targetType === 'weekly' ? 'week' : 'month'}. Consider booking additional jobs or increasing prices.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                              Realistic Target
                            </p>
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                              Based on your average job value (£{avgJobValue.toFixed(0)}) and {activeCustomers} active customers, this target is achievable. You'll need to complete approximately <strong>{jobsNeeded} more jobs</strong> to reach it.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 touch-sm font-semibold border-2"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 h-12 touch-sm font-semibold"
                  disabled={isSaving || numericValue <= 0}
                >
                  {isSaving ? 'Saving...' : 'Save Target'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
