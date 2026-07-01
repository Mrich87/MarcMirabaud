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
        <a
          className="back-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(-1);
          }}
        >
          ‹
        </a>
      )}
      <h1>{title}</h1>
      {action}
    </header>
  );
}
