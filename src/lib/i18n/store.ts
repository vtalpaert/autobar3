import { writable } from 'svelte/store';
import type { Language } from './translations/index';

export const currentLanguage = writable<Language>('en');
