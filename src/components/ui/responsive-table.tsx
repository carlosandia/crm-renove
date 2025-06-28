import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './dropdown-menu';

interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  className?: string;
  render?: (value: any, item: any) => React.ReactNode;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface ActionConfig {
  label: string;
  icon?: React.ComponentType<any>;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  showInDropdown?: boolean;
}

interface ResponsiveTableProps {
  data: any[];
  columns: ColumnConfig[];
  actions?: ActionConfig[];
  loading?: boolean;
  emptyMessage?: string;
  showMobileCards?: boolean;
  onRowClick?: (item: any) => void;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  showMobileCards = true,
  onRowClick,
  className = ''
}) => {
  // Mobile Cards View (< 768px)
  const MobileCardsView = () => (
    <div className="block md:hidden space-y-4">
      {data.map((item, index) => (
        <Card 
          key={index} 
          className={`p-4 ${onRowClick ? 'cursor-pointer hover:bg-muted/30' : ''}`}
          onClick={() => onRowClick?.(item)}
        >
          <div className="space-y-3">
            {/* Primary Info */}
            <div className="space-y-1">
              {columns.slice(0, 2).map((column) => (
                <div key={column.key}>
                  {column.render ? (
                    <div className="text-sm font-medium text-foreground">
                      {column.render(item[column.key], item)}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-foreground">
                      {item[column.key]}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Secondary Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {columns.slice(2, 6).map((column) => (
                <div key={column.key}>
                  <span className="text-muted-foreground font-medium">
                    {column.label}:
                  </span>
                  <div className="mt-1">
                    {column.render ? 
                      column.render(item[column.key], item) : 
                      item[column.key]
                    }
                  </div>
                </div>
              ))}
            </div>
            
            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex gap-1">
                  {actions
                    .filter(action => !action.showInDropdown)
                    .slice(0, 2)
                    .map((action, actionIndex) => {
                      const IconComponent = action.icon;
                      return (
                        <Button
                          key={actionIndex}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                        >
                          {IconComponent && <IconComponent className="w-3 h-3" />}
                        </Button>
                      );
                    })}
                </div>
                
                {actions.filter(action => action.showInDropdown || actions.length > 2).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions
                        .filter(action => action.showInDropdown || actions.length > 2)
                        .map((action, actionIndex) => {
                          const IconComponent = action.icon;
                          return (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={() => action.onClick(item)}
                            >
                              {IconComponent && <IconComponent className="w-4 h-4 mr-2" />}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  // Desktop Table View (>= 768px)
  const DesktopTableView = () => (
    <div className="hidden md:block">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={`
                    ${column.width || 'w-auto'}
                    ${column.hideOnTablet ? 'hidden lg:table-cell' : ''}
                    ${column.className || ''}
                  `}
                >
                  {column.label}
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="w-32 text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow 
                key={index}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/30' : ''}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={column.key}
                    className={`
                      ${column.hideOnTablet ? 'hidden lg:table-cell' : ''}
                      ${column.className || ''}
                    `}
                  >
                    {column.render ? 
                      column.render(item[column.key], item) : 
                      item[column.key]
                    }
                  </TableCell>
                ))}
                {actions.length > 0 && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {actions
                        .filter(action => !action.showInDropdown)
                        .slice(0, 3)
                        .map((action, actionIndex) => {
                          const IconComponent = action.icon;
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant || 'outline'}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                            >
                              {IconComponent && <IconComponent className="w-3 h-3" />}
                            </Button>
                          );
                        })}
                      
                      {actions.filter(action => action.showInDropdown || actions.length > 3).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions
                              .filter(action => action.showInDropdown || actions.length > 3)
                              .map((action, actionIndex) => {
                                const IconComponent = action.icon;
                                return (
                                  <DropdownMenuItem
                                    key={actionIndex}
                                    onClick={() => action.onClick(item)}
                                  >
                                    {IconComponent && <IconComponent className="w-4 h-4 mr-2" />}
                                    {action.label}
                                  </DropdownMenuItem>
                                );
                              })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Mobile Loading */}
        <div className="block md:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </TableHead>
                  ))}
                  {actions.length > 0 && (
                    <TableHead>
                      <div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto"></div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                    {actions.length > 0 && (
                      <TableCell>
                        <div className="h-8 bg-muted rounded animate-pulse w-24 ml-auto"></div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (data.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {showMobileCards ? <MobileCardsView /> : null}
      <DesktopTableView />
    </div>
  );
}; 