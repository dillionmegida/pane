import React from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';

const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  gap: 2px;
  font-size: 11px;
`;

const BreadcrumbItem = styled.span`
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 2px 4px;
  border-radius: ${p => p.theme.radius.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  
  &.last {
    color: ${p => p.theme.text.primary};
    cursor: default;
    &:hover { background: transparent; }
  }
`;

const BreadSep = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
`;

export default function PaneBreadcrumb({ paneId, crumbs, viewMode, closePreview }) {
  const { setCurrentBreadcrumbPath, navigateTo, getActiveBookmark, pushNavHistory } = useStore();

  const handleCrumbClick = (crumb, i) => {
    if (i === crumbs.length - 1) return;

    closePreview();

    if (viewMode === 'column') {
      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
      setCurrentBreadcrumbPath(paneId, crumb.path);
      pushNavHistory(paneId, {
        basePath: currentPane.basePath,
        currentBreadcrumbPath: crumb.path,
        selectedFiles: [],
        previewFilePath: null,
      });
    } else {
      const activeBookmark = getActiveBookmark(paneId);
      const isUnderBookmark = activeBookmark &&
        (crumb.path === activeBookmark.path || crumb.path.startsWith(activeBookmark.path + '/'));

      if (!isUnderBookmark) {
        useStore.getState().updatePane(paneId, { basePath: '/', activeBookmarkId: null });
      }

      setCurrentBreadcrumbPath(paneId, crumb.path);
      navigateTo(paneId, crumb.path);
    }
  };

  return (
    <BreadcrumbBar>
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.path}>
          {i > 0 && <BreadSep>›</BreadSep>}
          <BreadcrumbItem
            className={i === crumbs.length - 1 ? 'last' : ''}
            onClick={() => handleCrumbClick(crumb, i)}
          >
            {crumb.name}
          </BreadcrumbItem>
        </React.Fragment>
      ))}
    </BreadcrumbBar>
  );
}
