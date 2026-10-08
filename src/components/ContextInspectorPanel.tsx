import React from 'react';
import { CRITICAL_ASSETS } from '../data/indorePilotData';
import {
  FloodRiskCell,
  RoadSegmentState,
  RouteRecommendation,
  SensorNode,
  Shelter,
  UserRole,
} from '../types/idhara';
import { MapInspectionTarget } from './IndoreFloodMap';
import {
  ProvenanceStrip,
  RoadStateIndicator,
  SeverityIndicator,
} from './SeverityVisuals';

interface ContextInspectorPanelProps {
  selectedTarget: MapInspectionTarget;
  onSelectTarget: (target: MapInspectionTarget) => void;
  cells: FloodRiskCell[];
  roads: RoadSegmentState[];
  sensors: SensorNode[];
  shelters: Shelter[];
  activeRoute: RouteRecommendation | null;
  activeRole: UserRole;
  onNavigateTab: (tab: any) => void;
}

export const ContextInspectorPanel: React.FC<ContextInspectorPanelProps> = ({
  selectedTarget,
  onSelectTarget,
  cells,
  roads,
  sensors,
  shelters,
  activeRoute,
  activeRole,
  onNavigateTab,
}) => {
  const inspectedCell =
    selectedTarget.type === 'CELL'
      ? cells.find((c) => c.id === selectedTarget.id) ?? cells[18]
      : null;

  const inspectedRoad =
    selectedTarget.type === 'ROAD'
      ? roads.find((r) => r.id === selectedTarget.id) ?? roads[4]
      : null;

  const inspectedSensor =
    selectedTarget.type === 'SENSOR'
      ? sensors.find((s) => s.id === selectedTarget.id) ?? sensors[0]
      : null;

  const inspectedShelter =
    selectedTarget.type === 'SHELTER'
      ? shelters.find((sh) => sh.id === selectedTarget.id) ?? shelters[0]
      : null;

  const inspectedAsset =
    selectedTarget.type === 'ASSET'
      ? CRITICAL_ASSETS.find((a) => a.id === selectedTarget.id) ?? CRITICAL_ASSETS[0]
      : null;

  // Contrast cell (Daly College Ridge or Race Course Road) to prove "Same rainfall != same flood risk"
  const highGroundReferenceCell = cells.find((c) => c.id === 'CELL-R7C6') ?? cells[0];

  return (
    <aside className="w-full lg:w-[390px] xl:w-[420px] shrink-0 bg-[#090D16] border-l border-slate-800/90 flex flex-col h-full overflow-y-auto">
      {/* Inspector Header */}
      <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0B101B] flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] text-cyan-400">
            CONTEXT & ACTION INSPECTOR
          </div>
          <h2 className="text-sm font-semibold text-slate-100">
            {selectedTarget.type === 'CELL' && 'Flood-Risk Grid Cell Telemetry'}
            {selectedTarget.type === 'ROAD' && 'Road Corridor State & Evidence'}
            {selectedTarget.type === 'SENSOR' && 'Hydrological Sensor Node'}
            {selectedTarget.type === 'SHELTER' && 'Relief Shelter Readiness'}
            {selectedTarget.type === 'ASSET' && 'Critical Infrastructure Asset'}
          </h2>
        </div>
        <div className="text-right font-mono text-[11px] text-slate-400">
          <div>Operator Lens</div>
          <div className="text-slate-200 font-medium">{activeRole}</div>
        </div>
      </div>

      {/* Quick Entity Switcher Bar */}
      <div className="px-4 py-2 bg-[#070B12] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
        <button
          type="button"
          onClick={() => onSelectTarget({ type: 'CELL', id: 'CELL-R2C2' })}
          className={`px-2 py-1 border whitespace-nowrap transition-colors ${
            selectedTarget.type === 'CELL'
              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Cell: Krishnapura
        </button>
        <button
          type="button"
          onClick={() => onSelectTarget({ type: 'ROAD', id: 'RD-05' })}
          className={`px-2 py-1 border whitespace-nowrap transition-colors ${
            selectedTarget.type === 'ROAD'
              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Road: MG Bridge
        </button>
        <button
          type="button"
          onClick={() => onSelectTarget({ type: 'SENSOR', id: 'SEN-WL-01' })}
          className={`px-2 py-1 border whitespace-nowrap transition-colors ${
            selectedTarget.type === 'SENSOR'
              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Sensor: WL-01
        </button>
        <button
          type="button"
          onClick={() => onSelectTarget({ type: 'SHELTER', id: 'SH-01' })}
          className={`px-2 py-1 border whitespace-nowrap transition-colors ${
            selectedTarget.type === 'SHELTER'
              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Shelter: SH-01
        </button>
      </div>

      {/* 1. FLOOD-RISK CELL INSPECTION */}
      {inspectedCell && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-slate-400">
                  {inspectedCell.id} · Ward {inspectedCell.wardCode} · {inspectedCell.landUse}
                </div>
                <h3 className="text-base font-semibold text-white mt-0.5">
                  {inspectedCell.localityName}
                </h3>
              </div>
              <SeverityIndicator severity={inspectedCell.severity} />
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
              Coords: {inspectedCell.lat}°N, {inspectedCell.lng}°E · Elev: {inspectedCell.elevationM}m MSL · Slope: {inspectedCell.slopeDeg}°
            </div>
          </div>

          {/* Primary Quantitative Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">FLOOD PROBABILITY</div>
              <div className="text-xl font-mono font-semibold text-white tabular-nums mt-0.5">
                {Math.round(inspectedCell.floodProbability * 100)}%
                <span className="text-xs text-slate-400 font-normal ml-1.5">
                  ±{Math.round(inspectedCell.uncertaintyBand * 100)}%
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Predicted Depth: <span className="text-slate-200">{inspectedCell.predictedDepthCm} cm</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">DATA CONFIDENCE</div>
              <div className="text-xl font-mono font-semibold text-cyan-300 tabular-nums mt-0.5">
                {Math.round(inspectedCell.confidence * 100)}%
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Freshness: <span className="text-slate-200">{inspectedCell.freshnessLabel}</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">LOCAL RAINFALL</div>
              <div className="text-lg font-mono font-semibold text-sky-300 tabular-nums mt-0.5">
                {inspectedCell.rainfallMmHr} <span className="text-xs text-slate-400">mm/hr</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Cumulative: {inspectedCell.cumulativeRainfallMm} mm
              </div>
            </div>

            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">DRAINAGE & IMPERVIOUS</div>
              <div className="text-lg font-mono font-semibold text-slate-200 tabular-nums mt-0.5">
                {inspectedCell.drainageProxyScore.toFixed(2)}{' '}
                <span className="text-xs text-slate-400">proxy</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Impervious: {Math.round(inspectedCell.imperviousness * 100)}%
              </div>
            </div>
          </div>

          {/* Core Thesis Contrast Box: Why same rain != same risk */}
          <div className="p-2.5 bg-[#0B121E] border border-slate-800 text-xs">
            <div className="font-mono text-[11px] text-cyan-300 font-semibold">
              SPATIAL DIFFERENTIATION PROOF (SAME RAINFALL ≠ SAME RISK)
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed mt-1">
              Under <span className="font-mono text-white">{inspectedCell.rainfallMmHr} mm/hr</span> rain,{' '}
              <span className="text-white font-medium">{inspectedCell.localityName}</span> ({inspectedCell.elevationM}m MSL, drain score {inspectedCell.drainageProxyScore.toFixed(2)}) reaches{' '}
              <span className="font-mono text-white">{Math.round(inspectedCell.floodProbability * 100)}%</span> flood risk ({inspectedCell.predictedDepthCm} cm), whereas upland{' '}
              <button
                type="button"
                onClick={() => onSelectTarget({ type: 'CELL', id: highGroundReferenceCell.id })}
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                {highGroundReferenceCell.localityName}
              </button>{' '}
              ({highGroundReferenceCell.elevationM}m MSL) experiences only{' '}
              <span className="font-mono text-emerald-300">
                {Math.round(highGroundReferenceCell.floodProbability * 100)}%
              </span>{' '}
              ({highGroundReferenceCell.predictedDepthCm} cm).
            </p>
          </div>

          {/* Top Drivers Breakdown */}
          <div>
            <div className="font-mono text-[11px] text-slate-400 mb-2">
              TOP HYDROLOGICAL & TERRAIN DRIVERS
            </div>
            <div className="space-y-2">
              {inspectedCell.topDrivers.map((d) => (
                <div
                  key={d.factor}
                  className="p-2.5 bg-[#0D1320] border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-200 font-medium">{d.factor}</span>
                    <span
                      className={
                        d.direction === 'aggravating'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {d.direction === 'aggravating' ? '▲ Aggravating' : '▼ Mitigating'} · {d.weight}% wt
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    {d.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Context */}
          <div className="p-2.5 bg-[#0D1320] border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>HISTORICAL FLOOD CONTEXT (10-YR)</span>
              <span className="text-slate-200">{inspectedCell.historicalFloodCount10Yr} events recorded</span>
            </div>
            <p className="text-slate-300 text-[11.5px] mt-1 leading-relaxed">
              {inspectedCell.historicalContext}
            </p>
          </div>

          {/* Nearest Critical Assets & Nearest Shelter */}
          <div className="space-y-2">
            <div className="font-mono text-[11px] text-slate-400">
              NEAREST CRITICAL ASSETS & DESIGNATED SHELTER
            </div>

            {inspectedCell.nearestCriticalAssetIds.map((assetId) => {
              const asset = CRITICAL_ASSETS.find((a) => a.id === assetId);
              if (!asset) return null;
              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-2 bg-[#0D1320] border border-slate-800/80 text-xs"
                >
                  <div>
                    <div className="text-slate-200 font-medium">✚ {asset.name}</div>
                    <div className="font-mono text-[10.5px] text-slate-400">
                      {asset.category} · Elev {asset.elevationM}m MSL
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTarget({ type: 'ASSET', id: asset.id })}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </div>
              );
            })}

            {(() => {
              const shelter = shelters.find((s) => s.id === inspectedCell.nearestShelterId);
              if (!shelter) return null;
              return (
                <div className="flex items-center justify-between p-2.5 bg-emerald-950/20 border border-emerald-500/40 text-xs">
                  <div>
                    <div className="text-emerald-300 font-medium">
                      ▲ Nearest Shelter: {shelter.name}
                    </div>
                    <div className="font-mono text-[10.5px] text-slate-300 tabular-nums mt-0.5">
                      Occupancy: {shelter.currentOccupancy}/{shelter.totalCapacity} · Elev {shelter.elevationM}m MSL
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('evacuation')}
                    className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/50 text-emerald-200 font-mono text-[11px] whitespace-nowrap"
                  >
                    Evac Plan
                  </button>
                </div>
              );
            })()}
          </div>

          <ProvenanceStrip provenance={inspectedCell} />
        </div>
      )}

      {/* 2. ROAD SEGMENT INSPECTION */}
      {inspectedRoad && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="font-mono text-xs text-slate-400">
              {inspectedRoad.id} · {inspectedRoad.corridorType} · {inspectedRoad.lengthKm} km
            </div>
            <h3 className="text-base font-semibold text-white mt-0.5">
              {inspectedRoad.name}
            </h3>
            <div className="mt-2">
              <RoadStateIndicator state={inspectedRoad.currentState} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">FLOOD PROBABILITY</div>
              <div className="text-xl font-mono font-semibold text-white tabular-nums mt-0.5">
                {Math.round(inspectedRoad.floodProbability * 100)}%
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Est. Water Depth: <span className="text-slate-200">{inspectedRoad.estimatedWaterDepthCm} cm</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">LAST UPDATE & CONF</div>
              <div className="text-lg font-mono font-semibold text-cyan-300 tabular-nums mt-0.5">
                {Math.round(inspectedRoad.confidence * 100)}% Conf
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Updated: {inspectedRoad.lastUpdate}
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0D1320] border border-slate-800/90 text-xs space-y-1.5">
            <div className="font-mono text-[11px] text-slate-400">
              EVIDENCE & SENSOR VERIFICATION CHAIN
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11.5px] list-disc pl-4">
              {inspectedRoad.evidence.map((ev, i) => (
                <li key={i} className="leading-relaxed">
                  {ev}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-[#0D1320] border border-slate-800/90 text-xs space-y-1.5">
            <div className="font-mono text-[11px] text-slate-400">
              OPERATIONAL ROUTE IMPACT
            </div>
            <p className="text-slate-200 text-[11.5px] leading-relaxed">
              {inspectedRoad.routeImpact}
            </p>
            <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-cyan-300 font-mono">
              Advisory: {inspectedRoad.alternativeSummary}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('roads-routing')}
              className="flex-1 py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-200 font-mono text-xs transition-colors whitespace-nowrap"
            >
              Open Dynamic Reroute Solver
            </button>
          </div>

          <ProvenanceStrip provenance={inspectedRoad} />
        </div>
      )}

      {/* 3. SENSOR NODE INSPECTION */}
      {inspectedSensor && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="font-mono text-xs text-slate-400">
              {inspectedSensor.id} · {inspectedSensor.type} · Host Cell {inspectedSensor.cellId}
            </div>
            <h3 className="text-base font-semibold text-white mt-0.5">
              {inspectedSensor.name}
            </h3>
            <div className="mt-1 font-mono text-xs text-cyan-300">
              Status: {inspectedSensor.status} · Heartbeat {inspectedSensor.lastHeartbeatSecAgo}s ago
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">CURRENT READING</div>
              <div className="text-xl font-mono font-semibold text-white tabular-nums mt-0.5">
                {inspectedSensor.currentValue}{' '}
                <span className="text-xs text-slate-400">{inspectedSensor.unit}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Warn: {inspectedSensor.warningThreshold} · Crit: {inspectedSensor.criticalThreshold}
              </div>
            </div>

            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">PACKET & BATTERY</div>
              <div className="text-xl font-mono font-semibold text-emerald-300 tabular-nums mt-0.5">
                {inspectedSensor.packetSuccessRatePct}%
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Battery: {inspectedSensor.batteryPct}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTarget({ type: 'CELL', id: inspectedSensor.cellId })}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs whitespace-nowrap"
          >
            Inspect Host Grid Cell ({inspectedSensor.cellId})
          </button>

          <ProvenanceStrip provenance={inspectedSensor} />
        </div>
      )}

      {/* 4. SHELTER INSPECTION */}
      {inspectedShelter && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="font-mono text-xs text-slate-400">
              {inspectedShelter.id} · Ward {inspectedShelter.ward} · Elev {inspectedShelter.elevationM}m MSL
            </div>
            <h3 className="text-base font-semibold text-white mt-0.5">
              {inspectedShelter.name}
            </h3>
            <div className="mt-1 font-mono text-xs text-emerald-300">
              Status: {inspectedShelter.status} · Medical Team: {inspectedShelter.medicalTeamPresent ? 'On-Site' : 'Standby'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">OCCUPANCY</div>
              <div className="text-xl font-mono font-semibold text-white tabular-nums mt-0.5">
                {inspectedShelter.currentOccupancy} / {inspectedShelter.totalCapacity}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Available Berths: {inspectedShelter.totalCapacity - inspectedShelter.currentOccupancy}
              </div>
            </div>
            <div className="p-2.5 bg-[#0D1320] border border-slate-800/90">
              <div className="text-[11px] font-mono text-slate-400">WATER RESERVE</div>
              <div className="text-xl font-mono font-semibold text-cyan-300 tabular-nums mt-0.5">
                {(inspectedShelter.drinkingWaterLiters / 1000).toFixed(1)}k L
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Access Corridor: {inspectedShelter.accessRoadId}
              </div>
            </div>
          </div>

          <ProvenanceStrip provenance={inspectedShelter} />
        </div>
      )}

      {/* 5. CRITICAL ASSET INSPECTION */}
      {inspectedAsset && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="font-mono text-xs text-slate-400">
              {inspectedAsset.id} · {inspectedAsset.category} · {inspectedAsset.criticalityLevel}
            </div>
            <h3 className="text-base font-semibold text-white mt-0.5">
              {inspectedAsset.name}
            </h3>
            <div className="mt-1 font-mono text-xs text-slate-300">
              Elevation: {inspectedAsset.elevationM}m MSL · Backup Power: {inspectedAsset.backupPowerHours}h
            </div>
          </div>
          <div className="p-3 bg-[#0D1320] border border-slate-800 text-xs space-y-1">
            <div className="font-mono text-slate-400">EMERGENCY CONTACT DESK</div>
            <div className="text-slate-200">{inspectedAsset.contactRole}</div>
            <div className="font-mono text-slate-400 pt-2">LINKED ACCESS ROADS</div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {inspectedAsset.accessRoadIds.map((rId) => (
                <button
                  key={rId}
                  type="button"
                  onClick={() => onSelectTarget({ type: 'ROAD', id: rId })}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px]"
                >
                  {rId}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pinned Active Route Recommendation Summary ("Recommended under current data") */}
      {activeRoute && (
        <div className="p-3.5 bg-[#070B12] border-t border-slate-800/90 text-xs">
          <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
            <span className="text-cyan-300 font-semibold">
              ACTIVE CORRIDOR: {activeRoute.recommendationStatusLabel.toUpperCase()}
            </span>
            <span className="text-slate-400 tabular-nums">
              ETA {activeRoute.recommendedEtaMin}m ({activeRoute.recommendedDistanceKm} km)
            </span>
          </div>
          <div className="text-slate-200 font-medium mt-1">
            {activeRoute.originName} → {activeRoute.destinationName}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {activeRoute.safetyAdvisory}
          </p>
          <ProvenanceStrip
            provenance={activeRoute}
            expiry={activeRoute.expiry}
            compact
          />
        </div>
      )}
    </aside>
  );
};
