"use client";

import { SceneDisplaySettings, SubjectType, VIEW_OPTIONS, VideoProject, ViewMode } from "@/lib/shot/types";
import { SUBJECT_OPTIONS, SUBJECTS } from "@/lib/shot/subjects";
import { panelClass, panelTitleClass, fieldLabelClass } from "@/lib/shot/ui";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface SceneSettingsPanelProps {
  project: VideoProject;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onSubjectTypeChange: (type: SubjectType) => void;
  onSubjectScaleChange: (scale: number) => void;
  display: SceneDisplaySettings;
  onDisplayChange: (next: Partial<SceneDisplaySettings>) => void;
}

export default function SceneSettingsPanel({
  project,
  view,
  onViewChange,
  onSubjectTypeChange,
  onSubjectScaleChange,
  display,
  onDisplayChange,
}: SceneSettingsPanelProps) {
  return (
    <section className={panelClass}>
      <h2 className={panelTitleClass}>Scene</h2>

      <div className="mb-3 flex items-center justify-between gap-3">
        <label className={fieldLabelClass}>View</label>
        <div className="w-[190px]">
          <Select value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <label className={fieldLabelClass}>Subject</label>
        <div className="w-[190px]">
          <Select value={project.subjectType} onValueChange={(v) => onSubjectTypeChange(v as SubjectType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {SUBJECTS[opt].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <label className={fieldLabelClass} htmlFor="subject-scale">
          Scale
        </label>
        <div className="w-[190px]">
          <Input
            id="subject-scale"
            type="number"
            min={0.1}
            max={5}
            step={0.05}
            value={project.subjectScale}
            onChange={(e) => onSubjectScaleChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <ToggleRow
          label="Grid"
          checked={display.showGrid}
          onChange={(v) => onDisplayChange({ showGrid: v })}
        />
        <ToggleRow
          label="Camera path"
          checked={display.showPath}
          onChange={(v) => onDisplayChange({ showPath: v })}
        />
        <ToggleRow
          label="Camera frustum"
          checked={display.showFrustum}
          onChange={(v) => onDisplayChange({ showFrustum: v })}
        />
        <ToggleRow
          label="Clay shading"
          checked={display.clayShading}
          onChange={(v) => onDisplayChange({ clayShading: v })}
        />
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-foreground/90">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
