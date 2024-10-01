import { join } from 'node:path';
import { browser } from 'wdio-electron-service';

export const resourcesPath: string = join(__dirname, 'resources', 'vids');

export enum SelectorType {
  CSS = 'css selector',
  TAG = 'tag name'
}

export const commons = {
  buildSelector: (text: string): string => {
    return text;
  },

  findElements: async (selector: string) => {
    return await browser.findElements(SelectorType.CSS, selector);
  },

  findElementsFromElement: async (elementId: string, selector?: string, type: SelectorType = SelectorType.CSS) => {
    return await browser.findElementsFromElement(elementId, type, selector);
  }
};
