import React from 'react';
import { useOutcomeReasons } from './src/modules/outcome-reasons/hooks';

const TestOutcomeReasons: React.FC = () => {
  const { reasons, isLoading, error } = useOutcomeReasons({
    pipelineId: 'ee4e3ea3-bfb4-48b4-8de6-85216811e5b8', // Pipeline "new13"
    reasonType: 'all'
  });

  console.log('🧪 [TestOutcomeReasons] Resultado:', { reasons, isLoading, error });

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>Test Outcome Reasons</h2>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Error: {error ? error.message : 'None'}</p>
      <p>Reasons count: {reasons?.length || 0}</p>
      
      {reasons && reasons.length > 0 && (
        <div>
          <h3>Motivos encontrados:</h3>
          <ul>
            {reasons.map(reason => (
              <li key={reason.id}>
                [{reason.reason_type}] {reason.reason_text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestOutcomeReasons;