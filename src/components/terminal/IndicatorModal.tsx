import React, { useState, useMemo } from 'react';
import { IndicatorInstance, IndicatorType } from '../../types/market';
import { INDICATOR_CATALOG, IndicatorDefinition } from '../../data/indicators';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { X, Search, Plus, Eye, EyeOff, Settings, Trash2, Layers, BarChart2 } from 'lucide-react';
import { tl, fmt, getActiveLang } from '../../i18n/locales';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances?: IndicatorInstance[];
  onAddInstance?: (instance: IndicatorInstance) => void;
  onUpdateInstance?: (instance: IndicatorInstance) => void;
  onRemoveInstance?: (instanceId: string) => void;
  indicators?: any;
  onChange?: (updated: any) => void;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  instances = [],
  onAddInstance = () => {},
  onUpdateInstance = () => {},
  onRemoveInstance = () => {},
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'overlay' | 'oscillator' | 'active'>('all');
  const [editingIndicator, setEditingIndicator] = useState<IndicatorInstance | null>(null);

  const filteredCatalog = useMemo(() => {
    return INDICATOR_CATALOG.filter((item) => {
      // Tab filter
      if (activeTab === 'overlay' && item.pane !== 'main') return false;
      if (activeTab === 'oscillator' && item.pane !== 'sub') return false;

      // Text search (Arabic + English + Type)
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.nameAr.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [search, activeTab]);

  if (!isOpen) return null;

  const handleAdd = (def: IndicatorDefinition) => {
    // Check sub-pane limit: maximum 3 visible sub-pane oscillators
    if (def.pane === 'sub') {
      const activeSubPanes = instances.filter((i) => i.pane === 'sub' && i.visible);
      if (activeSubPanes.length >= 3) {
        alert(tl().tm_49);
        return;
      }
    }

    // Generate unique ID and appropriate default name
    const existingCount = instances.filter((i) => i.type === def.type).length;
    let labelParams = '';
    if (def.type === 'ema' || def.type === 'sma' || def.type === 'wma' || def.type === 'rsi') {
      const p = def.defaultParams.period || 20;
      labelParams = ` ${p}`;
    }

    const newInst: IndicatorInstance = {
      id: `ind-${def.type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: def.type,
      name: `${def.name.split(' ')[0]}${labelParams}`,
      nameAr: def.nameAr,
      params: { ...def.defaultParams },
      color: existingCount === 1 && def.type === 'ema' ? '#F59E0B' : def.defaultColor,
      visible: true,
      pane: def.pane,
    };

    onAddInstance(newInst);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[520px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E283D] bg-[#0A101D]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2DD4BF]" />
            <h3 className="font-bold text-sm text-[#E8EEF9]">{tl().tm_50}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="p-3 border-b border-[#1E283D] bg-[#0B1322] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tl().tm_51}
              className="w-full pr-9 pl-3 py-2 bg-[#121A2B] border border-[#243049] rounded-lg text-xs text-[#E8EEF9] placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-2.5 text-[#7B8DA8] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]'
              }`}
            >
              {tl().mx_all} ({INDICATOR_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveTab('overlay')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'overlay'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]'
              }`}
            >
              {tl().mx_overlays}
            </button>
            <button
              onClick={() => setActiveTab('oscillator')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'oscillator'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]'
              }`}
            >
              {tl().mx_oscillators}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ml-auto ${
                activeTab === 'active'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]'
              }`}
            >
              {tl().mx_activeIndShort} ({instances.length})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[480px]">
          {activeTab === 'active' ? (
            /* Active Indicators Tab */
            instances.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                {tl().tm_53}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-[#7B8DA8] px-1 font-semibold">
                  {tl().mx_appliedHelp}
                </div>
                {instances.map((inst) => {
                  const paramStr = Object.entries(inst.params)
                    .map(([_, v]) => v)
                    .join(', ');
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141E30] border border-[#243049] hover:border-[#334155] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: inst.color }}
                        />
                        <div>
                          <div className="font-bold text-[#E8EEF9] text-xs">
                            {getActiveLang() === 'ar' ? inst.nameAr || inst.name : inst.name}
                            {paramStr ? ` (${paramStr})` : ''}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {inst.pane === 'main' ? tl().tm_54 : tl().tm_55}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateInstance({ ...inst, visible: !inst.visible })}
                          title={inst.visible ? tl().tm_56 : tl().tm_57}
                          className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                        >
                          {inst.visible ? (
                            <Eye className="w-3.5 h-3.5 text-[#2DD4BF]" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingIndicator(inst)}
                          title={tl().tm_58}
                          className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-white transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveInstance(inst.id)}
                          title={tl().tm_59}
                          className="p-1.5 rounded hover:bg-[#1E293B] text-[#7B8DA8] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Catalog List */
            filteredCatalog.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                {tl().tm_60}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredCatalog.map((def) => {
                  const addedCount = instances.filter((i) => i.type === def.type).length;
                  return (
                    <div
                      key={def.type}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141E30] border border-[#243049]/60 hover:border-[#2DD4BF]/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: def.defaultColor }}
                        />
                        <div>
                          <div className="font-bold text-[#E8EEF9] text-xs group-hover:text-[#2DD4BF] transition-colors">
                            {getActiveLang() === 'ar' ? def.nameAr : def.name}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            {def.name} ({def.pane === 'main' ? 'Overlay' : 'Oscillator'})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {addedCount > 0 && (
                          <span className="text-[10px] font-mono bg-[#1E293B] text-[#2DD4BF] px-1.5 py-0.5 rounded">
                            {tl().mx_enabled} ({addedCount})
                          </span>
                        )}
                        <button
                          onClick={() => handleAdd(def)}
                          title={tl().tm_61}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C2E4A] hover:bg-[#2DD4BF] text-[#2DD4BF] hover:text-[#042F2E] font-bold text-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {tl().tm_62}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E283D] bg-[#0A101D] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B]">
            {tl().mx_multiHelp}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs transition-colors"
          >
            {tl().tm_32}
          </button>
        </div>
      </div>

      {/* Editing Dialog for an indicator */}
      {editingIndicator && (
        <IndicatorSettingsModal
          isOpen={Boolean(editingIndicator)}
          indicator={editingIndicator}
          onClose={() => setEditingIndicator(null)}
          onSave={(updated) => {
            onUpdateInstance(updated);
            setEditingIndicator(null);
          }}
        />
      )}
    </div>
  );
};
