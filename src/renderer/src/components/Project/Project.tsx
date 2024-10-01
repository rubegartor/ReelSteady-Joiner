import React, { useEffect, useState } from 'react';

import ContextMenu, { ContextMenuYOffset } from '@components/Menu/ContextMenu';
import '@components/Project/Project.scss';
import { ProjectData } from '@components/Project/ProjectData';

import CloseIcon from '@assets/close';
import LoadingIcon from '@assets/loading';

import { AppChannel } from '@src/AppChannel';

interface ProjectProps {
  projectData: ProjectData;
  onRemove: () => void;
  isProcessing: boolean;
}

const Project: React.FC<ProjectProps> = ({ projectData, onRemove, isProcessing }: ProjectProps): React.JSX.Element => {
  const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0
  });
  const [thumbnail, setThumbnail] = useState<React.JSX.Element | null>(null);

  const handleContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault();
    setMenuPosition({
      x: event.clientX,
      y: event.clientY - ContextMenuYOffset
    });
    setContextMenuVisible(true);
  };

  const handleCloseContextMenu = (): void => {
    setContextMenuVisible(false);
  };

  useEffect((): void => {
    let thumbnailElement: React.JSX.Element;

    if (projectData.thumbnail) {
      thumbnailElement = <img className='img' src={projectData.thumbnail} alt={''} />;
    } else if (projectData.failed) {
      thumbnailElement = (
        <div className='thumbnail'>
          <CloseIcon color='white' />
        </div>
      );
    } else {
      thumbnailElement = (
        <div className='thumbnail'>
          <LoadingIcon color='white' />
        </div>
      );
    }

    setThumbnail(thumbnailElement);
  }, [projectData.thumbnail, projectData.failed]);

  return (
    <div className='project' onContextMenu={handleContextMenu}>
      {contextMenuVisible && (
        <ContextMenu
          onClose={handleCloseContextMenu}
          onOpen={(): void => {
            window.electron.ipcRenderer.send(AppChannel.OpenPath, {
              path: projectData.savePath === '' ? projectData.absolutePath : projectData.savePath
            });
          }}
          canRemove={!isProcessing}
          onRemove={onRemove}
          x={menuPosition.x}
          y={menuPosition.y}
        />
      )}
      <div className='title'>{projectData.files[0]}</div>
      {thumbnail}
      <div className='progress-container'>
        <div className='text'>{projectData.progress}%</div>
        <progress
          className={`progress-${projectData.failed ? 'red' : projectData.completed ? 'green' : 'orange'}`}
          value={!projectData.failed ? projectData.progress : '100'}
          max='100'
        ></progress>
      </div>
    </div>
  );
};

export default Project;
