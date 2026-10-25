import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceUnavailable } from '../pages/ServiceUnavailable';

export const NetworkStatus = () => {
  const [issue, setIssue] = useState(() => navigator.onLine ? null : { offline: true });
  const navigate = useNavigate();

  useEffect(() => {
    const handleOffline = () => setIssue({ offline: true });
    const handleOnline = () => setIssue(current => current?.offline ? { offline: false, recovered: true } : current);
    const handleConnectionError = event => setIssue({ offline: !!event.detail?.offline });

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('reelearn:connection-error', handleConnectionError);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('reelearn:connection-error', handleConnectionError);
    };
  }, []);

  if (!issue) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <ServiceUnavailable
        offline={issue.offline}
        recovered={issue.recovered}
        onRetry={() => window.location.reload()}
        onHome={() => {
          setIssue(null);
          navigate('/');
        }}
      />
    </div>
  );
};
