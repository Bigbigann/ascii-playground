'use client';

import { useState } from 'react';
import { FilledBarSlider } from '@/components/ui/filled-bar-slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronDown } from 'lucide-react';
import { CHARSET_OPTIONS, COLOR_MODE_OPTIONS, CUSTOM_CHAR_PRESETS, DUOTONE_PRESETS, MONO_COLOR_PRESETS, type ASCIISettings, type ColorMode } from '@/lib/ascii/presets';
import { useSavedCharacters, type SavedCharset } from '@/hooks/use-saved-characters';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  settings: ASCIISettings;
  onSettingsChange: (settings: ASCIISettings) => void;
  showPlaybackSpeed?: boolean;
}

// Collapsible section component
function Section({ 
  title, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
          {title}
        </span>
        <ChevronDown 
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        <div className="space-y-2.5 pt-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Compact control row
function ControlRow({ 
  label, 
  value, 
  children 
}: { 
  label: string; 
  value?: string | number; 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-foreground/70">{label}</span>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <span className="text-[11px] text-muted-foreground tabular-nums min-w-[32px] text-right">
            {value}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

export function ControlPanel({ settings, onSettingsChange, showPlaybackSpeed = false }: ControlPanelProps) {
  const { savedCharsets, saveCharset, deleteCharset } = useSavedCharacters();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const updateSetting = <K extends keyof ASCIISettings>(
    key: K,
    value: ASCIISettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleSaveCharset = () => {
    if (settings.customChars.trim()) {
      saveCharset(saveName, settings.customChars);
      setSaveName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoadSavedCharset = (charset: SavedCharset) => {
    updateSetting('customChars', charset.chars);
  };

  return (
    <div className="divide-y divide-border/50">
      {/* Characters Section */}
      <Section title="Characters" defaultOpen={true}>
        <ControlRow label="Style">
          <Select
            value={settings.charset}
            onValueChange={(value) => updateSetting('charset', value as ASCIISettings['charset'])}
          >
            <SelectTrigger className="w-28 h-7 text-xs border-0 bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHARSET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlRow>

        {settings.charset === 'custom' && (
          <>
            <ControlRow label="Preset">
              <Select
                value={CUSTOM_CHAR_PRESETS.some(p => p.value === settings.customChars) ? settings.customChars : 'custom'}
                onValueChange={(value) => {
                  if (value !== 'custom') {
                    updateSetting('customChars', value);
                  }
                }}
              >
                <SelectTrigger className="w-28 h-7 text-xs border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_CHAR_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value} className="text-xs">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlRow>

            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input
                  value={settings.customChars}
                  onChange={(e) => updateSetting('customChars', e.target.value)}
                  placeholder=" .:-=+*#%@"
                  className="h-7 text-xs font-mono flex-1 border-0 bg-muted/50"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!settings.customChars.trim()}
                >
                  Save
                </Button>
              </div>
            </div>

            {savedCharsets.length > 0 && (
              <div className="space-y-1">
                {savedCharsets.map((charset) => (
                  <div
                    key={charset.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      className="flex-1 text-left text-[11px] font-mono truncate text-muted-foreground hover:text-foreground"
                      onClick={() => handleLoadSavedCharset(charset)}
                    >
                      <span className="text-foreground/60">{charset.name}:</span>{' '}
                      <span>{charset.chars}</span>
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all p-0.5"
                      onClick={() => deleteCharset(charset.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <FilledBarSlider
          label="Resolution"
          value={settings.resolution}
          min={50}
          max={400}
          step={10}
          onChange={(v) => updateSetting('resolution', v)}
        />

        <ControlRow label="Color">
          <Select
            value={settings.colorMode}
            onValueChange={(value) => updateSetting('colorMode', value as ColorMode)}
          >
            <SelectTrigger className="w-28 h-7 text-xs border-0 bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlRow>

        {settings.colorMode === 'mono' && (
          <>
            <ControlRow label="Theme">
              <Select
                value={settings.monoPreset ?? 'classic'}
                onValueChange={(value) => {
                  const preset = MONO_COLOR_PRESETS.find(p => p.value === value);
                  if (preset && value !== 'custom') {
                    onSettingsChange({
                      ...settings,
                      monoPreset: value,
                      monoBgColor: preset.bg,
                      monoCharColor: preset.char,
                    });
                  } else {
                    updateSetting('monoPreset', value);
                  }
                }}
              >
                <SelectTrigger className="w-28 h-7 text-xs border-0 bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONO_COLOR_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20" 
                          style={{ background: preset.char }}
                        />
                        {preset.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlRow>

            {(settings.monoPreset ?? 'classic') === 'custom' && (
              <>
                <ControlRow label="Background">
                  <input
                    type="color"
                    value={settings.monoBgColor ?? '#0a0a0a'}
                    onChange={(e) => updateSetting('monoBgColor', e.target.value)}
                    className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                </ControlRow>
                <ControlRow label="Characters">
                  <input
                    type="color"
                    value={settings.monoCharColor ?? '#4ade80'}
                    onChange={(e) => updateSetting('monoCharColor', e.target.value)}
                    className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                </ControlRow>
              </>
            )}
          </>
        )}

        {settings.colorMode === 'duotone' && (
          <ControlRow label="Palette">
            <Select
              value={settings.duotonePreset}
              onValueChange={(value) => updateSetting('duotonePreset', value)}
            >
              <SelectTrigger className="w-28 h-7 text-xs border-0 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUOTONE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ background: `linear-gradient(135deg, ${preset.dark} 50%, ${preset.light} 50%)` }}
                      />
                      {preset.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>
        )}

        <FilledBarSlider
          label="Char Opacity"
          value={settings.charOpacity ?? 100}
          min={10}
          max={100}
          step={5}
          formatValue={(n) => `${n}%`}
          onChange={(v) => updateSetting('charOpacity', v)}
        />

        <ControlRow label="Invert">
          <Switch
            checked={settings.invert}
            onCheckedChange={(checked) => updateSetting('invert', checked)}
          />
        </ControlRow>
      </Section>

      {/* Glow Section */}
      <Section title="Glow" defaultOpen={true}>
        <ControlRow label="Enable">
          <Switch
            checked={settings.glowEnabled ?? false}
            onCheckedChange={(checked) => updateSetting('glowEnabled', checked)}
          />
        </ControlRow>

        {(settings.glowEnabled ?? false) && (
          <>
            <FilledBarSlider
              label="Intensity"
              value={settings.glowIntensity ?? 50}
              min={10}
              max={100}
              step={5}
              formatValue={(n) => `${n}%`}
              onChange={(v) => updateSetting('glowIntensity', v)}
            />

            <FilledBarSlider
              label="Size"
              value={settings.glowSize ?? 8}
              min={2}
              max={20}
              step={1}
              formatValue={(n) => `${n}px`}
              onChange={(v) => updateSetting('glowSize', v)}
            />
          </>
        )}
      </Section>

      {/* Intensity Section */}
      <Section title="Intensity" defaultOpen={true}>
        <FilledBarSlider
          label="Brightness"
          value={settings.brightness}
          min={-100}
          max={100}
          step={5}
          onChange={(v) => updateSetting('brightness', v)}
        />

        <FilledBarSlider
          label="Contrast"
          value={settings.contrast}
          min={-100}
          max={100}
          step={5}
          onChange={(v) => updateSetting('contrast', v)}
        />
      </Section>

      {/* Playback Section - only for video */}
      {showPlaybackSpeed && (
        <Section title="Playback" defaultOpen={true}>
          <FilledBarSlider
            label="Speed"
            value={settings.playbackSpeed}
            min={0.25}
            max={2}
            step={0.25}
            formatValue={(n) => `${n}x`}
            onChange={(v) => updateSetting('playbackSpeed', v)}
          />
        </Section>
      )}

      {/* Save Character Set Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Save Characters</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My preset"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Characters</label>
              <div className="px-2 py-1.5 bg-muted/50 rounded text-xs font-mono text-foreground/70">
                {settings.customChars || '(empty)'}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCharset}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
