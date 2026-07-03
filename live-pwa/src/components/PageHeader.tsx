import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  back?: boolean;
  action?: ReactNode;
}

export default function PageHeader({ title, back, action }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      {back && (
        <button className="back-link" onClick={() => navigate(-1)} aria-label="Retour">
          ‹
        </button>
      )}
      <h1>{title}</h1>
      {action}
    </header>
  );
}
