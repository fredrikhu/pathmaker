export * from './model';
export { SKILLS, skillById } from './skills';
export { RACES, raceById } from './races';
export { CLASSES, classById } from './classes';
export { FEATS, featById } from './feats';
export { TRAITS, traitById } from './traits';
export { WEAPONS, ARMORS, GEAR, weaponById, armorById, gearById, anyItemById } from './equipment';
export type { AnyItem } from './equipment';
export {
  DEITIES, deityById, DOMAINS, domainById, SCHOOLS, schoolById,
  BLOODLINES, bloodlineById, LANGUAGES,
} from './deities';
export { SPELLS, spellById } from './spells';
export { ORACLE_REVELATIONS } from './subsystems';

export const CONTENT_VERSION = 'core-0.1';
