import React, { useCallback, useEffect, useReducer, useState } from 'react';

import { StateEnum } from '@renderer/commons/StateEnum';
import '@renderer/commons/commons.scss';
import '@renderer/components/Application.scss';

import Nav from '@components/Nav/Nav';
import NotificationContainer from '@components/Notification/NotificationContainer';
import { NotificationContextProps, useNotification } from '@components/Notification/NotificationContext';
import Project from '@components/Project/Project';
import { ProjectData } from '@components/Project/ProjectData';
import Settings from '@components/Settings/Settings';

import LoadingIcon from '@assets/loading';
import settings from '@assets/settings.png';

import { AppChannel } from '@src/AppChannel';

enum ProjectActionType {
  SET_PROJECTS = 'SET_PROJECTS',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  REMOVE_PROJECT = 'REMOVE_PROJECT'
}

interface ProjectAction {
  type: ProjectActionType;
  payload: ProjectData[] | ProjectData | string;
}

const projectReducer = (state: ProjectData[], action: ProjectAction): ProjectData[] => {
  switch (action.type) {
    case ProjectActionType.UPDATE_PROJECT:
      return state.map(
        (project: ProjectData): ProjectData =>
          project.id === (action.payload as ProjectData).id ? (action.payload as ProjectData) : project
      );
    case ProjectActionType.REMOVE_PROJECT:
      const projectIdToRemove: string = action.payload as string;
      window.electron.ipcRenderer.removeAllListeners(AppChannel.ProjectChanged.replace('{id}', projectIdToRemove));

      window.electron.ipcRenderer.send(AppChannel.RemoveProject, { projectId: projectIdToRemove });
      return state.filter((project: ProjectData): boolean => project.id !== projectIdToRemove);
    case ProjectActionType.SET_PROJECTS:
      return action.payload as ProjectData[];
    default:
      return state;
  }
};

const Application: React.FC = (): React.JSX.Element => {
  const [pathDialog, setPathDialog] = useState<StateEnum>(StateEnum.Enabled);
  const [merge, setMerge] = useState<StateEnum>(StateEnum.Disabled);
  const [isLoadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(true);

  const [projects, dispatch] = useReducer(projectReducer, []);

  const { addNotification }: NotificationContextProps = useNotification();

  useEffect((): void => {
    const checkUpdate = async (): Promise<void> => {
      const availableUpdate: boolean = await window.electron.ipcRenderer.invoke(AppChannel.CheckUpdate);

      if (availableUpdate) {
        addNotification({
          id: window.electron.ipcRenderer.sendSync(AppChannel.GetUUIDV4),
          title: 'Update available',
          message: 'A new version is available, click here to update',
          onClick: (): WindowProxy | null => window.open('https://github.com/rubegartor/ReelSteady-Joiner/releases', '_blank'),
          timeout: 0,
          canClose: true
        });
      }
    };

    checkUpdate().then();
  }, []);

  const fetchProjects: (path?: string) => Promise<void> = useCallback(
    async (path?: string): Promise<void> => {
      const projectsData: ProjectData[] = (await window.electron.ipcRenderer
        .invoke(AppChannel.GetProjects, { path })
        .catch()) as ProjectData[];

      if (projectsData.length > 0) {
        const filteredProjects: ProjectData[] = projects.filter((project: ProjectData): boolean => !project.completed);
        const existingProjectIds: Set<string> = new Set(filteredProjects.map((project: ProjectData): string => project.files[0]));

        const newProjects: ProjectData[] = projectsData.filter((newProject: ProjectData): boolean => {
          return !existingProjectIds.has(newProject.files[0]);
        });

        const updatedProjects: ProjectData[] = [...filteredProjects, ...newProjects];

        dispatch({ type: ProjectActionType.SET_PROJECTS, payload: updatedProjects });

        newProjects.forEach((newProject: ProjectData): void => {
          const handleUpdateEvent = async (): Promise<void> => {
            const updatedProjectData: ProjectData = await window.electron.ipcRenderer.invoke(AppChannel.GetProject, {
              projectId: newProject.id
            });

            dispatch({ type: ProjectActionType.UPDATE_PROJECT, payload: updatedProjectData });
          };

          window.electron.ipcRenderer.on(AppChannel.ProjectChanged.replace('{id}', newProject.id), handleUpdateEvent);
        });
      }

      setLoadingFiles(false);
      setPathDialog(StateEnum.Enabled);
    },
    [projects]
  );

  useEffect((): void => {
    projects.length > 0 &&
    !processing &&
    pathDialog === StateEnum.Enabled &&
    projects.every((project: ProjectData): boolean => project.available && !project.completed && !project.failed)
      ? setMerge(StateEnum.Enabled)
      : setMerge(StateEnum.Disabled);
  }, [projects, pathDialog, processing]);

  const handleOpenDialogReturn: () => void = useCallback((): void => {
    window.electron.ipcRenderer.on(AppChannel.OpenDialogReturn, async (_: Electron.IpcRendererEvent, path: string): Promise<void> => {
      if (path === undefined) return;

      setPathDialog(StateEnum.Disabled);
      setLoadingFiles(true);

      await fetchProjects(path);
    });
  }, []);

  useEffect((): (() => void) => {
    handleOpenDialogReturn();

    return (): void => {
      window.electron.ipcRenderer.removeAllListeners(AppChannel.OpenDialogReturn);
    };
  }, [handleOpenDialogReturn]);

  const handleAllProjectsCompleted: () => void = useCallback((): void => {
    setPathDialog(StateEnum.Enabled);
    setProcessing(false);
  }, []);

  useEffect((): (() => void) => {
    window.electron.ipcRenderer.on(AppChannel.AllProjectsCompleted, handleAllProjectsCompleted);
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners(AppChannel.AllProjectsCompleted);
    };
  }, [handleAllProjectsCompleted]);

  return (
    <div id='mainContainer'>
      <NotificationContainer />
      <React.StrictMode>
        <Nav />
        <div className='container'>
          <div className='centerContainer'>
            <div>
              <h1>ReelSteady Joiner</h1>
              <span className='subtitle'>Select the videos you want to merge without losing the gyroscope data</span>
            </div>
            <div className='buttonContainer'>
              <button
                type='button'
                className='button-green button-img'
                id='settingsBtn'
                onClick={(): void => setIsSettingsVisible(!isSettingsVisible)}
              >
                <img src={settings} alt={''} />
              </button>
              <button
                type='button'
                className='button-orange'
                onClick={(): void => {
                  window.electron.ipcRenderer.send(AppChannel.OpenDialog);
                }}
                id='selectFiles'
                disabled={pathDialog === StateEnum.Disabled}
              >
                {isLoadingFiles ? <LoadingIcon color='white' className='icon icon24' /> : ''}
                {isLoadingFiles ? 'Searching videos' : 'Select folder'}
              </button>
              <button
                type='button'
                className='button-green'
                id='processVideos'
                disabled={merge === StateEnum.Disabled}
                onClick={(): void => {
                  setPathDialog(StateEnum.Disabled);
                  setProcessing(true);
                  window.electron.ipcRenderer.send(AppChannel.MergeProjects);
                }}
              >
                Merge!
              </button>
            </div>
          </div>
          <hr />
          <div className='projectBox'>
            <div className='projectBoxGrid'>
              {projects.length ? (
                projects.map(
                  (p: ProjectData): React.JSX.Element => (
                    <Project
                      key={p.id}
                      projectData={p}
                      isProcessing={processing}
                      onRemove={(): void => dispatch({ type: ProjectActionType.REMOVE_PROJECT, payload: p.id })}
                    />
                  )
                )
              ) : (
                <div className='empty-item'>🔎 Add files to start merging!</div>
              )}
            </div>
          </div>
        </div>
        {isSettingsVisible ? '' : <Settings toggle={(): void => setIsSettingsVisible(!isSettingsVisible)} disabled={processing} />}
      </React.StrictMode>
    </div>
  );
};

export default Application;
