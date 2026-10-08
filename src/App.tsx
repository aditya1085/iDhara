import React, { useEffect, useMemo, useState } from 'react';
import { ContextInspectorPanel } from './components/ContextInspectorPanel';
import { IndoreFloodMap, MapInspectionTarget } from './components/IndoreFloodMap';
import { ModuleWorkspace } from './components/ModuleWorkspaces';
import { MODE_META } from './components/SeverityVisuals';
import { PILOT_SCOPE_ID } from './data/indorePilotData';
import { generateOperationalAlerts } from './modules/alerts';
import { ingestSensorTelemetry, wrapInEnvelope } from './modules/dataIngestion';
import { evaluateDataHealth } from './modules/dataQuality';
import { evaluateSheltersAndEvacuation } from './modules/evacuation';
import { getPresetById, resolveTimelineStepParameters } from './modules/historicalReplay';
import { predictFloodRiskGrid } from './modules/prediction';
import { evaluateRoadNetworkState } from './modules/roadState';
import { computeRouteRecommendations } from './modules/routing';
import { generateValidationReport } from './modules/validation';
import {
  DisasterStage,
  NavigationTab,
  ProductMode,
  ScenarioParameters,
  UserRole,
} from './types/idhara';

const NAV_ITEMS: Array<{ id: NavigationTab; label: string; shortBadge?: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk-map', label: 'Risk Map' },
  { id: 'disaster-twin', label: 'Disaster Twin', shortBadge: '4-Stage' },
  { id: 'roads-routing', label: 'Roads & Routing' },
  { id: 'evacuation', label: 'Evacuation' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'event-replay', label: 'Event Replay' },
  { id: 'validation', label: 'Validation' },
  { id: 'data-health', label: 'Data Health' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.CONTROL_ROOM_OPERATOR);

  const [params, setParams] = useState<ScenarioParameters>({
    mode: ProductMode.SIMULATED,
    stage: DisasterStage.REAL_TIME_ONGOING,
    rainfallIntensityMmHr: 62,
    durationHours: 3,
    drainageBlockagePct: 40,
    upstreamKahnInflowMultiplier: 1.25,
    sensorDropoutCount: 0,
    timelineHourOffset: 0,
    activeEventPresetId: 'EVT-SIM-MONSOON-SURGE',
  });

  const [selectedTarget, setSelectedTarget] = useState<MapInspectionTarget>({
    type: 'CELL',
    id: 'CELL-R2C2', // Krishnapura Confluence hotspot
  });

  const [customOriginId, setCustomOriginId] = useState<string>('NODE-RAJWADA');
  const [customDestId, setCustomDestId] = useState<string>('NODE-MY-HOSPITAL');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('RTE-AMB-RAJWADA-MYH');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);

  // Modular Service Pipeline Execution (Deterministic & Memoized)
  const sensors = useMemo(() => ingestSensorTelemetry(params), [params]);

  const cells = useMemo(
    () => predictFloodRiskGrid(params, sensors),
    [params, sensors]
  );

  const roads = useMemo(
    () => evaluateRoadNetworkState(cells, sensors, params),
    [cells, sensors, params]
  );

  const routes = useMemo(
    () => computeRouteRecommendations(roads, params, customOriginId, customDestId),
    [roads, params, customOriginId, customDestId]
  );

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId]
  );

  const { shelters, evacuationPlans } = useMemo(
    () => evaluateSheltersAndEvacuation(cells, params),
    [cells, params]
  );

  const alerts = useMemo(
    () => generateOperationalAlerts(cells, roads, sensors, params, acknowledgedAlerts),
    [cells, roads, sensors, params, acknowledgedAlerts]
  );

  const validationReport = useMemo(
    () => generateValidationReport(cells, params),
    [cells, params]
  );

  const dataHealthReport = useMemo(
    () => evaluateDataHealth(sensors, params),
    [sensors, params]
  );

  const systemEnvelope = useMemo(
    () =>
      wrapInEnvelope(
        { cellCount: cells.length, roadCount: roads.length },
        params.mode,
        dataHealthReport.confidence,
        params.timelineHourOffset
      ),
    [params.mode, dataHealthReport.confidence, params.timelineHourOffset, cells.length, roads.length]
  );

  // Timeline Autoplay Handler
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = window.setInterval(() => {
      setParams((prev) => {
        const nextHour = prev.timelineHourOffset >= 4 ? -3 : prev.timelineHourOffset + 1;
        return resolveTimelineStepParameters(prev, nextHour);
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isPlayingTimeline]);

  const handleAcknowledgeAlert = (id: string) => {
    setAcknowledgedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleChangeCustomRoute = (originId: string, destId: string) => {
    setCustomOriginId(originId);
    setCustomDestId(destId);
    if (originId !== destId) {
      setSelectedRouteId(`RTE-CUSTOM-${originId}-${destId}`);
    }
  };

  const modeMeta = MODE_META[params.mode];
  const activePreset = getPresetById(params.activeEventPresetId);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070A10] text-slate-100 overflow-hidden">
      {/* TOP TELEMETRY & MODE GOVERNANCE HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0A0F1A] border-b border-slate-800/90 shrink-0">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-lg font-bold tracking-tight text-white">
              iDhara
            </span>
            <span className="hidden sm:inline text-xs text-cyan-300 font-medium">
              From Prediction to Protection.
            </span>
            <span className="hidden xl:inline text-xs text-slate-400">
              · Predict the Flood. Protect the City.
            </span>
          </div>
        </div>

        {/* Center Prominent Mode & System Telemetry Strip */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
          {/* Mode Selector (Prominent & Unmistakable) */}
          <div className="flex items-center gap-1 bg-[#060911] p-1 border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5">MODE:</span>
            {(
              [
                ProductMode.SIMULATED,
                ProductMode.HISTORICAL,
                ProductMode.MOCK,
                ProductMode.LIVE,
              ] as ProductMode[]
            ).map((m) => {
              const active = params.mode === m;
              const mMeta = MODE_META[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setParams((prev) => ({ ...prev, mode: m }))}
                  className={`px-2 py-0.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? `${mMeta.bgClass} ${mMeta.accentText} border ${mMeta.borderClass}`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mMeta.indicatorSymbol} {m}
                </button>
              );
            })}
          </div>

          <span className="text-slate-600" aria-hidden="true">·</span>

          <div>
            <span className="text-slate-400">RAINFALL: </span>
            <span className="text-sky-300 font-semibold">
              {params.rainfallIntensityMmHr} mm/hr
            </span>
          </div>

          <span className="text-slate-600" aria-hidden="true">·</span>

          <div>
            <span className="text-slate-400">CONFIDENCE: </span>
            <span className="text-cyan-300 font-semibold">
              {Math.round(dataHealthReport.confidence * 100)}%
            </span>
          </div>

          <span className="hidden md:inline text-slate-600" aria-hidden="true">·</span>

          <div className="hidden md:block">
            <span className="text-slate-400">AS_OF: </span>
            <span className="text-slate-200">
              {systemEnvelope.data_as_of.slice(11, 19)}Z
            </span>
          </div>
        </div>

        {/* Right User Role Selector */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <label htmlFor="operator-role-select" className="text-slate-400 hidden sm:inline">
            Role:
          </label>
          <select
            id="operator-role-select"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as UserRole)}
            className="bg-[#0D1320] border border-slate-700 text-slate-200 px-2.5 py-1 text-xs font-mono"
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* PROMINENT MODE DISCLOSURE BANNER (Never present simulated/mock data as live government broadcast) */}
      <div
        className={`px-4 py-1 border-b ${modeMeta.borderClass} ${modeMeta.bgClass} flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] shrink-0`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${modeMeta.accentText}`}>
            {modeMeta.indicatorSymbol} ACTIVE DATA MODE: {params.mode}
          </span>
          <span className="text-slate-400">—</span>
          <span className="text-slate-200">{systemEnvelope.disclaimer}</span>
        </div>
        <div className="text-slate-400 tabular-nums">
          Scope: {PILOT_SCOPE_ID} · Stage: {params.stage.replace(/_/g, ' ')}
        </div>
      </div>

      {/* MAIN BODY: LEFT NAV + CENTER MAP/WORKSPACE + RIGHT CONTEXT PANEL */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <nav
          aria-label="Primary Control Room Navigation"
          className="w-48 xl:w-56 shrink-0 bg-[#090D16] border-r border-slate-800/90 flex flex-col justify-between overflow-y-auto"
        >
          <div className="p-2.5 space-y-1">
            <div className="px-2.5 py-1.5 font-mono text-[10.5px] text-slate-400">
              MISSION MODULES
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const unackCount =
                item.id === 'alerts'
                  ? alerts.filter((a) => !a.acknowledged).length
                  : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-950/50 text-cyan-300 border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {unackCount > 0 ? (
                    <span className="font-mono text-[10px] text-amber-300">
                      {unackCount} active
                    </span>
                  ) : item.shortBadge ? (
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.shortBadge}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {/* Four-Stage Disaster Twin Quick Selector */}
            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <div className="px-2.5 py-1 font-mono text-[10.5px] text-slate-400">
                4-STAGE DISASTER TWIN
              </div>
              {(
                [
                  { st: DisasterStage.EARLY_WARNING, label: '1. Early Warning' },
                  { st: DisasterStage.PRE_DISASTER_SCENARIO, label: '2. Pre-Disaster Sim' },
                  { st: DisasterStage.REAL_TIME_ONGOING, label: '3. Real-Time Ongoing' },
                  { st: DisasterStage.POST_DISASTER_LEARNING, label: '4. Post-Disaster Learn' },
                ] as const
              ).map((item) => {
                const active = params.stage === item.st;
                return (
                  <button
                    key={item.st}
                    type="button"
                    onClick={() =>
                      setParams((prev) => ({
                        ...prev,
                        stage: item.st,
                      }))
                    }
                    className={`w-full text-left px-3 py-1.5 font-mono text-[11px] transition-colors whitespace-nowrap ${
                      active
                        ? 'text-cyan-300 font-semibold bg-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {active ? '▶ ' : '  '}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pilot Area Summary Footer in Sidebar */}
          <div className="p-3 border-t border-slate-800/80 bg-[#070B12] font-mono text-[10.5px] text-slate-400 space-y-1">
            <div className="text-slate-200 font-semibold">Indore 5×5 km Pilot</div>
            <div>64 Hydrological Cells</div>
            <div>24 Road Segments · 16 Nodes</div>
            <div>10 Gauges · 4 Relief Shelters</div>
          </div>
        </nav>

        {/* CENTER STAGE: MODULE WORKSPACE + INTERACTIVE FLOOD MAP */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#06090F]">
          <ModuleWorkspace
            activeTab={activeTab}
            params={params}
            onUpdateParams={setParams}
            cells={cells}
            roads={roads}
            sensors={sensors}
            shelters={shelters}
            evacuationPlans={evacuationPlans}
            routes={routes}
            activeRouteId={activeRoute?.id ?? ''}
            onSelectRouteId={setSelectedRouteId}
            customOriginId={customOriginId}
            customDestId={customDestId}
            onChangeCustomRoute={handleChangeCustomRoute}
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            validationReport={validationReport}
            dataHealthReport={dataHealthReport}
            activeRole={activeRole}
            onSelectMapTarget={setSelectedTarget}
            onNavigateTab={setActiveTab}
          />

          <div className="flex-1 min-h-[260px] overflow-hidden">
            <IndoreFloodMap
              mode={params.mode}
              cells={cells}
              roads={roads}
              sensors={sensors}
              shelters={shelters}
              activeRoute={activeRoute}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
            />
          </div>
        </main>

        {/* RIGHT: CONTEXT & ACTION INSPECTOR PANEL */}
        <ContextInspectorPanel
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          cells={cells}
          roads={roads}
          sensors={sensors}
          shelters={shelters}
          activeRoute={activeRoute}
          activeRole={activeRole}
          onNavigateTab={setActiveTab}
        />
      </div>

      {/* BOTTOM TIMELINE & SCENARIO CONTROLS BAR */}
      <footer className="px-4 py-2 bg-[#0A0F1A] border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shrink-0">
        {/* Timeline Play & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlayingTimeline((p) => !p)}
            className="px-3 py-1 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/60 text-cyan-200 font-semibold whitespace-nowrap transition-colors"
          >
            {isPlayingTimeline ? '❚❚ Pause Replay' : '▶ Play Timeline'}
          </button>

          <div className="flex items-center gap-1 overflow-x-auto">
            {activePreset.hourlyRainProfile.map((step) => {
              const isCurrent = params.timelineHourOffset === step.hourOffset;
              return (
                <button
                  key={step.hourOffset}
                  type="button"
                  onClick={() => {
                    setIsPlayingTimeline(false);
                    setParams((prev) =>
                      resolveTimelineStepParameters(prev, step.hourOffset)
                    );
                  }}
                  className={`px-2 py-1 text-[11px] border transition-colors whitespace-nowrap tabular-nums ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-[#0D1320] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {step.hourOffset >= 0 ? `T+${step.hourOffset}h` : `T${step.hourOffset}h`} ({step.mmHr}mm)
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick What-If Sliders in Bottom Bar */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-2">
            <label htmlFor="footer-rain-range" className="text-slate-400">
              Rain:
            </label>
            <input
              id="footer-rain-range"
              type="range"
              min={10}
              max={95}
              step={2}
              value={params.rainfallIntensityMmHr}
              onChange={(e) => {
                setIsPlayingTimeline(false);
                setParams((p) => ({
                  ...p,
                  mode: ProductMode.SIMULATED,
                  rainfallIntensityMmHr: Number(e.target.value),
                }));
              }}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="text-sky-300 font-semibold tabular-nums w-16">
              {params.rainfallIntensityMmHr} mm/hr
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="footer-blockage-range" className="text-slate-400">
              Drain Blockage:
            </label>
            <input
              id="footer-blockage-range"
              type="range"
              min={5}
              max={75}
              step={5}
              value={params.drainageBlockagePct}
              onChange={(e) => {
                setIsPlayingTimeline(false);
                setParams((p) => ({
                  ...p,
                  mode: ProductMode.SIMULATED,
                  drainageBlockagePct: Number(e.target.value),
                }));
              }}
              className="w-20 accent-amber-400 cursor-pointer"
            />
            <span className="text-amber-300 font-semibold tabular-nums w-10">
              {params.drainageBlockagePct}%
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
