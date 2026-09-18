import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { IconButton } from "./IconButton";
import "./PageHeader.css";

export interface PageHeaderBreadcrumb {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
  /** Path to navigate back to. Renders a back button above the title. */
  backTo?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, backTo }: PageHeaderProps) {
  const navigate = useNavigate();
  const hasNav = backTo || (breadcrumbs && breadcrumbs.length > 0);

  return (
    <header className="page-header">
      {hasNav && (
        <div className="page-header__nav">
          {backTo && (
            <IconButton
              icon={<ChevronLeft size={18} />}
              label="Back"
              size="sm"
              onClick={() => navigate(backTo)}
            />
          )}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="breadcrumb">
              <ol className="breadcrumb__list">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb.label} className="breadcrumb__item">
                    {crumb.to ? (
                      <Link to={crumb.to} className="breadcrumb__link">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                      <span className="breadcrumb__separator" aria-hidden="true">
                        /
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      )}
      <div className="page-header__row">
        <div className="page-header__heading">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
