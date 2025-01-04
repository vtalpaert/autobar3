import { writable } from 'svelte/store';
import type { Language } from './translations';

export const currentLanguage = writable<Language>('en');
