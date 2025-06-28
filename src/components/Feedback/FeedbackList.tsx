import React, { useState } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Eye, 
  ChevronDown, 
  ChevronUp,
  Facebook,
  Chrome,
  Linkedin,
  Webhook,
  FileText,
  User as UserIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { LoadingState } from '../ui/loading-state';

interface FeedbackData {
  id: string;
  feedback_type: 'positive' | 'negative';
  comment: string;
  created_at: string;
  lead_id: string;
  vendedor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  admin_empresa: {
    id: string;
    company_name: string;
    tenant_id: string;
  };
  lead: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    valor?: number;
    source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
  };
  pipeline: {
    id: string;
    name: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
  };
}

interface FeedbackListProps {
  feedbacks: FeedbackData[];
  loading: boolean;
  onFeedbackClick?: (feedback: FeedbackData) => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({
  feedbacks,
  loading,
  onFeedbackClick
}) => {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleCommentExpansion = (feedbackId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(feedbackId)) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    setExpandedComments(newExpanded);
  };

  const truncateComment = (comment: string, maxLength: number = 120) => {
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'meta':
        return {
          icon: Facebook,
          label: 'Meta Ads',
          color: 'text-blue-600',
          bg: 'bg-blue-100'
        };
      case 'google':
        return {
          icon: Chrome,
          label: 'Google Ads',
          color: 'text-green-600',
          bg: 'bg-green-100'
        };
      case 'linkedin':
        return {
          icon: Linkedin,
          label: 'LinkedIn',
          color: 'text-blue-700',
          bg: 'bg-blue-100'
        };
      case 'webhook':
        return {
          icon: Webhook,
          label: 'Webhook',
          color: 'text-purple-600',
          bg: 'bg-purple-100'
        };
      case 'form':
        return {
          icon: FileText,
          label: 'Formulário',
          color: 'text-orange-600',
          bg: 'bg-orange-100'
        };
      default:
        return {
          icon: UserIcon,
          label: 'Manual',
          color: 'text-gray-600',
          bg: 'bg-gray-100'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            variant="feedback"
            title="Nenhum feedback encontrado"
            description="Ainda não há mensagens de feedback dos usuários."
            actionLabel="Atualizar"
            onAction={() => {}}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedbacks ({feedbacks.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {feedbacks.map((feedback) => {
            const isExpanded = expandedComments.has(feedback.id);
            const shouldTruncate = feedback.comment.length > 120;
            const sourceInfo = getSourceIcon(feedback.lead.source);
            const SourceIcon = sourceInfo.icon;
            
            return (
              <div 
                key={feedback.id} 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onFeedbackClick?.(feedback)}
              >
                <div className="flex items-center space-x-4 text-sm">
                  
                  {/* Ícone Positivo/Negativo */}
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" 
                    title={feedback.feedback_type === 'positive' ? 'Feedback Positivo' : 'Feedback Negativo'}
                  >
                    {feedback.feedback_type === 'positive' ? (
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* UTM Source */}
                  <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                    <Badge variant="secondary" className={`${sourceInfo.bg} ${sourceInfo.color} hover:${sourceInfo.bg}`}>
                      <SourceIcon className="w-3 h-3 mr-1" />
                      {sourceInfo.label}
                    </Badge>
                  </div>

                  {/* Usuário que registrou o feedback */}
                  <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                    <span className="font-medium text-gray-900">{feedback.vendedor.name}</span>
                    {feedback.vendedor.role === 'admin' && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                        Admin
                      </Badge>
                    )}
                    {feedback.vendedor.role === 'member' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        Member
                      </Badge>
                    )}
                  </div>

                  {/* Comentário */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 leading-relaxed">
                      {shouldTruncate && !isExpanded 
                        ? truncateComment(feedback.comment)
                        : feedback.comment
                      }
                    </p>
                    {shouldTruncate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCommentExpansion(feedback.id);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 h-auto p-0 mt-1"
                      >
                        {isExpanded ? (
                          <>
                            <span>Ver menos</span>
                            <ChevronUp className="w-3 h-3 ml-1" />
                          </>
                        ) : (
                          <>
                            <span>Ver mais</span>
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Nome da empresa e data/hora */}
                  <div className="flex items-center space-x-3 text-xs text-gray-500 flex-shrink-0">
                    <span className="font-medium">{feedback.admin_empresa.company_name}</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(feedback.created_at)}</span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackList; 