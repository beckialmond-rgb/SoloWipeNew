import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordStrength } from '@/hooks/usePasswordStrength';

interface PasswordStrengthIndicatorProps {
  passwordStrength: PasswordStrength;
  showChecklist?: boolean;
}

export const PasswordStrengthIndicator = ({ 
  passwordStrength, 
  showChecklist = true 
}: PasswordStrengthIndicatorProps) => {
  const { checks, score, strength } = passwordStrength;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              score >= level
                ? strength === 'strong' ? 'bg-success'
                  : strength === 'good' ? 'bg-success/70'
                  : strength === 'fair' ? 'bg-warning'
                  : 'bg-destructive'
                : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </div>
      
      {/* Strength label */}
      <p className={cn(
        "text-xs font-medium",
        strength === 'strong' ? 'text-success'
          : strength === 'good' ? 'text-success/80'
          : strength === 'fair' ? 'text-warning'
          : 'text-destructive'
      )}>
        Password strength: {strength}
      </p>
      
      {/* Requirements checklist */}
      {showChecklist && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className={cn("flex items-center gap-1", checks.minLength ? "text-success" : "text-muted-foreground")}>
            {checks.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            8+ characters
          </div>
          <div className={cn("flex items-center gap-1", checks.hasUppercase ? "text-success" : "text-muted-foreground")}>
            {checks.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Uppercase
          </div>
          <div className={cn("flex items-center gap-1", checks.hasLowercase ? "text-success" : "text-muted-foreground")}>
            {checks.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Lowercase
          </div>
          <div className={cn("flex items-center gap-1", checks.hasNumber ? "text-success" : "text-muted-foreground")}>
            {checks.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Number
          </div>
          <div className={cn("flex items-center gap-1 col-span-2", checks.hasSpecial ? "text-success" : "text-muted-foreground")}>
            {checks.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Special character (!@#$%...)
          </div>
        </div>
      )}
    </motion.div>
  );
};
