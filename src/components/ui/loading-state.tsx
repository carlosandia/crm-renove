import React from 'react';
import { Skeleton } from './skeleton';
import { Card } from './card';

interface LoadingStateProps {
  variant?: 'table' | 'cards' | 'list' | 'form' | 'dashboard';
  className?: string;
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  variant = 'list', 
  className = '',
  count = 3 
}) => {
  const baseClasses = `animate-pulse ${className}`;

  switch (variant) {
    case 'table':
      return (
        <div className={baseClasses}>
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Table Header */}
            <div className="bg-muted/50 border-b border-border">
              <div className="flex items-center gap-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-border">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'cards':
      return (
        <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${baseClasses}`}>
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );

    case 'list':
      return (
        <div className={`space-y-3 ${baseClasses}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      );

    case 'form':
      return (
        <div className={`space-y-6 ${baseClasses}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className={baseClasses}>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
          
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-64 w-full" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-64 w-full" />
              </div>
            </Card>
          </div>
        </div>
      );

    default:
      return (
        <div className={baseClasses}>
          <Skeleton className="h-4 w-full" />
        </div>
      );
  }
}; 