export interface Choice {
  id: string;
  label: string;
  color: string;
  description?: string;
}

export interface SpinResult {
  id: string;
  choice: Choice;
  timestamp: number;
}

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  choices: string[];
  isCustom?: boolean;
}

export interface Statistics {
  totalSpins: number;
  choiceFrequency: Record<string, { label: string; count: number; color: string }>;
}

export type Theme = 'dark' | 'light';

export interface AppState {
  choices: Choice[];
  history: SpinResult[];
  theme: Theme;
  soundEnabled: boolean;
  customPresets: Preset[];
}
