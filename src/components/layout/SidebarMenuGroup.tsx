import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarMenuGroupProps {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  collapsed: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  muted?: boolean;
}

const SidebarMenuGroup = ({ 
  title, 
  icon: GroupIcon, 
  items, 
  collapsed,
  isOpen = false,
  onToggle,
  muted = false
}: SidebarMenuGroupProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();
  
  // Check if any item in this group is active
  const hasActiveItem = items.some(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleItemClick = (item: MenuItem) => (e: React.MouseEvent) => {
    e.preventDefault();
    openTab(item.path, item.label);
    navigate(item.path);
  };

  const handleToggle = () => {
    onToggle?.();
  };

  // Collapsed mode - show only group icon with tooltip
  if (collapsed) {
    return (
      <div className="py-0.5">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggle}
              className={cn(
                "w-full flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                hasActiveItem 
                  ? "bg-primary text-primary-foreground" 
                  : muted
                    ? "text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <GroupIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={8}
            className="font-medium z-[9999] bg-popover border border-border shadow-lg p-2 min-w-[160px]"
          >
            <div className="space-y-1">
              <p className={cn(
                "font-semibold text-[11px] uppercase tracking-wide mb-2",
                muted ? "text-muted-foreground/60" : "text-muted-foreground"
              )}>{title}</p>
              {items.map(item => (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={handleItemClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors",
                    isActive(item.path) 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-accent"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded mode - show full collapsible group
  return (
    <Collapsible open={isOpen || hasActiveItem} onOpenChange={handleToggle} className="py-0.5">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group",
            hasActiveItem 
              ? "text-foreground" 
              : muted
                ? "text-muted-foreground/70 hover:bg-accent hover:text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <GroupIcon className="h-4 w-4 shrink-0" />
            <span className="tracking-[-0.01em]">{title}</span>
          </div>
          <ChevronRight 
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-foreground/50",
              (isOpen || hasActiveItem) && "rotate-90"
            )} 
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="mt-0.5 ml-[18px] pl-2.5 border-l border-border/50 space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={handleItemClick(item)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-200 cursor-pointer",
                  active 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="tracking-[-0.01em]">{item.label}</span>
              </a>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SidebarMenuGroup;
