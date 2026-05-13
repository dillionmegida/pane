import React from 'react';
import styled from 'styled-components';
import type { Breadcrumb } from '../../types';

const BreadcrumbWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
`;

const Crumb = styled.span<{ isLast: boolean }>`
  font-size: 11px;
  color: ${p => p.isLast ? p.theme.text.primary : p.theme.text.tertiary};
  cursor: ${p => p.isLast ? 'default' : 'pointer'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  padding: 2px 3px;
  border-radius: ${p => p.theme.radius.sm};
  transition: all 0.1s;
  flex-shrink: ${p => p.isLast ? 0 : 1};

  &:hover {
    ${p => !p.isLast && `
      background: ${p.theme.bg.hover};
      color: ${p.theme.text.primary};
    `}
  }
`;

const Separator = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
  flex-shrink: 0;
  opacity: 0.6;
`;

interface PaneBreadcrumbProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (crumbPath: string, index: number) => void;
}

export default function PaneBreadcrumb({ breadcrumbs, onNavigate }: PaneBreadcrumbProps) {
  return (
    <BreadcrumbWrap>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.path + index}>
            {index > 0 && <Separator>›</Separator>}
            <Crumb
              isLast={isLast}
              onClick={() => !isLast && onNavigate(crumb.path, index)}
              title={crumb.path}
            >
              {crumb.name}
            </Crumb>
          </React.Fragment>
        );
      })}
    </BreadcrumbWrap>
  );
}
