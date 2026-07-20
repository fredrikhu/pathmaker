export * from './model';
export { SKILLS, skillById } from './skills';
export { RACES, raceById } from './races';
export { CLASSES, classById } from './classes';
export { CLASS_PROGRESSION } from './class-features';
export { FEATS, featById, FIREARM_GROUP_ID } from './feats';
export { TRAITS, traitById } from './traits';
export { WEAPONS, ARMORS, GEAR, weaponById, armorById, gearById, anyItemById } from './equipment';
export type { AnyItem } from './equipment';
export {
  DEITIES, deityById, DOMAINS, domainById, BLESSINGS, blessingById, SCHOOLS, schoolById,
  BLOODLINES, bloodlineById, LANGUAGES,
} from './deities';
export { SPELLS, spellById, spellLevelOn } from './spells';
export { ORACLE_REVELATIONS, ORACLE_MYSTERIES, BLOODRAGER_BLOODLINES, SHAMAN_SPIRITS, CAVALIER_ORDERS } from './subsystems';
export { SORCERER_BLOODLINE_POWERS, CAVALIER_ORDER_ABILITIES, BLOODRAGER_BLOODLINE_POWERS, SHAMAN_SPIRIT_ABILITIES, ORACLE_FINAL_REVELATIONS } from './source-features';
export type { SourceFeature } from './source-features';
export { CONDITIONS, conditionById } from './conditions';
export { WEAPON_PROPERTIES, weaponPropertyById } from './weapon-properties';
export type { WeaponPropertyDef } from './weapon-properties';
export { ARMOR_PROPERTIES, armorPropertyById } from './armor-properties';
export type { ArmorPropertyDef } from './armor-properties';
export { WONDROUS_ITEMS, wondrousItemById, BODY_SLOTS, SLOT_CAPACITY } from './wondrous';
export type { WondrousItemDef, BodySlot } from './wondrous';
export type { ConditionDef } from './conditions';

export const CONTENT_VERSION = 'core-0.1';
