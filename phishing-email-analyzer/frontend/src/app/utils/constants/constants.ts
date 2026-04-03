import { AiModelId } from '../enums/enums';
import { type AiModelOption } from '../interfaces/interfaces';

export { AiModelId } from '../enums/enums';

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: AiModelId.GPT_4_1, name: 'GPT-4.1' },
  { id: AiModelId.GEMINI_2_5_PRO, name: 'Gemini 2.5 Pro' },
  { id: AiModelId.MISTRAL_7B, name: 'Mistral 7B' },
  { id: AiModelId.LLAMA_CLOUD, name: 'Llama Cloud' },
  { id: AiModelId.BIELIK_2_4BIT, name: 'Bielik 2 (4-bit)' },
];

export const STORAGE_KEY = 'app-theme-mode';
