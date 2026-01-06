import { useState, useEffect } from 'react';
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
  defaultOpen?: boolean;
}

const SidebarMenuGroup = ({ 
  title, 
  icon: GroupIcon, 
  items, 
  collapsed,
  defaultOpen = false 
}: SidebarMenuGroupProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();
  
  // Check if any item in this group is active
  const hasActiveItem = items.some(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });
  
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveItem);

  // Auto-expand when navigating to a page within this module
  useEffect(() => {
    if (hasActiveItem && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveItem, location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleItemClick = (item: MenuItem) => (e: React.MouseEvent) => {
    e.preventDefault();
    openTab(item.path, item.label);
    navigate(item.path);
  };

  // Collapsed mode - show only group icon with tooltip
  if (collapsed) {
    return (
      <div className="py-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "w-full flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                hasActiveItem 
                  ? "bg-primary text-primary-foreground" 
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
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
              {items.map(item => (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={handleItemClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="py-1">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
            hasActiveItem 
              ? "text-foreground" 
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2.5">
            <GroupIcon className="h-4 w-4 shrink-0" />
            <span>{title}</span>
          </div>
          <ChevronRight 
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
              isOpen && "rotate-90"
            )} 
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="mt-1 ml-4 pl-3 border-l border-border space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={handleItemClick(item)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 cursor-pointer",
                  active 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SidebarMenuGroup;