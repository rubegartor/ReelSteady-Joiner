import { browser } from 'wdio-electron-service';
import { ChainablePromiseElement } from 'webdriverio';

import { AppChannel } from '../../src/AppChannel';
import { SelectorType, commons, resourcesPath } from './fixtures';

async function openSelectDialog(): Promise<void> {
  await browser.execute(
    (channel: AppChannel, resourcesPath: string): void => {
      window.electron.ipcRenderer.send(channel, resourcesPath);
    },
    AppChannel.OpenDialog,
    resourcesPath
  );

  await browser.waitUntil(
    async (): Promise<boolean> => {
      await browser.executeAsync((channel: AppChannel, done): void => {
        window.electron.ipcRenderer.on(channel, done);
      }, AppChannel.AllProjectsAvailable);

      return true;
    },
    {
      timeout: 20000,
      timeoutMsg: 'Expected to load projects'
    }
  );
}

describe('Test application settings', (): void => {
  it('should open settings', async (): Promise<void> => {
    await $('#settingsBtn').click();

    const settingsContainer: ChainablePromiseElement = $('#settings');
    expect(await settingsContainer.isDisplayed()).toBe(true);
  });

  it('should change export type option', async (): Promise<void> => {
    const selectConfigBox = $(commons.buildSelector('.configBox*=Project save path'));
    const selectElement = selectConfigBox.$('select');

    await selectElement.selectByVisibleText('Export to source path');

    expect(await selectElement.getValue()).toBe('source_path');
    expect(await selectConfigBox.$('input').isDisplayed()).toBe(false);
    await selectElement.selectByVisibleText('Select project save path');

    expect(await selectElement.getValue()).toBe('project_path');
    expect(await selectConfigBox.$('input').isDisplayed()).toBe(true);
  });

  it('should change processing type option', async (): Promise<void> => {
    const selectConfigBox = $(commons.buildSelector('.configBox*=Processing type'));
    const selectElement = selectConfigBox.$('select');

    await selectElement.selectByVisibleText('FFmpeg');

    expect(await $(commons.buildSelector('.configBox*=Preserve PCM audio')).isDisplayed()).toBe(true);
    expect(await selectElement.getValue()).toBe('ffmpeg');

    await selectElement.selectByVisibleText('MP4Merge');

    expect(await $(commons.buildSelector('.configBox*=Preserve PCM audio')).isExisting()).toBe(false);
    expect(await selectElement.getValue()).toBe('mp4merge');
  });

  it('should increment, decrement and check limits of projects queue', async (): Promise<void> => {
    const spinConfigBox: ChainablePromiseElement = $(commons.buildSelector('.configBox*=Projects queue'));
    const spinElement = spinConfigBox.$('input');
    const spinElementDecrement = spinConfigBox.$('.btn-number-input-l');
    const spinElementIncrement = spinConfigBox.$('.btn-number-input-r');

    const MAX: number = 5;
    const MIN: number = 1;

    for (let i: number = 0; i < MAX + 2; i++) {
      await spinElementIncrement.click();
    }

    expect(await spinElement.getValue()).toBe(MAX.toString());

    for (let i: number = 0; i < MAX + 2; i++) {
      await spinElementDecrement.click();
    }

    expect(await spinElement.getValue()).toBe(MIN.toString());
  });

  it('should increment, decrement and check limits of project path', async (): Promise<void> => {
    const spinConfigBox = $(commons.buildSelector('.configBox*=Path depth'));
    const spinElement = spinConfigBox.$('input');
    const spinElementDecrement = spinConfigBox.$('.btn-number-input-l');
    const spinElementIncrement = spinConfigBox.$('.btn-number-input-r');

    const MIN: number = 0;
    const MAX: number = 100;

    for (let i: number = 0; i < MAX + 2; i++) {
      await spinElementIncrement.click();
    }

    expect(await spinElement.getValue()).toBe(MAX.toString());

    for (let i: number = 0; i < MAX + 2; i++) {
      await spinElementDecrement.click();
    }

    expect(await spinElement.getValue()).toBe(MIN.toString());

    await spinElement.setValue('50');
    expect(await spinElement.getValue()).toBe('50');

    await spinElement.setValue('101');
    expect(await spinElement.getValue()).toBe(MAX.toString());
  });

  it('should close settings', async (): Promise<void> => {
    await $('.goBack').click();

    const settingsContainer: ChainablePromiseElement = $('#settings');
    expect(await settingsContainer.isDisplayed()).toBe(false);
  });
});

describe('Test file loading', (): void => {
  it('should load files (2 ok, 1 err)', async (): Promise<void> => {
    await browser.executeAsync((channel: AppChannel, done): void => {
      window.electron.ipcRenderer.send(channel, {
        key: 'pathDepth',
        value: 3
      });

      done();
    }, AppChannel.UpdateConfig);

    await openSelectDialog();

    const projects = await commons.findElements('.project');
    expect(projects).toHaveLength(2);
    expect(await commons.findElements('.progress-red')).toHaveLength(1);
  });
});

describe('Check merge button is disabled', (): void => {
  it('merge button should be disabled when projects with errors', async (): Promise<void> => {
    const mergeButton: ChainablePromiseElement = $('#processVideos');
    expect(await mergeButton.isClickable()).toBe(false);
  });
});

describe('Test project remove', (): void => {
  it('should remove a project', async (): Promise<void> => {
    const clickRemove = async (): Promise<void> => {
      await $(commons.buildSelector('li=Remove')).click();
    };

    const failedProject: ChainablePromiseElement = $('.project .progress-red');
    await failedProject.click({ button: 'right' });

    await clickRemove();

    expect(await commons.findElements('.project')).toHaveLength(1);
  });
});

describe('Test project processing', (): void => {
  it('should process projects', async (): Promise<void> => {
    const checkSettingsState = async (enabledState: boolean): Promise<void> => {
      // Check if all settings are disabled while processing
      const settingsButton: ChainablePromiseElement = $('#settingsBtn');
      await settingsButton.click();

      const settingsContainer = $('#settings');
      const configBoxArray = await commons.findElementsFromElement(await settingsContainer.elementId, '.configBox', SelectorType.CSS);

      for (const configBox of configBoxArray) {
        const inputElements = await commons.findElementsFromElement(await $(configBox).elementId, 'input', SelectorType.TAG);
        const selectElements = await commons.findElementsFromElement(await $(configBox).elementId, 'select', SelectorType.TAG);
        const buttonElements = await commons.findElementsFromElement(await $(configBox).elementId, 'button', SelectorType.TAG);

        for (const inputElement of inputElements) {
          expect(await $(inputElement).isEnabled()).toBe(enabledState);
        }

        for (const selectElement of selectElements) {
          expect(await $(selectElement).isEnabled()).toBe(enabledState);
        }

        for (const buttonElement of buttonElements) {
          if ((await $(buttonElement).getText()) === 'Open logs') continue;

          expect(await $(buttonElement).isEnabled()).toBe(enabledState);
        }
      }

      await $('.goBack').click();
    };

    const openDialogButton: ChainablePromiseElement = $('#selectFiles');
    const mergeButton: ChainablePromiseElement = $('#processVideos');
    await mergeButton.click();

    expect(await mergeButton.isEnabled()).toBe(false);
    expect(await openDialogButton.isEnabled()).toBe(false);

    await checkSettingsState(false);

    await browser.executeAsync((channel: AppChannel, done): void => {
      window.electron.ipcRenderer.on(channel, done);
    }, AppChannel.AllProjectsCompleted);

    const projects = await commons.findElements('.project');
    const filteredProjects = projects.filter(async (project: WebdriverIO.Element): Promise<boolean> => {
      return (await project.getText()).includes('100%');
    });

    expect(filteredProjects.length).toBe(projects.length);

    await checkSettingsState(true);

    expect(await mergeButton.isEnabled()).toBe(false);
    expect(await openDialogButton.isEnabled()).toBe(true);

    await openSelectDialog();

    expect(await mergeButton.isEnabled()).toBe(false);
    expect(await openDialogButton.isEnabled()).toBe(true);

    expect(await commons.findElements('.project')).toHaveLength(2);
    expect(await commons.findElements('.progress-red')).toHaveLength(1);
  });
});
