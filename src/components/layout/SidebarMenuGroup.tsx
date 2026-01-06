import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, LucideIcon } from 'lucide-react';
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
      <div className="space-y-0.5">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "w-full flex items-center justify-center p-2 rounded-md transition-all duration-200",
                hasActiveItem 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <GroupIcon className={cn("h-4 w-4", hasActiveItem && "text-primary")} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={8}
            className="font-medium z-[9999] bg-popover border border-border shadow-lg"
          >
            <div className="space-y-1">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
              {items.map(item => (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={handleItemClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                    isActive(item.path) 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted"
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 group",
            hasActiveItem 
              ? "text-sidebar-accent-foreground" 
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <GroupIcon className={cn("h-4 w-4 shrink-0", hasActiveItem && "text-primary")} />
            <span className="truncate">{title}</span>
          </div>
          <ChevronDown 
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              isOpen ? "rotate-180" : "rotate-0"
            )} 
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <ul className="mt-0.5 ml-3.5 space-y-0.5 border-l border-border/50 pl-1.5">
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <a
                  href={item.path}
                  onClick={handleItemClick(item)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all duration-200 cursor-pointer",
                    active 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")} />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SidebarMenuGroup;
