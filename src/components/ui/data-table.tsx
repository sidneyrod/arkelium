import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onRowClick,
  className,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            {columns.map((column) => (
              <TableHead 
                key={String(column.key)} 
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12",
                  column.className
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-32 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow 
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "border-border/50 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50"
                )}
              >
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className={cn("py-4", column.className)}>
                    {column.render 
                      ? column.render(item) 
                      : String(item[column.key as keyof T] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataTable;
