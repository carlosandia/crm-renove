import React from 'react';
import { useParams } from 'react-router-dom';
import PublicFormRenderer from './PublicFormRenderer';

const PublicFormRoute: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Formulário não encontrado</h1>
          <p className="text-gray-600">O link do formulário parece estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicFormRenderer
      formId={slug}
      formSlug={slug}
      embedded={false}
    />
  );
};

export default PublicFormRoute;
