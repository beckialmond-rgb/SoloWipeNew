import { format } from 'date-fns';

interface HeaderProps {
  showLogo?: boolean;
  title?: string;
  rightContent?: React.ReactNode;
}

export function Header({ showLogo = true, title, rightContent }: HeaderProps) {
  const today = format(new Date(), 'EEE, d MMM');

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showLogo ? (
            <img 
              src="/logo.png" 
              alt="SoloWipe" 
              className="h-8 w-auto"
            />
          ) : title ? (
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          ) : null}
        </div>
        
        <div className="flex items-center gap-2">
          {rightContent || (
            <span className="text-sm font-medium text-muted-foreground">
              {today}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
