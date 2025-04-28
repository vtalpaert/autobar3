import { cocktails } from './cocktails';
import { devices } from './devices';
import { ui } from './ui';
import { auth } from './auth';
import { profileCollaboration } from './profileCollaboration';
import { myBar } from './myBar';

export type Language = 'en' | 'fr';

export const translations = {
  en: {
    ...ui.en,
    ...cocktails.en,
    ...devices.en,
    ...auth.en,
    ...profileCollaboration.en,
    ...myBar.en
  },
  fr: {
    ...ui.fr,
    ...cocktails.fr,
    ...devices.fr,
    ...auth.fr,
    ...profileCollaboration.fr,
    ...myBar.fr
  }
} as const;
