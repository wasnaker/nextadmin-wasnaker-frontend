/**
 * Module registry — collect all module i18n dicts for I18nProvider.
 *
 * Import each module's definition here so the host can merge their
 * dictionaries into the global i18n context.  Do NOT put page exports
 * in this file (that belongs in the routing layer).
 */
import { customerModule } from '@wasnaker/customers-web';
import { regionModule } from '@wasnaker/region-web';
import { vatModule } from '@wasnaker/vat-web';
import { agencyModule } from '@wasnaker/agency-web';
import { associationModule } from '@wasnaker/association-web';
import { surveyorModule } from '@wasnaker/surveyor-web';
import { homeModule } from '@wasnaker/home-web';

/** Array of module i18n dicts — one entry per active module.
 *  Only modules with i18n property are included. */
export const MODULE_I18N: Record<string, Record<string, string>>[] = [
  ...(customerModule.i18n ? [customerModule.i18n] : []),
  ...(regionModule.i18n ? [regionModule.i18n] : []),
  ...(vatModule.i18n ? [vatModule.i18n] : []),
  ...(agencyModule.i18n ? [agencyModule.i18n] : []),
  ...(associationModule.i18n ? [associationModule.i18n] : []),
  ...(surveyorModule.i18n ? [surveyorModule.i18n] : []),
  ...(homeModule.i18n ? [homeModule.i18n] : []),
];
