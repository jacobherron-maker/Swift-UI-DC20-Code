import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import type { ContentFocusRequest } from '../../navigation/appNavigation';
import { weaponPropertyRuleID } from '../../rules/ruleRegistry';
import { useCampaignStore } from '../../store/campaignStore';
import type {
  AncestryTrait,
  Character,
  ClassReference,
  EquipmentCatalogItem,
  EquipmentCategory,
  EquipmentSlot,
  PartyCampaignSnapshot,
  PartyInventoryItem,
  SavedCombat,
  SemanticRuleReference,
} from '../../types/models';
import { EquipmentCategoryValues, EquipmentSlotValues } from '../../types/models';
import { applyDerivedCharacter, deriveCharacter, equippedCombatModifiers } from '../../utils/characterRules';
import {
  consumeInventoryQuantity,
  defensiveEquipmentProfile,
  equipmentUsageLabel,
  equipmentUseCapacity,
  healingPotionAmount,
  isEquipmentEquippable,
  ROUTED_SHEET_EFFECTS,
  spendInventoryUse,
  toggleInventoryAttuned,
  toggleInventoryEquipped,
  weaponMechanicalProfile,
} from '../../utils/equipmentRules';
import {
  addEquipmentQuantity,
  equipmentAccessForCharacter,
  equipmentComparisonFacts,
  equipmentEffectKinds,
  equipmentProvenance,
  equipmentRangeBucket,
  type EquipmentAccessState,
  type EquipmentEffectKind,
  type EquipmentRangeBucket,
} from '../../utils/equipmentLibraryRules';
import { generateUUID, rollD20WithAdjustment, sortByName } from '../../utils/gameUtils';
import { isPartyManager } from '../../utils/campaignRules';
import { PillMultiSelect, toggleValue } from '../equipment/PillMultiSelect';
import { ExplicitRuleLink, RuleAwareText } from '../rules/RuleAwareText';
import RuleLinkInspector from '../rules/RuleLinkInspector';

/* Navigation requests intentionally synchronize this view's local filters and dialog. */
/* oxlint-disable react/set-state-in-effect */

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';
const ROUTED_EFFECT_NAMES = Object.keys(ROUTED_SHEET_EFFECTS);
const RANGE_FILTERS: Array<'All' | EquipmentRangeBucket> = ['All', 'Melee', 'Short', 'Long', 'Special'];
const EFFECT_FILTERS: EquipmentEffectKind[] = ['Attack', 'Defense', 'Check Bonus', 'Damage Bonus', 'Resistance', 'Healing', 'Consumable', 'Utility'];
const ACCESS_FILTERS: Array<'All' | EquipmentAccessState> = ['All', 'Equipped', 'In Inventory', 'Trained', 'Untrained', 'Compatible'];

interface CustomItemDraft {
  name: string;
  highlight: string;
  description: string;
  category: EquipmentCategory;
  slot: EquipmentSlot;
  properties: string[];
  routedEffects: string[];
  ruleReferences: SemanticRuleReference[];
}

function draftFromItem(item: EquipmentCatalogItem): CustomItemDraft {
  return {
    name: item.name,
    highlight: item.summary,
    description: item.mechanics,
    category: item.category,
    slot: item.slot,
    properties: item.properties.filter((tag) => !(tag in ROUTED_SHEET_EFFECTS)),
    routedEffects: item.properties.filter((tag) => tag in ROUTED_SHEET_EFFECTS),
    ruleReferences: item.ruleReferences ?? [],
  };
}

function emptyDraft(): CustomItemDraft {
  return {
    name: '',
    highlight: '',
    description: '',
    category: EquipmentCategoryValues.ADVENTURING_SUPPLIES,
    slot: EquipmentSlotValues.CARRIED,
    properties: [],
    routedEffects: [],
    ruleReferences: [],
  };
}

function accessTone(state: EquipmentAccessState): string {
  if (state === 'Equipped') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  if (state === 'In Inventory') return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
  if (state === 'Trained') return 'border-violet-400/25 bg-violet-500/10 text-violet-100';
  if (state === 'Untrained') return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-slate-300';
}

function provenanceTone(status: ReturnType<typeof equipmentProvenance>['status']): string {
  return status === 'User-authored'
    ? 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100'
    : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
}

function ToggleChips({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return <fieldset><legend className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{title}</legend><div className="flex flex-wrap gap-2">{options.map((option) => {
    const active = selected.includes(option);
    return <button type="button" key={option} aria-pressed={active} onClick={() => onToggle(option)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-slate-950/45 text-slate-400 hover:border-violet-400/30'}`}>{option}</button>;
  })}</div></fieldset>;
}

function uniqueCatalog(items: EquipmentCatalogItem[]): EquipmentCatalogItem[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function applyInventoryChange(character: Character, items: NonNullable<Character['inventoryItems']>, itemCatalog: EquipmentCatalogItem[], classReference: ClassReference | null, ancestryTraits: AncestryTrait[]): Character {
  const next = { ...character, inventoryItems: items };
  return classReference ? applyDerivedCharacter(next, deriveCharacter(next, classReference, ancestryTraits, itemCatalog)) : next;
}

export default function EquipmentView({ focusRequest, onFocusHandled }: { focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void }) {
  const { equipment, isLoading, error } = useEquipmentCatalog();
  const { reference, isLoading: referenceLoading } = useCharacterReference();
  const partyHub = usePartyCampaigns();
  const { user } = useAuth();
  const {
    campaignData,
    characters,
    selectedCharacterId,
    selectedCombatId,
    updateCharacter,
    updateCombat,
    addCustomEquipment,
    updateCustomEquipment,
    removeCustomEquipment,
  } = useCampaignStore();
  const [library, setLibrary] = useState<'standard' | 'magic'>('standard');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'All' | 'Custom Items'>('All');
  const [subtype, setSubtype] = useState('All');
  const [slot, setSlot] = useState<'All' | EquipmentSlot>('All');
  const [source, setSource] = useState('All');
  const [range, setRange] = useState<(typeof RANGE_FILTERS)[number]>('All');
  const [attunement, setAttunement] = useState<'All' | 'Required' | 'Not required'>('All');
  const [uses, setUses] = useState<'All' | 'Limited uses' | 'Persistent'>('All');
  const [accessFilter, setAccessFilter] = useState<(typeof ACCESS_FILTERS)[number]>('All');
  const [properties, setProperties] = useState<string[]>([]);
  const [effects, setEffects] = useState<string[]>([]);
  const [damageTypes, setDamageTypes] = useState<string[]>([]);
  const [sort, setSort] = useState<'Name A–Z' | 'Category' | 'Source' | 'Character Access'>('Name A–Z');
  const [selectedEquipmentID, setSelectedEquipmentID] = useState<string | null>(null);
  const [targetCharacterID, setTargetCharacterID] = useState(selectedCharacterId ?? '');
  const [compareIDs, setCompareIDs] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [notice, setNotice] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const mobileListScrollRef = useRef(0);
  const categories = Object.values(EquipmentCategoryValues);
  const customEquipment = campaignData.customEquipment;
  const customIDs = useMemo(() => new Set(customEquipment.map(({ id }) => id)), [customEquipment]);
  const sharedEquipment = useMemo(() => partyHub.parties.flatMap(({ inventory }) => inventory.flatMap(({ itemSnapshot }) => itemSnapshot ? [itemSnapshot] : [])), [partyHub.parties]);
  const standardEquipment = useMemo(() => sortByName(uniqueCatalog([...sharedEquipment.filter(({ collection }) => collection !== 'Magic'), ...equipment.filter(({ collection }) => collection !== 'Magic'), ...customEquipment])), [customEquipment, equipment, sharedEquipment]);
  const magicEquipment = useMemo(() => sortByName(uniqueCatalog([...sharedEquipment.filter(({ collection }) => collection === 'Magic'), ...equipment.filter(({ collection }) => collection === 'Magic')])), [equipment, sharedEquipment]);
  const allEquipment = useMemo(() => uniqueCatalog([...sharedEquipment, ...characters.flatMap(({ inventoryItems }) => (inventoryItems ?? []).flatMap(({ itemSnapshot }) => itemSnapshot ? [itemSnapshot] : [])), ...equipment, ...customEquipment]), [characters, customEquipment, equipment, sharedEquipment]);
  const activeEquipment = library === 'magic' ? magicEquipment : standardEquipment;
  const effectiveTargetCharacterID = targetCharacterID || selectedCharacterId || characters[0]?.id || '';
  const character = characters.find(({ id }) => id === effectiveTargetCharacterID) ?? null;
  const classReference = reference?.classes.find(({ name }) => name === character?.class) ?? null;
  const ancestryTraits = useMemo(() => reference?.ancestryTraits ?? [], [reference]);
  const accessByID = useMemo(() => new Map(activeEquipment.map((item) => [item.id, equipmentAccessForCharacter(character, item, classReference, ancestryTraits)])), [activeEquipment, ancestryTraits, character, classReference]);
  const propertyOptions = useMemo(() => Array.from(new Set(activeEquipment.flatMap((item) => item.properties))).sort(), [activeEquipment]);
  const damageTypeOptions = useMemo(() => Array.from(new Set(activeEquipment.flatMap((item) => weaponMechanicalProfile(item)?.damageTypes ?? []))).sort(), [activeEquipment]);
  const subtypeOptions = useMemo(() => Array.from(new Set(activeEquipment.map((item) => item.subtype))).sort(), [activeEquipment]);
  const sourceOptions = useMemo(() => Array.from(new Set(activeEquipment.map((item) => equipmentProvenance(item, customIDs.has(item.id)).sourceDocument))).sort(), [activeEquipment, customIDs]);

  useEffect(() => {
    if (selectedCharacterId && characters.some(({ id }) => id === selectedCharacterId)) setTargetCharacterID(selectedCharacterId);
  }, [characters, selectedCharacterId]);

  const chooseItem = useCallback((id: string) => {
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    if (mobile) mobileListScrollRef.current = rootRef.current?.parentElement?.scrollTop ?? 0;
    setSelectedEquipmentID(id);
    setMobileDetailOpen(true);
    setNotice('');
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollTo({ top: 0 });
      if (mobile) rootRef.current?.parentElement?.scrollTo({ top: 0 });
    });
  }, []);

  const backToList = () => {
    setMobileDetailOpen(false);
    window.requestAnimationFrame(() => rootRef.current?.parentElement?.scrollTo({ top: mobileListScrollRef.current }));
  };

  useEffect(() => {
    if (focusRequest?.kind !== 'equipment') return;
    const requestedItem = allEquipment.find(({ id }) => id === focusRequest.id);
    setLibrary(requestedItem?.collection === 'Magic' ? 'magic' : 'standard');
    setCategory(focusRequest.id && customIDs.has(focusRequest.id) ? 'Custom Items' : 'All');
    if (focusRequest.id) chooseItem(focusRequest.id);
    else setShowCustomModal(true);
    onFocusHandled?.();
  }, [allEquipment, chooseItem, customIDs, focusRequest, onFocusHandled]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = activeEquipment.filter((item) => {
      const itemEffects = equipmentEffectKinds(item);
      const itemSource = equipmentProvenance(item, customIDs.has(item.id)).sourceDocument;
      const itemDamageTypes = weaponMechanicalProfile(item)?.damageTypes ?? [];
      const itemAccess = accessByID.get(item.id)?.state;
      return (category === 'All' || (category === 'Custom Items' ? customIDs.has(item.id) : item.category === category))
        && (subtype === 'All' || item.subtype === subtype)
        && (slot === 'All' || item.slot === slot)
        && (source === 'All' || itemSource === source)
        && (range === 'All' || equipmentRangeBucket(item) === range)
        && (attunement === 'All' || (attunement === 'Required') === Boolean(item.requiresAttunement))
        && (uses === 'All' || (uses === 'Limited uses') === (equipmentUseCapacity(item) !== undefined || item.properties.includes('Consumable')))
        && (accessFilter === 'All' || itemAccess === accessFilter)
        && (properties.length === 0 || properties.every((value) => item.properties.includes(value)))
        && (effects.length === 0 || effects.every((value) => itemEffects.includes(value as EquipmentEffectKind)))
        && (damageTypes.length === 0 || damageTypes.some((value) => itemDamageTypes.includes(value)))
        && (!query || [item.name, item.subtype, item.summary, item.mechanics, itemSource, ...item.properties].some((value) => value.toLowerCase().includes(query)));
    });
    const accessOrder: Record<EquipmentAccessState, number> = { Equipped: 0, 'In Inventory': 1, Trained: 2, Compatible: 3, Untrained: 4 };
    return [...results].sort((left, right) => {
      if (sort === 'Category') return `${left.category} ${left.subtype} ${left.name}`.localeCompare(`${right.category} ${right.subtype} ${right.name}`);
      if (sort === 'Source') return `${equipmentProvenance(left, customIDs.has(left.id)).sourceDocument} ${left.name}`.localeCompare(`${equipmentProvenance(right, customIDs.has(right.id)).sourceDocument} ${right.name}`);
      if (sort === 'Character Access') return (accessOrder[accessByID.get(left.id)?.state ?? 'Compatible'] - accessOrder[accessByID.get(right.id)?.state ?? 'Compatible']) || left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });
  }, [accessByID, accessFilter, activeEquipment, attunement, category, customIDs, damageTypes, effects, properties, range, search, slot, sort, source, subtype, uses]);

  const requestedSelection = activeEquipment.find(({ id }) => id === selectedEquipmentID) ?? null;
  const selected = requestedSelection && filtered.some(({ id }) => id === requestedSelection.id) ? requestedSelection : filtered[0] ?? null;
  const selectedIsCustom = selected ? customIDs.has(selected.id) : false;
  const comparisonItems = compareIDs.flatMap((id) => allEquipment.find((item) => item.id === id) ?? []);
  const selectedCombat = campaignData.combats.find(({ id }) => id === selectedCombatId) ?? null;

  const resetFilters = () => {
    setCategory('All'); setSubtype('All'); setSlot('All'); setSource('All'); setRange('All'); setAttunement('All'); setUses('All'); setAccessFilter('All'); setProperties([]); setEffects([]); setDamageTypes([]); setSort('Name A–Z'); setSelectedEquipmentID(null); setMobileDetailOpen(false);
  };
  const activeFilterCount = Number(category !== 'All') + Number(subtype !== 'All') + Number(slot !== 'All') + Number(source !== 'All') + Number(range !== 'All') + Number(attunement !== 'All') + Number(uses !== 'All') + Number(accessFilter !== 'All') + properties.length + effects.length + damageTypes.length + Number(sort !== 'Name A–Z');
  const toggleFilter = (setter: (update: (current: string[]) => string[]) => void) => (value: string) => setter((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  const toggleCompare = (id: string) => setCompareIDs((current) => {
    if (current.includes(id)) return current.filter((entry) => entry !== id);
    if (current.length >= 3) { setNotice('Compare supports up to 3 items at a time.'); return current; }
    return [...current, id];
  });

  const addToCharacter = (quantity: number, unitPrice: number) => {
    if (!selected || !character) return;
    const safeQuantity = Math.max(1, Math.trunc(quantity));
    const price = Math.max(0, Math.trunc(unitPrice));
    const total = safeQuantity * price;
    if ((character.gold ?? 0) < total) { setNotice(`${character.name || 'This character'} does not have enough gold for that table-entered price.`); return; }
    updateCharacter({ ...character, gold: Math.max(0, (character.gold ?? 0) - total), inventoryItems: addEquipmentQuantity(character.inventoryItems ?? [], selected, safeQuantity) });
    setNotice(`${safeQuantity} × ${selected.name} added to ${character.name || 'the selected character'}${total ? ` for ${total} gold` : ''}.`);
  };

  const addToParty = async (partyID: string, ownerCharacterID: string, quantity: number, unitPrice: number, spendSharedGold: boolean) => {
    if (!selected) return;
    const party = partyHub.parties.find(({ id, role }) => id === partyID && isPartyManager(role));
    if (!party) { setNotice('Choose a campaign you manage.'); return; }
    const safeQuantity = Math.max(1, Math.trunc(quantity));
    const price = Math.max(0, Math.trunc(unitPrice));
    const total = safeQuantity * price;
    if (spendSharedGold && party.gold < total) { setNotice(`${party.name} does not have enough shared gold.`); return; }
    const owner = party.members.find((member) => member.characterId === ownerCharacterID || member.character?.id === ownerCharacterID);
    const existing = party.inventory.find((entry) => entry.equipmentID === selected.id && (entry.ownerCharacterID ?? '') === ownerCharacterID);
    const usesPerItem = equipmentUseCapacity(selected);
    const sharedItem: PartyInventoryItem = existing ? {
      ...existing,
      quantity: existing.quantity + safeQuantity,
      ...(usesPerItem !== undefined ? { remainingUses: (existing.remainingUses ?? existing.quantity * usesPerItem) + safeQuantity * usesPerItem } : {}),
      goldCost: price,
      updatedAt: new Date().toISOString(),
    } : {
      id: generateUUID(),
      name: selected.name,
      description: selected.summary || selected.mechanics,
      quantity: safeQuantity,
      addedBy: user?.uid ?? 'local-gm',
      updatedAt: new Date().toISOString(),
      equipmentID: selected.id,
      itemSnapshot: selected,
      ...(ownerCharacterID ? { ownerCharacterID, ownerName: owner?.character?.name || owner?.displayName } : {}),
      ...(price ? { goldCost: price } : {}),
      ...(usesPerItem !== undefined ? { remainingUses: usesPerItem * safeQuantity } : {}),
      distributedByGM: true,
    };
    try {
      await (existing ? partyHub.updateSharedInventoryItem(party.id, sharedItem) : partyHub.addSharedInventoryItem(party.id, sharedItem));
      if (spendSharedGold && total > 0) await partyHub.adjustSharedGold(party.id, -total);
      setNotice(`${safeQuantity} × ${selected.name} added to ${party.name}${owner ? ` for ${owner.character?.name || owner.displayName}` : ''}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The campaign inventory could not be updated.');
    }
  };

  const moveFromParty = async (party: PartyCampaignSnapshot, sharedItem: PartyInventoryItem) => {
    if (!selected || !character) return;
    const manager = isPartyManager(party.role);
    const canManageInventory = manager || party.permissions.playersCanManageInventory;
    const canClaim = canManageInventory && (manager || party.members.some((member) => member.userId === user?.uid && (member.characterId === character.id || member.character?.id === character.id)));
    if (!canClaim || sharedItem.ownerCharacterID && sharedItem.ownerCharacterID !== character.id && !manager) return;
    try {
      if (sharedItem.quantity <= 1) await partyHub.removeSharedInventoryItem(party.id, sharedItem.id);
      else await partyHub.updateSharedInventoryItem(party.id, {
        ...sharedItem,
        quantity: sharedItem.quantity - 1,
        ...(sharedItem.remainingUses !== undefined ? { remainingUses: Math.max(0, sharedItem.remainingUses - (equipmentUseCapacity(selected) ?? 0)) } : {}),
        updatedAt: new Date().toISOString(),
      });
      updateCharacter({ ...character, inventoryItems: addEquipmentQuantity(character.inventoryItems ?? [], selected, 1) });
      setNotice(`${selected.name} moved from ${party.name} to ${character.name}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The shared item could not be updated.');
    }
  };

  const createCustomItem = (draft: CustomItemDraft) => {
    const name = draft.name.trim();
    if (!name) return;
    const item: EquipmentCatalogItem = { id: `custom-equipment-${generateUUID()}`, name, category: draft.category, subtype: 'Custom Item', summary: draft.highlight.trim(), mechanics: draft.description.trim(), properties: [...draft.properties, ...draft.routedEffects], slot: draft.slot, sourcePage: 'Custom Item', sourceDocument: 'Player-created Equipment Library', ruleReferences: draft.ruleReferences };
    addCustomEquipment(item);
    setLibrary('standard'); setCategory('Custom Items'); setSelectedEquipmentID(item.id); setMobileDetailOpen(true); setShowCustomModal(false);
    setNotice(`${item.name} was added to the custom equipment library.`);
  };
  const saveCustomItem = (item: EquipmentCatalogItem, draft: CustomItemDraft) => {
    const name = draft.name.trim(); if (!name) return;
    updateCustomEquipment({ ...item, name, category: draft.category, summary: draft.highlight.trim(), mechanics: draft.description.trim(), properties: [...draft.properties, ...draft.routedEffects], slot: draft.slot, ruleReferences: draft.ruleReferences });
  };
  const deleteCustomItem = (item: EquipmentCatalogItem) => {
    if (!window.confirm(`Delete ${item.name}? It will also be removed from character inventories.`)) return;
    removeCustomEquipment(item.id); setSelectedEquipmentID(null); setMobileDetailOpen(false); setNotice(`${item.name} was deleted.`);
  };

  if (isLoading || referenceLoading) return <div className="p-10 text-slate-300">Loading the audited equipment library…</div>;

  return <div ref={rootRef} className="min-h-full p-3 sm:p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-visible lg:p-7">
    <div className="mx-auto max-w-[1600px] lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col">
      <header className={`${mobileDetailOpen ? 'hidden lg:block' : ''} mb-5 lg:shrink-0`}><p className="theme-accent-text text-xs font-black uppercase tracking-[0.28em]">Source-audited gear and campaign inventory</p><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Items & Equipment</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">Search and compare {allEquipment.length} equipment records, preview character-sheet changes, manage purchases and party loot, and resolve equipped items at the table.</p></header>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{notice}</p>}
      <section className={`${mobileDetailOpen ? 'hidden lg:block' : ''} mb-4 rounded-2xl border border-white/10 bg-slate-950/65 p-3 sm:p-4 lg:shrink-0`}>
        <div className="grid gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_minmax(220px,300px)_auto]">
          <button type="button" onClick={() => { setLibrary('standard'); resetFilters(); }} className={`rounded-xl px-4 py-3 font-black ${library === 'standard' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Standard ({standardEquipment.length})</button>
          <button type="button" onClick={() => { setLibrary('magic'); resetFilters(); }} className={`rounded-xl px-4 py-3 font-black ${library === 'magic' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Magic ({magicEquipment.length})</button>
          <input type="search" className={`${inputClass} min-w-0 py-3`} value={search} onChange={(event) => { setSearch(event.target.value); setSelectedEquipmentID(null); }} placeholder="Search names, properties, mechanics, and sources…" aria-label="Search equipment" />
          <select className={`${inputClass} min-w-0 py-3 font-bold`} value={effectiveTargetCharacterID} onChange={(event) => { setTargetCharacterID(event.target.value); setAccessFilter('All'); }} aria-label="Choose character for equipment access"><option value="">No character selected</option>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || 'Unnamed'} • Level {entry.level} {entry.class}</option>)}</select>
          {library === 'standard' ? <button type="button" onClick={() => setShowCustomModal(true)} className="btn-primary px-4 text-sm font-black">+ Custom</button> : <div className="flex items-center justify-center rounded-lg border border-amber-400/15 bg-amber-500/5 px-3 text-center text-xs font-bold text-amber-200">Supplemental Catalogs</div>}
        </div>
        <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-violet-200"><span>Advanced Filters {activeFilterCount > 0 && <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-1 text-[10px]">{activeFilterCount} active</span>}</span><span className="text-xs text-slate-500">Type • source • properties • effects • access</span></summary><div className="mt-4 space-y-4 border-t border-white/5 pt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <FilterSelect label="Category" value={category} onChange={(value) => setCategory(value as typeof category)} options={['All', ...categories.filter((entry) => activeEquipment.some((item) => item.category === entry)), ...(library === 'standard' ? ['Custom Items'] : [])]} />
          <FilterSelect label="Subtype" value={subtype} onChange={setSubtype} options={['All', ...subtypeOptions]} />
          <FilterSelect label="Slot" value={slot} onChange={(value) => setSlot(value as typeof slot)} options={['All', ...Object.values(EquipmentSlotValues)]} />
          <FilterSelect label="Source" value={source} onChange={setSource} options={['All', ...sourceOptions]} />
          <FilterSelect label="Range" value={range} onChange={(value) => setRange(value as typeof range)} options={RANGE_FILTERS} />
          <FilterSelect label="Character Access" value={accessFilter} disabled={!character} onChange={(value) => setAccessFilter(value as typeof accessFilter)} options={ACCESS_FILTERS} />
          <FilterSelect label="Attunement" value={attunement} onChange={(value) => setAttunement(value as typeof attunement)} options={['All', 'Required', 'Not required']} />
          <FilterSelect label="Usage" value={uses} onChange={(value) => setUses(value as typeof uses)} options={['All', 'Limited uses', 'Persistent']} />
          <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as typeof sort)} options={['Name A–Z', 'Category', 'Source', 'Character Access']} />
        </div><ToggleChips title="Properties — selected properties all apply" options={propertyOptions} selected={properties} onToggle={toggleFilter(setProperties)} /><ToggleChips title="Mechanical effects — selected effects all apply" options={EFFECT_FILTERS} selected={effects} onToggle={toggleFilter(setEffects)} /><ToggleChips title="Weapon damage types — selected types may apply" options={damageTypeOptions} selected={damageTypes} onToggle={toggleFilter(setDamageTypes)} /><div className="flex justify-end"><button type="button" onClick={resetFilters} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-slate-300">Clear all filters</button></div></div></details>
        {compareIDs.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/15 bg-sky-500/5 p-3"><p className="text-xs font-bold text-sky-100">{compareIDs.length} of 3 comparison slots filled</p><div className="flex gap-2"><button type="button" disabled={compareIDs.length < 2} onClick={() => setShowComparison(true)} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Compare selected</button><button type="button" onClick={() => setCompareIDs([])} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-slate-300">Clear</button></div></div>}
      </section>
      <div className="grid gap-4 lg:min-h-80 lg:flex-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className={`${mobileDetailOpen ? 'hidden lg:block' : 'block'} max-h-none overflow-visible rounded-2xl border border-white/10 bg-slate-950/60 p-3 lg:h-auto lg:min-h-0 lg:overflow-auto lg:overscroll-contain`}><div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg bg-slate-950/95 px-2 py-2 backdrop-blur"><h2 className="theme-accent-text font-black">{library === 'magic' ? 'Magic Items' : 'Equipment'}</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.length === 0 ? <p className="p-5 text-sm text-slate-500">No records match these filters.</p> : filtered.map((item) => { const access = accessByID.get(item.id); const compared = compareIDs.includes(item.id); return <article key={item.id} className={`mb-2 rounded-xl border p-3 transition ${selected?.id === item.id ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}><button type="button" onClick={() => chooseItem(item.id)} className="w-full text-left"><span className="flex items-start justify-between gap-2"><span className="font-bold text-slate-100">{item.name}</span>{access && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${accessTone(access.state)}`}>{access.state}</span>}</span><span className="mt-1 block text-xs text-slate-500">{item.subtype} • {customIDs.has(item.id) ? 'Custom' : item.category}</span><span className="mt-1 line-clamp-2 text-xs text-slate-400">{item.summary}</span></button><button type="button" aria-pressed={compared} onClick={() => toggleCompare(item.id)} className={`mt-2 rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${compared ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 text-slate-500 hover:text-sky-200'}`}>{compared ? '✓ Comparing' : '+ Compare'}</button></article>; })}</aside>
        <main ref={detailRef} className={`${mobileDetailOpen ? 'block' : 'hidden lg:block'} rounded-2xl border border-white/10 bg-slate-900/75 p-3 sm:p-6 lg:h-auto lg:min-h-0 lg:overflow-auto lg:overscroll-contain lg:p-9`}>{selected ? <EquipmentDetail key={selected.id} item={selected} characters={characters} character={character} classReference={classReference} ancestryTraits={ancestryTraits} catalog={allEquipment} targetCharacterID={effectiveTargetCharacterID} setTargetCharacterID={setTargetCharacterID} onAdd={addToCharacter} onCharacterChange={updateCharacter} parties={partyHub.parties} currentUserID={user?.uid ?? ''} onAddToParty={addToParty} onMoveFromParty={moveFromParty} combat={selectedCombat} onCombatChange={updateCombat} notice={notice} isCustom={selectedIsCustom} propertyOptions={Array.from(new Set(allEquipment.flatMap((item) => item.properties))).sort()} onCustomSave={(draft) => saveCustomItem(selected, draft)} onCustomDelete={() => deleteCustomItem(selected)} onBack={backToList} /> : <div className="grid min-h-64 place-items-center text-slate-500">Select an equipment record.</div>}</main>
      </div>
    </div>
    {showComparison && <EquipmentComparison items={comparisonItems} onRemove={(id) => setCompareIDs((current) => current.filter((entry) => entry !== id))} onClose={() => setShowComparison(false)} />}
    {showCustomModal && <CustomItemModal propertyOptions={Array.from(new Set(allEquipment.flatMap((item) => item.properties))).sort()} onCancel={() => setShowCustomModal(false)} onCreate={createCustomItem} />}
  </div>;
}

function FilterSelect({ label, value, options, disabled = false, onChange }: { label: string; value: string; options: readonly string[]; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-slate-200 disabled:opacity-35">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function EquipmentComparison({ items, onRemove, onClose }: { items: EquipmentCatalogItem[]; onRemove: (id: string) => void; onClose: () => void }) {
  const rows = Array.from(new Set(items.flatMap((item) => Object.keys(equipmentComparisonFacts(item)))));
  return <div className="fixed inset-0 z-50 bg-black/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Compare equipment"><div className="mx-auto flex max-h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-900 shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Side-by-side equipment</p><h2 className="text-xl font-black text-white">Compare {items.length} items</h2></div><button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-black text-slate-200">Close</button></header><div className="overflow-auto p-4"><div className="grid min-w-[720px] gap-px overflow-hidden rounded-xl bg-white/10" style={{ gridTemplateColumns: `160px repeat(${Math.max(1, items.length)}, minmax(210px, 1fr))` }}><div className="bg-slate-950 p-3" />{items.map((item) => <div key={item.id} className="bg-slate-950 p-3"><div className="font-black text-white">{item.name}</div><button type="button" onClick={() => onRemove(item.id)} className="mt-2 text-[10px] font-bold uppercase text-red-300">Remove</button></div>)}{rows.map((label) => [<div key={`${label}-label`} className="bg-slate-950/90 p-3 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>, ...items.map((item) => <div key={`${label}-${item.id}`} className="bg-slate-900 p-3 text-sm leading-5 text-slate-300">{equipmentComparisonFacts(item)[label]}</div>)])}</div></div></div></div>;
}

function EquipmentDetail({ item, characters, character, classReference, ancestryTraits, catalog, targetCharacterID, setTargetCharacterID, onAdd, onCharacterChange, parties, currentUserID, onAddToParty, onMoveFromParty, combat, onCombatChange, notice, isCustom, propertyOptions, onCustomSave, onCustomDelete, onBack }: {
  item: EquipmentCatalogItem;
  characters: Character[];
  character: Character | null;
  classReference: ClassReference | null;
  ancestryTraits: AncestryTrait[];
  catalog: EquipmentCatalogItem[];
  targetCharacterID: string;
  setTargetCharacterID: (id: string) => void;
  onAdd: (quantity: number, unitPrice: number) => void;
  onCharacterChange: (character: Character) => void;
  parties: PartyCampaignSnapshot[];
  currentUserID: string;
  onAddToParty: (partyID: string, ownerCharacterID: string, quantity: number, unitPrice: number, spendSharedGold: boolean) => Promise<void>;
  onMoveFromParty: (party: PartyCampaignSnapshot, item: PartyInventoryItem) => Promise<void>;
  combat: SavedCombat | null;
  onCombatChange: (combat: SavedCombat) => void;
  notice: string;
  isCustom: boolean;
  propertyOptions: string[];
  onCustomSave: (draft: CustomItemDraft) => void;
  onCustomDelete: () => void;
  onBack: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const gmParties = parties.filter(({ role }) => isPartyManager(role));
  const [partyID, setPartyID] = useState(gmParties[0]?.id ?? '');
  const [ownerCharacterID, setOwnerCharacterID] = useState('');
  const [spendSharedGold, setSpendSharedGold] = useState(false);
  const weapon = weaponMechanicalProfile(item);
  const defense = defensiveEquipmentProfile(item);
  const potionHealing = healingPotionAmount(item);
  const access = equipmentAccessForCharacter(character, item, classReference, ancestryTraits);
  const provenance = equipmentProvenance(item, isCustom);
  const selectedParty = gmParties.find(({ id }) => id === partyID) ?? null;
  const claimableParties = parties.filter((party) => (isPartyManager(party.role) || party.permissions.playersCanManageInventory) && (isPartyManager(party.role) || party.members.some((member) => member.userId === currentUserID && (member.characterId === character?.id || member.character?.id === character?.id))));
  const partyCopies = claimableParties.flatMap((party) => party.inventory.filter(({ equipmentID, ownerCharacterID }) => equipmentID === item.id && (isPartyManager(party.role) || !ownerCharacterID || ownerCharacterID === character?.id)).map((entry) => ({ party, entry })));
  const displayProperties = item.properties.filter((tag) => !(tag in ROUTED_SHEET_EFFECTS));
  const routedEffects = [
    weapon && `${weapon.baseDamage} ${weapon.damageTypes.join('/')} damage`, weapon && `Range ${weapon.range}`, weapon?.heavyHitDamageBonus ? '+1 damage on Heavy Hits' : '', defense.physicalDefense ? `+${defense.physicalDefense} PD` : '', defense.areaDefense ? `+${defense.areaDefense} AD` : '', defense.physicalDamageReduction ? 'PDR' : '', defense.elementalDamageReduction ? 'EDR' : '', defense.mysticalDamageReduction ? 'MDR' : '', defense.speedPenalty ? `Speed −${defense.speedPenalty}` : '', defense.agilityCheckDisadvantage ? 'DisADV on Agility Checks' : '', item.category === 'Spell Focuses' || item.actsAsSpellFocus ? displayProperties.filter((property) => property !== 'Two-Handed' && !['Guard', 'Heavy'].includes(property)).join(' • ') : '', ...(item.equippedEffects?.conditionalRules ?? []), ...(item.attunedEffects?.resistances?.map((value) => `${value} Resistance while Attuned`) ?? []), ...(item.attunedEffects?.senses?.map((value) => `${value} while Attuned`) ?? []), potionHealing ? `Restores ${potionHealing} HP when consumed` : '', item.name === 'Medicine Kit' ? '5 tracked uses per kit' : '', item.category === 'Trade Tools' ? `Enables ${item.properties[0]} activities` : '',
  ].filter(Boolean) as string[];

  const preview = useMemo(() => {
    if (!character || !classReference) return null;
    const current = deriveCharacter(character, classReference, ancestryTraits, catalog);
    let inventory = character.inventoryItems ?? [];
    if (!inventory.some(({ equipmentID }) => equipmentID === item.id)) inventory = addEquipmentQuantity(inventory, item, 1);
    const target = inventory.find(({ equipmentID }) => equipmentID === item.id);
    if (target && isEquipmentEquippable(item) && !target.isEquipped) inventory = toggleInventoryEquipped(inventory, target.id, catalog);
    const equippedTarget = target ? inventory.find(({ id }) => id === target.id) : null;
    if (equippedTarget?.isEquipped && item.requiresAttunement && !equippedTarget.isAttuned) inventory = toggleInventoryAttuned(inventory, equippedTarget.id, catalog);
    const simulated = { ...character, inventoryItems: inventory };
    return { current, next: deriveCharacter(simulated, classReference, ancestryTraits, catalog) };
  }, [ancestryTraits, catalog, character, classReference, item]);

  return <article className="mx-auto max-w-5xl">
    <button type="button" onClick={onBack} className="sticky top-0 z-20 mb-4 w-full rounded-xl border border-violet-400/20 bg-slate-950/95 px-4 py-3 text-left text-sm font-black text-violet-200 shadow-xl backdrop-blur lg:hidden">← Back to Items & Equipment</button>
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{isCustom ? 'Custom Item' : item.collection === 'Magic' ? `Magic Item • ${item.category}` : item.category}</span>{access && <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${accessTone(access.state)}`}>{access.state}</span>}</div><h2 className="mt-1 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{item.name}</h2><p className="mt-2 text-slate-400">{item.subtype} • {item.slot}</p>{access && <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{access.reason}</p>}</div><div className="min-w-0 grow basis-72 rounded-xl border border-white/8 bg-slate-950/55 p-3 sm:grow-0"><label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Character Inventory</label>{characters.length > 0 ? <><select className={`${inputClass} mt-2 w-full`} value={targetCharacterID} onChange={(event) => setTargetCharacterID(event.target.value)}>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || 'Unnamed Character'}</option>)}</select><div className="mt-2 grid grid-cols-[5rem_1fr] gap-2"><label className="text-[10px] font-black uppercase text-slate-500">Quantity<input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className={`${inputClass} mt-1 w-full text-center`} /></label><label className="text-[10px] font-black uppercase text-slate-500">Table price each<input type="number" min={0} value={unitPrice} onChange={(event) => setUnitPrice(Math.max(0, Number(event.target.value) || 0))} className={`${inputClass} mt-1 w-full`} /></label></div><p className="mt-2 text-[10px] leading-4 text-slate-600">No price is inferred from the catalog. Enter a table price only when your game establishes one. Current gold: {character?.gold ?? 0}.</p><button type="button" onClick={() => onAdd(quantity, unitPrice)} className="btn-primary mt-3 w-full text-sm font-black">Add {quantity} to Inventory{unitPrice > 0 ? ` • ${quantity * unitPrice} Gold` : ''}</button></> : <p className="mt-2 text-sm text-slate-500">Create a character to add this item to an inventory.</p>}</div></div><p className="mt-5 max-w-3xl whitespace-pre-wrap text-lg leading-7 text-violet-100"><RuleAwareText text={item.summary} references={item.ruleReferences} /></p>{item.collection === 'Magic' && <div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniFact label="Magic Power" value={String(item.magicPower ?? '—')} /><MiniFact label={equipmentUsageLabel(item)} value={item.charges === undefined ? 'None' : String(item.charges)} /><MiniFact label="Attunement" value={item.requiresAttunement ? 'Required for marked features' : 'Not required'} /></div>}</section>

    {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{notice}</p>}
    {isCustom && <div className="mt-5"><CustomItemEditor key={item.id} item={item} propertyOptions={propertyOptions} onSave={onCustomSave} onDelete={onCustomDelete} /></div>}
    {preview && <LoadoutPreview current={preview.current} next={preview.next} item={item} />}
    <EquipmentTableControls item={item} character={character} classReference={classReference} ancestryTraits={ancestryTraits} catalog={catalog} combat={combat} onCharacterChange={onCharacterChange} onCombatChange={onCombatChange} />

    <section className="mt-5 rounded-2xl border border-white/8 bg-slate-900/75 p-5 sm:p-6"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Mechanical Rules</h3><div className="mt-4 whitespace-pre-wrap leading-7 text-slate-300"><RuleAwareText text={item.mechanics} references={item.ruleReferences} /></div></section>
    {item.magicFeatures && item.magicFeatures.length > 0 && <section className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-950/15 p-5 sm:p-6"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-amber-300">Magic Properties</h3><div className="mt-4 space-y-3">{item.magicFeatures.map((feature) => <article key={feature.name} className="rounded-xl border border-amber-300/10 bg-slate-950/45 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-black text-amber-100">{feature.name} <span className="text-amber-300/70">({feature.power})</span></h4><div className="flex gap-2">{feature.requiresAttunement && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-black uppercase text-violet-200">While Attuned</span>}{feature.chargeCost !== undefined && <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-black uppercase text-sky-200">{feature.chargeCost} Charge{feature.chargeCost === 1 ? '' : 's'}</span>}</div></div><div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300"><RuleAwareText text={feature.description} references={item.ruleReferences} /></div></article>)}</div></section>}
    {routedEffects.length > 0 && <section className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-950/15 p-5 sm:p-6"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">Routed Character-Sheet Effects</h3><p className="mt-2 text-xs leading-5 text-slate-500">These effects become active when the item is equipped and any required Training or Attunement is met, or when its use action is taken for carried supplies.</p><div className="mt-4 flex flex-wrap gap-2">{routedEffects.map((effect) => <span key={effect} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-100">{effect}</span>)}</div></section>}
    <div className="mt-5 grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Properties</h3><div className="mt-3 flex flex-wrap gap-2">{displayProperties.length > 0 ? displayProperties.map((property) => <span key={property} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200"><ExplicitRuleLink ruleID={weaponPropertyRuleID(property, item.category)}>{property}</ExplicitRuleLink></span>) : <span className="text-sm text-slate-600">No additional properties.</span>}</div></section><section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Inventory Behavior</h3><div className="mt-3 grid grid-cols-2 gap-3"><MiniFact label="Slot" value={item.slot} /><MiniFact label="Equippable" value={isEquipmentEquippable(item) ? 'Yes' : 'No — carried'} /></div></section></div>
    <section className={`mt-5 rounded-2xl border p-5 ${provenanceTone(provenance.status)}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Source provenance</p><h3 className="mt-1 font-black">{provenance.sourceDocument}</h3><p className="mt-1 text-sm opacity-85">{provenance.sourcePage}</p></div><span className="rounded-full bg-black/15 px-3 py-1 text-[10px] font-black uppercase">{provenance.status}</span></div><p className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 opacity-85">{provenance.metadataStatus}</p></section>
    <section className="mt-5 rounded-2xl border border-sky-400/15 bg-sky-950/15 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Campaign distribution</p>
      <h3 className="mt-1 text-xl font-black text-white">Party loot and ownership</h3>
      {gmParties.length > 0 ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-black uppercase text-slate-500">GM Campaign<select value={partyID} onChange={(event) => { setPartyID(event.target.value); setOwnerCharacterID(''); }} className={`${inputClass} mt-1 w-full`}>{gmParties.map((party) => <option key={party.id} value={party.id}>{party.name} • {party.gold} shared gold</option>)}</select></label><label className="text-[10px] font-black uppercase text-slate-500">Assigned owner<select value={ownerCharacterID} onChange={(event) => setOwnerCharacterID(event.target.value)} className={`${inputClass} mt-1 w-full`}><option value="">Unassigned party loot</option>{selectedParty?.members.flatMap((member) => member.character ? [<option key={member.userId} value={member.character.id}>{member.character.name} • {member.displayName}</option>] : [])}</select></label></div>
        <label className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950/45 p-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={spendSharedGold} disabled={unitPrice <= 0} onChange={(event) => setSpendSharedGold(event.target.checked)} />Subtract the {quantity * unitPrice} gold table price from the shared balance</label>
        <button type="button" onClick={() => void onAddToParty(partyID, ownerCharacterID, quantity, unitPrice, spendSharedGold)} className="mt-3 w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-black text-white">Add {quantity} to {selectedParty?.name ?? 'Campaign'}</button>
      </> : <p className="mt-3 text-sm leading-6 text-slate-500">Only campaign GMs can send or assign new catalog items. Players can claim matching unassigned loot below.</p>}
      {partyCopies.length > 0 && character && <div className="mt-4 border-t border-sky-400/10 pt-4"><p className="text-xs font-black uppercase text-sky-200">Matching party loot</p><div className="mt-2 space-y-2">{partyCopies.map(({ party, entry }) => <div key={`${party.id}-${entry.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950/45 p-3 text-sm"><span className="text-slate-300">{party.name} • {entry.quantity} available{entry.ownerName ? ` • ${entry.ownerName}` : ''}</span><button type="button" onClick={() => void onMoveFromParty(party, entry)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Move 1 to {character.name}</button></div>)}</div></div>}
      <p className="mt-3 text-[10px] text-slate-600">GM-distributed records include a portable item snapshot so players and read-only sheets retain the item’s name, rules, and mechanics.</p>{!currentUserID && <p className="mt-2 text-xs font-bold text-amber-200">Sign in to synchronize party inventory between devices.</p>}
    </section>
  </article>;
}

function LoadoutPreview({ current, next, item }: { current: ReturnType<typeof deriveCharacter>; next: ReturnType<typeof deriveCharacter>; item: EquipmentCatalogItem }) {
  const values: Array<[string, number, number]> = [['Physical Defense', current.physicalDefense, next.physicalDefense], ['Area Defense', current.arcaneDefense, next.arcaneDefense], ['Speed', current.speed, next.speed], ['Maximum HP', current.maxHP, next.maxHP], ['Maximum SP', current.maxStamina, next.maxStamina], ['Maximum MP', current.maxMana, next.maxMana], ['Martial Check', current.martialCheck, next.martialCheck], ['Spell Check', current.spellCheck, next.spellCheck], ['Save DC', current.saveDC, next.saveDC]];
  return <section className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-950/15 p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Character-aware loadout preview</p><h3 className="mt-1 text-xl font-black text-white">If {item.name} is equipped{item.requiresAttunement ? ' and attuned' : ''}</h3><p className="mt-2 text-xs leading-5 text-slate-500">This preview uses the character’s current class, Training, Traits, equipment slots, hand limits, and active item effects. Unchanged values remain visible for context.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{values.map(([label, before, after]) => <DeltaFact key={label} label={label} before={before} after={after} />)}</div><div className="mt-3 grid gap-2 sm:grid-cols-3"><DeltaFact label="Physical DR" before={current.physicalDR} after={next.physicalDR} boolean /><DeltaFact label="Elemental DR" before={current.elementalDR} after={next.elementalDR} boolean /><DeltaFact label="Mystical DR" before={current.mysticalDR} after={next.mysticalDR} boolean /></div></section>;
}

function DeltaFact({ label, before, after, boolean = false }: { label: string; before: number; after: number; boolean?: boolean }) {
  const changed = before !== after;
  const value = boolean ? `${before ? 'Yes' : 'No'} → ${after ? 'Yes' : 'No'}` : `${before} → ${after}${changed ? ` (${after > before ? '+' : ''}${after - before})` : ''}`;
  return <div className={`rounded-xl border p-3 ${changed ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/5 bg-slate-950/45'}`}><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 font-black ${changed ? 'text-emerald-100' : 'text-slate-300'}`}>{value}</div></div>;
}

function EquipmentTableControls({ item, character, classReference, ancestryTraits, catalog, combat, onCharacterChange, onCombatChange }: { item: EquipmentCatalogItem; character: Character | null; classReference: ClassReference | null; ancestryTraits: AncestryTrait[]; catalog: EquipmentCatalogItem[]; combat: SavedCombat | null; onCharacterChange: (character: Character) => void; onCombatChange: (combat: SavedCombat) => void }) {
  const [result, setResult] = useState('');
  const matches = character?.inventoryItems?.filter(({ equipmentID }) => equipmentID === item.id) ?? [];
  const weapon = weaponMechanicalProfile(item);
  const capacity = equipmentUseCapacity(item);
  const modifiers = character && classReference ? equippedCombatModifiers(character, catalog, classReference, ancestryTraits) : null;
  const derived = character && classReference ? deriveCharacter(character, classReference, ancestryTraits, catalog) : null;
  const record = (text: string, kind: 'Note' | 'Healing' | 'Resource') => {
    if (!combat) return;
    onCombatChange({ ...combat, history: [...(combat.history ?? []), { id: generateUUID(), timestamp: new Date().toISOString(), round: combat.round, kind, text, private: false }] });
  };
  const commitInventory = (items: NonNullable<Character['inventoryItems']>, extra: Partial<Character> = {}) => {
    if (!character) return;
    onCharacterChange({ ...applyInventoryChange(character, items, catalog, classReference, ancestryTraits), ...extra });
  };
  const rollWeapon = () => {
    if (!character || !weapon || !derived || !modifiers || !matches.some(({ isEquipped }) => isEquipped)) return;
    const adjustment = (character.build?.rollAdjustment ?? 0) + modifiers.attackAndSpellDisadvantage;
    const roll = rollD20WithAdjustment(adjustment);
    const total = roll.chosen + derived.martialCheck;
    const damage = weapon.baseDamage + modifiers.weaponDamageBonus;
    const text = `${character.name} rolled ${item.name}: ${roll.rolls.join(', ')} → ${total} (${derived.martialCheck >= 0 ? '+' : ''}${derived.martialCheck}); damage ${damage}${weapon.heavyHitDamageBonus ? `, +${weapon.heavyHitDamageBonus} on a Heavy Hit` : ''}.`;
    setResult(text); record(text, 'Note');
  };
  const consumeItem = (inventoryID: string) => {
    if (!character) return;
    const inventory = matches.find(({ id }) => id === inventoryID);
    if (!inventory) return;
    const remaining = inventory.remainingUses ?? (capacity === undefined ? undefined : inventory.quantity * capacity);
    if (remaining !== undefined && remaining <= 0) return;
    let items = character.inventoryItems ?? [];
    if (capacity === 1) items = consumeInventoryQuantity(spendInventoryUse(items, inventoryID, 1), inventoryID);
    else if (item.properties.includes('Consumable') && capacity === undefined) items = consumeInventoryQuantity(items, inventoryID);
    else if (capacity !== undefined) items = spendInventoryUse(items, inventoryID, capacity);
    const healed = healingPotionAmount(item);
    const nextHP = healed ? Math.min(character.maxHealthPoints, character.healthPoints + healed) : character.healthPoints;
    const text = `${character.name} used ${item.name}${healed ? ` and restored ${nextHP - character.healthPoints} HP` : ''}.`;
    commitInventory(items, { healthPoints: nextHP }); setResult(text); record(text, healed ? 'Healing' : 'Resource');
  };
  return <section className="mt-5 rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-950/20 to-slate-950/55 p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Table-ready controls</p><h3 className="mt-1 text-xl font-black text-white">Equip, roll, and track uses</h3>{!character ? <p className="mt-3 text-sm text-slate-500">Choose a character to enable live controls.</p> : matches.length === 0 ? <p className="mt-3 text-sm text-slate-500">Add this item to {character.name} to enable its controls.</p> : <div className="mt-4 space-y-3">{matches.map((inventory) => <div key={inventory.id} className="rounded-xl border border-white/8 bg-slate-950/50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-black text-slate-100">{item.name} ×{inventory.quantity}</span>{inventory.remainingUses !== undefined && <span className="ml-2 text-xs font-bold text-sky-200">{inventory.remainingUses} {equipmentUsageLabel(item).toLowerCase()} left</span>}</div><div className="flex flex-wrap gap-2">{isEquipmentEquippable(item) && <button type="button" onClick={() => commitInventory(toggleInventoryEquipped(character.inventoryItems ?? [], inventory.id, catalog))} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">{inventory.isEquipped ? 'Stow' : 'Equip'}</button>}{item.requiresAttunement && <button type="button" disabled={!inventory.isEquipped} onClick={() => commitInventory(toggleInventoryAttuned(character.inventoryItems ?? [], inventory.id, catalog))} className="rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{inventory.isAttuned ? 'End Attunement' : 'Attune'}</button>}{(capacity !== undefined || item.properties.includes('Consumable')) && <button type="button" disabled={(inventory.remainingUses ?? (capacity === undefined ? inventory.quantity : inventory.quantity * capacity)) <= 0} onClick={() => consumeItem(inventory.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Use {equipmentUsageLabel(item) === 'Charges' ? '1 Charge' : 'Item'}</button>}</div></div></div>)}{weapon && <button type="button" disabled={!matches.some(({ isEquipped }) => isEquipped)} onClick={rollWeapon} className="w-full rounded-xl bg-orange-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Roll {item.name} Attack{derived ? ` • ${derived.martialCheck >= 0 ? '+' : ''}${derived.martialCheck}` : ''}</button>}{combat && <p className="text-[10px] text-slate-600">Uses and rolls are also recorded in {combat.name}’s history.</p>}</div>}{result && <p role="status" className="mt-3 rounded-lg border border-orange-400/15 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-100">{result}</p>}</section>;
}

function CustomItemModal({ propertyOptions, onCancel, onCreate }: { propertyOptions: string[]; onCancel: () => void; onCreate: (draft: CustomItemDraft) => void }) {
  const [draft, setDraft] = useState<CustomItemDraft>(emptyDraft());
  const update = (values: Partial<CustomItemDraft>) => setDraft((current) => ({ ...current, ...values }));
  const toggleProperty = (value: string) => setDraft((current) => ({ ...current, properties: toggleValue(current.properties, value) }));
  const toggleRoutedEffect = (value: string) => setDraft((current) => ({ ...current, routedEffects: toggleValue(current.routedEffects, value) }));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Create Custom Item"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-400/20 bg-slate-900 p-6 shadow-2xl"><h2 className="text-lg font-black text-violet-200">Create Custom Item</h2><label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Item name" /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Highlight (Optional)<input className={`${inputClass} mt-1 w-full`} value={draft.highlight} onChange={(event) => update({ highlight: event.target.value })} placeholder="A short standout detail…" /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea className={`${inputClass} mt-1 min-h-24 w-full resize-y`} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="What the item is or does…" /></label><RuleLinkInspector text={draft.description} references={draft.ruleReferences} onChange={(ruleReferences) => update({ ruleReferences })} /><div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category<select className={`${inputClass} mt-1 w-full`} value={draft.category} onChange={(event) => update({ category: event.target.value as EquipmentCategory })}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Slot<select className={`${inputClass} mt-1 w-full`} value={draft.slot} onChange={(event) => update({ slot: event.target.value as EquipmentSlot })}>{Object.values(EquipmentSlotValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div><PillMultiSelect label="Properties" hint="Some Properties apply automatic effects — e.g. Weapons: Guard; Spell Focuses: Channeling, Vicious, Powerful, Protective, Warded." options={propertyOptions} selected={draft.properties} onToggle={toggleProperty} /><PillMultiSelect label="Routed-Character Sheet Effects" hint="Applies while the item is equipped, no matter its Category." options={ROUTED_EFFECT_NAMES} selected={draft.routedEffects} onToggle={toggleRoutedEffect} tone="emerald" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Cancel</button><button type="button" disabled={!draft.name.trim()} onClick={() => onCreate(draft)} className="btn-primary px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35">Create Item</button></div></div></div>;
}

function CustomItemEditor({ item, propertyOptions, onSave, onDelete }: { item: EquipmentCatalogItem; propertyOptions: string[]; onSave: (draft: CustomItemDraft) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState<CustomItemDraft>(() => draftFromItem(item));
  const [saved, setSaved] = useState(false);
  const update = (values: Partial<CustomItemDraft>) => { setDraft((current) => ({ ...current, ...values })); setSaved(false); };
  const toggleProperty = (value: string) => { setDraft((current) => ({ ...current, properties: toggleValue(current.properties, value) })); setSaved(false); };
  const toggleRoutedEffect = (value: string) => { setDraft((current) => ({ ...current, routedEffects: toggleValue(current.routedEffects, value) })); setSaved(false); };
  const save = () => { if (!draft.name.trim()) return; onSave(draft); setSaved(true); };
  return <section className="rounded-2xl border border-violet-400/20 bg-violet-950/20 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Edit Custom Item</h3><p className="mt-1 text-xs text-slate-500">Choose Category, Slot, Properties, and Routed-Character Sheet Effects to have this item behave like Standard Equipment.</p></div><button type="button" onClick={onDelete} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">Delete Item</button></div><label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Highlight (Optional)<input className={`${inputClass} mt-1 w-full`} value={draft.highlight} onChange={(event) => update({ highlight: event.target.value })} placeholder="A short standout detail…" /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea className={`${inputClass} mt-1 min-h-28 w-full resize-y`} value={draft.description} onChange={(event) => update({ description: event.target.value })} /></label><RuleLinkInspector text={draft.description} references={draft.ruleReferences} onChange={(ruleReferences) => update({ ruleReferences })} /><div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category<select className={`${inputClass} mt-1 w-full`} value={draft.category} onChange={(event) => update({ category: event.target.value as EquipmentCategory })}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Slot<select className={`${inputClass} mt-1 w-full`} value={draft.slot} onChange={(event) => update({ slot: event.target.value as EquipmentSlot })}>{Object.values(EquipmentSlotValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div><PillMultiSelect label="Properties" hint="Some Properties apply automatic effects — e.g. Weapons: Guard; Spell Focuses: Channeling, Vicious, Powerful, Protective, Warded." options={propertyOptions} selected={draft.properties} onToggle={toggleProperty} /><PillMultiSelect label="Routed-Character Sheet Effects" hint="Applies while the item is equipped, no matter its Category." options={ROUTED_EFFECT_NAMES} selected={draft.routedEffects} onToggle={toggleRoutedEffect} tone="emerald" /><div className="mt-4 flex items-center justify-end gap-3">{saved && <span className="text-xs font-bold text-emerald-300">Saved</span>}<button type="button" disabled={!draft.name.trim()} onClick={save} className="btn-primary px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35">Save Changes</button></div></section>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-200">{value}</div></div>;
}
