import { SetMetadata } from '@nestjs/common';
import { ModuleCode } from '../types/module-code';

export const MODULES_KEY = 'requiredModules';
export const RequiresModule = (...modules: ModuleCode[]) => SetMetadata(MODULES_KEY, modules);
