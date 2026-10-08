import React, { useState } from 'react';
import {
  CRITICAL_ASSETS,
  DRAINAGE_PROXIES,
  INTERSECTION_NODES,
  PILOT_BOUNDS,
  PILOT_SCOPE_ID,
} from '../data/indorePilotData';
import {
  CriticalAsset,
  FloodRiskCell,
  FloodSeverity,
  ProductMode,
  RoadSegmentState,
  RoadStatus,
  RouteRecommendation,
  SensorNode,
  Shelter,
} from '../types/idhara';
import { MODE_META, ROAD_STATUS_META, SEVERITY_META } from './SeverityVisuals';

export type MapInspectionTarget =
  | { type: 'CELL'; id: string }
  | { type: 'ROAD'; id: string }
  | { type: 'SENSOR'; id: string }
  | { type: 'SHELTER'; id: string }
  | { type: 'ASSET'; id: string };

interface IndoreFloodMapProps {
  mode: ProductMode;
  cells: FloodRiskCell[];
  roads: RoadSegmentState[];
  sensors: SensorNode[];
  shelters: Shelter[];
  activeRoute: RouteRecommendation | null;
  selectedTarget: MapInspectionTarget;
  onSelectTarget: (target: MapInspectionTarget) => void;
  showComparisonSplit?: boolean; // Compare Uniform Rain vs Terrain-Adjusted Risk
}

export const IndoreFloodMap: React.FC<IndoreFloodMapProps> = ({
  mode,
  cells,
  roads,
  sensors,
  shelters,
  activeRoute,
  selectedTarget,
  onSelectTarget,
}) => {
  const [layers, setLayers] = useState({
    gridCells: true,
    patterns: true,
    drainage: true,
    roads: true,
    activeRoute: true,
    sensors: true,
    assetsAndShelters: true,
    cellLabels: true,
  });

  const [metricOverlay, setMetricOverlay] = useState<'SEVERITY' | 'ELEVATION' | 'DRAINAGE'>('SEVERITY');
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  const nodeMap = new Map(INTERSECTION_NODES.map((n) => [n.id, n]));
  const modeMeta = MODE_META[mode];

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cellSize = 1000 / 8; // 125 units per cell in 1000x1000 SVG coordinate space

  return (
    <div className="relative flex flex-col w-full h-full bg-[#06090F] border border-slate-800/90 select-none overflow-hidden">
      {/* Top Map HUD Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0B101B]/95 border-b border-slate-800/90 z-10">
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs font-semibold ${modeMeta.accentText}`}>
            {modeMeta.indicatorSymbol} MAP FEED: {mode}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {PILOT_SCOPE_ID} (5.0 km × 5.0 km)
          </span>
          <span className="hidden xl:inline text-slate-600" aria-hidden="true">·</span>
          <span className="hidden xl:inline font-mono text-[11px] text-slate-400">
            Core Thesis: Same rainfall ≠ same flood risk everywhere
          </span>
        </div>

        {/* Surface Lens Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 border border-slate-800 rounded">
          <button
            type="button"
            onClick={() => setMetricOverlay('SEVERITY')}
            className={`px-2.5 py-1 text-[11px] font-mono transition-colors whitespace-nowrap rounded-xs ${
              metricOverlay === 'SEVERITY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flood Risk & Depth
          </button>
          <button
            type="button"
            onClick={() => setMetricOverlay('ELEVATION')}
            className={`px-2.5 py-1 text-[11px] font-mono transition-colors whitespace-nowrap rounded-xs ${
              metricOverlay === 'ELEVATION'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Terrain DEM (m MSL)
          </button>
          <button
            type="button"
            onClick={() => setMetricOverlay('DRAINAGE')}
            className={`px-2.5 py-1 text-[11px] font-mono transition-colors whitespace-nowrap rounded-xs ${
              metricOverlay === 'DRAINAGE'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Drainage Proxy Score
          </button>
        </div>
      </div>

      {/* Layer Toggles & Zoom Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#080C14]/90 border-b border-slate-800/70 text-[11px] font-mono z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 mr-1">LAYERS:</span>
          {[
            { key: 'gridCells', label: '64-Cell Grid' },
            { key: 'patterns', label: 'Hatch Patterns' },
            { key: 'drainage', label: 'Rivers & Nallahs' },
            { key: 'roads', label: 'Road Network' },
            { key: 'activeRoute', label: 'Reroute Path' },
            { key: 'sensors', label: 'Sensors (10)' },
            { key: 'assetsAndShelters', label: 'Shelters & Assets' },
          ].map((item) => {
            const active = layers[item.key as keyof typeof layers];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleLayer(item.key as keyof typeof layers)}
                className={`px-2 py-0.5 border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800/90 text-slate-200 border-slate-600'
                    : 'bg-transparent text-slate-500 border-slate-800 hover:text-slate-400'
                }`}
              >
                {active ? '■' : '□'} {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 whitespace-nowrap"
            title="Zoom Out"
          >
            -
          </button>
          <span className="px-1.5 text-slate-400 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.25).toFixed(2))))}
            className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 whitespace-nowrap"
            title="Zoom In"
          >
            +
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive SVG Geospatial Viewport */}
      <div className="relative flex-1 w-full h-full overflow-auto flex items-center justify-center bg-[#05080E]">
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full max-h-full cursor-crosshair transition-transform duration-150"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          role="img"
          aria-label="Indore 5 by 5 kilometer interactive flood prediction and disaster twin map"
        >
          <defs>
            {/* Non-hue-only SVG patterns for Flood Severity */}
            <pattern
              id="pattern-critical-crosshatch"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0,16 L 16,0 M 0,0 L 16,16"
                stroke="rgba(248, 113, 113, 0.42)"
                strokeWidth="1.5"
              />
            </pattern>

            <pattern
              id="pattern-high-diagonal"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M -2,14 L 14,-2 M 6,16 L 16,6"
                stroke="rgba(251, 146, 60, 0.42)"
                strokeWidth="1.5"
              />
            </pattern>

            <pattern
              id="pattern-moderate-dots"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="4" cy="4" r="1.4" fill="rgba(250, 204, 21, 0.45)" />
              <circle cx="10" cy="10" r="1.4" fill="rgba(250, 204, 21, 0.45)" />
            </pattern>

            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22D3EE" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* 1. 64-Cell Hydrological Risk Grid */}
          {layers.gridCells &&
            cells.map((cell) => {
              const x = cell.col * cellSize;
              const y = cell.row * cellSize;
              const isSelected =
                selectedTarget.type === 'CELL' && selectedTarget.id === cell.id;
              const sevMeta = SEVERITY_META[cell.severity];

              // Compute fill based on active metric overlay
              let fillStyle = sevMeta.svgFill;
              if (metricOverlay === 'ELEVATION') {
                const normElev = (cell.elevationM - 544) / 18; // 0 (low) to 1 (high)
                fillStyle =
                  normElev < 0.25
                    ? 'rgba(14, 165, 233, 0.34)'
                    : normElev < 0.55
                    ? 'rgba(56, 189, 248, 0.16)'
                    : 'rgba(148, 163, 184, 0.10)';
              } else if (metricOverlay === 'DRAINAGE') {
                fillStyle =
                  cell.drainageProxyScore < 0.35
                    ? 'rgba(239, 68, 68, 0.32)'
                    : cell.drainageProxyScore < 0.6
                    ? 'rgba(234, 179, 8, 0.20)'
                    : 'rgba(16, 185, 129, 0.15)';
              }

              return (
                <g
                  key={cell.id}
                  onClick={() => onSelectTarget({ type: 'CELL', id: cell.id })}
                  onMouseEnter={() =>
                    setHoveredInfo(
                      `${cell.id} · ${cell.localityName} (${cell.wardCode}) · ${sevMeta.glyph} ${sevMeta.label} · Prob ${Math.round(
                        cell.floodProbability * 100
                      )}% · Depth ${cell.predictedDepthCm}cm · Elev ${cell.elevationM}m`
                    )
                  }
                  onMouseLeave={() => setHoveredInfo(null)}
                  className="cursor-pointer group"
                >
                  {/* Base Color Fill */}
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={fillStyle}
                    stroke={isSelected ? '#38BDF8' : 'rgba(51, 65, 85, 0.55)'}
                    strokeWidth={isSelected ? 3 : 1}
                  />

                  {/* Pattern Hatch Overlay (Non-hue-only visual treatment) */}
                  {layers.patterns &&
                    metricOverlay === 'SEVERITY' &&
                    sevMeta.patternId !== 'none' && (
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={sevMeta.patternId}
                        pointerEvents="none"
                      />
                    )}

                  {/* Selected Cell Inner Frame */}
                  {isSelected && (
                    <rect
                      x={x + 3}
                      y={y + 3}
                      width={cellSize - 6}
                      height={cellSize - 6}
                      fill="none"
                      stroke="#E0F2FE"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      pointerEvents="none"
                    />
                  )}

                  {/* Cell Telemetry Annotations (Glyph + Code + Locality + Value) */}
                  {layers.cellLabels && (
                    <g pointerEvents="none">
                      {/* Top-left ward & severity glyph */}
                      <text
                        x={x + 7}
                        y={y + 16}
                        fill={
                          cell.severity === FloodSeverity.CRITICAL
                            ? '#FCA5A5'
                            : cell.severity === FloodSeverity.HIGH
                            ? '#FDBA74'
                            : cell.severity === FloodSeverity.MODERATE
                            ? '#FDE047'
                            : '#6EE7B7'
                        }
                        fontSize="11"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="600"
                      >
                        {sevMeta.glyph} {sevMeta.shortCode} · {cell.wardCode}
                      </text>

                      {/* Locality Short Name */}
                      <text
                        x={x + 7}
                        y={y + 31}
                        fill="#CBD5E1"
                        fontSize="10"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontWeight="500"
                      >
                        {cell.localityName.length > 18
                          ? cell.localityName.slice(0, 17) + '…'
                          : cell.localityName}
                      </text>

                      {/* Bottom-left metric readout */}
                      <text
                        x={x + 7}
                        y={y + cellSize - 9}
                        fill="#94A3B8"
                        fontSize="10.5"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {metricOverlay === 'SEVERITY' &&
                          `${Math.round(cell.floodProbability * 100)}% · ${cell.predictedDepthCm}cm`}
                        {metricOverlay === 'ELEVATION' &&
                          `${cell.elevationM}m MSL · ${cell.slopeDeg}°`}
                        {metricOverlay === 'DRAINAGE' &&
                          `Drain ${cell.drainageProxyScore.toFixed(2)} · Imp ${Math.round(
                            cell.imperviousness * 100
                          )}%`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* 2. Kahn River, Saraswati River & Primary Nallah Drainage Proxies */}
          {layers.drainage &&
            DRAINAGE_PROXIES.map((d) => {
              const pathPoints = d.points.map((p) => `${p.x},${p.y}`).join(' ');
              const isRiver = d.type === 'RIVER_CHANNEL';
              const isCulvert = d.type === 'STORM_CULVERT_CHOKEPOINT';
              return (
                <g key={d.id} pointerEvents="none">
                  {/* Outer River/Channel Halo */}
                  <polyline
                    points={pathPoints}
                    fill="none"
                    stroke={
                      isCulvert
                        ? 'rgba(244, 63, 94, 0.35)'
                        : 'rgba(14, 165, 233, 0.28)'
                    }
                    strokeWidth={isRiver ? 18 : 10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Core Channel Line */}
                  <polyline
                    points={pathPoints}
                    fill="none"
                    stroke={isCulvert ? '#FB7185' : isRiver ? '#0284C7' : '#38BDF8'}
                    strokeWidth={isRiver ? 6 : 3.5}
                    strokeDasharray={isCulvert ? '6 4' : isRiver ? 'none' : '10 4'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

          {/* 3. Road Network & Flood State Segments */}
          {layers.roads &&
            roads.map((road) => {
              const fromNode = nodeMap.get(road.fromNodeId);
              const toNode = nodeMap.get(road.toNodeId);
              if (!fromNode || !toNode) return null;

              const isSelected =
                selectedTarget.type === 'ROAD' && selectedTarget.id === road.id;
              const statusMeta = ROAD_STATUS_META[road.currentState];
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              return (
                <g
                  key={road.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: 'ROAD', id: road.id });
                  }}
                  onMouseEnter={() =>
                    setHoveredInfo(
                      `${road.id}: ${road.name} · ${statusMeta.glyph} ${statusMeta.label} · Flood Prob ${Math.round(
                        road.floodProbability * 100
                      )}% (~${road.estimatedWaterDepthCm}cm)`
                    )
                  }
                  onMouseLeave={() => setHoveredInfo(null)}
                  className="cursor-pointer"
                >
                  {/* Wide Invisible Hit Target for Easy Clicking */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="transparent"
                    strokeWidth="16"
                  />
                  {/* Road Casing */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#090D16"
                    strokeWidth={isSelected ? 9 : 6.5}
                    strokeLinecap="round"
                  />
                  {/* Road State Stroke */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={isSelected ? '#38BDF8' : statusMeta.strokeColor}
                    strokeWidth={isSelected ? 5.5 : 3.5}
                    strokeDasharray={statusMeta.dashArray}
                    strokeLinecap="round"
                  />

                  {/* Barricade / Closure Glyph on CLOSED_INUNDATED or RESTRICTED roads */}
                  {(road.currentState === RoadStatus.CLOSED_INUNDATED ||
                    road.currentState === RoadStatus.RESTRICTED_SHALLOW) && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-12"
                        y="-9"
                        width="24"
                        height="18"
                        rx="3"
                        fill="#090D16"
                        stroke={statusMeta.strokeColor}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill={statusMeta.strokeColor}
                        fontSize="10"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="700"
                      >
                        {statusMeta.glyph}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* 4. Active Recommended Route Overlay ("Recommended under current data") */}
          {layers.activeRoute && activeRoute && (
            <g pointerEvents="none">
              {/* Baseline Blocked Shortest Path (if different from recommended) */}
              {activeRoute.avoidedHazardCount > 0 &&
                activeRoute.baselineShortestRoadIds.map((rId) => {
                  const r = roads.find((item) => item.id === rId);
                  if (!r) return null;
                  const f = nodeMap.get(r.fromNodeId);
                  const t = nodeMap.get(r.toNodeId);
                  if (!f || !t) return null;
                  return (
                    <line
                      key={`base-${rId}`}
                      x1={f.x}
                      y1={f.y}
                      x2={t.x}
                      y2={t.y}
                      stroke="#F43F5E"
                      strokeWidth="3"
                      strokeDasharray="3 6"
                      opacity="0.7"
                    />
                  );
                })}

              {/* Recommended Flood-Aware Path */}
              {activeRoute.recommendedRoadIds.map((rId) => {
                const r = roads.find((item) => item.id === rId);
                if (!r) return null;
                const f = nodeMap.get(r.fromNodeId);
                const t = nodeMap.get(r.toNodeId);
                if (!f || !t) return null;
                return (
                  <line
                    key={`rec-${rId}`}
                    x1={f.x}
                    y1={f.y}
                    x2={t.x}
                    y2={t.y}
                    stroke="#22D3EE"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    filter="url(#route-glow)"
                  />
                );
              })}
            </g>
          )}

          {/* 5. Intersection Nodes */}
          {layers.roads &&
            INTERSECTION_NODES.map((node) => {
              const isOrigin = activeRoute?.originNodeId === node.id;
              const isDest = activeRoute?.destinationNodeId === node.id;
              return (
                <g key={node.id} pointerEvents="none">
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isOrigin || isDest ? 7 : 4}
                    fill={isOrigin ? '#22D3EE' : isDest ? '#10B981' : '#1E293B'}
                    stroke="#E2E8F0"
                    strokeWidth={isOrigin || isDest ? 2 : 1.2}
                  />
                  <text
                    x={node.x + 8}
                    y={node.y + 4}
                    fill="#E2E8F0"
                    fontSize="10"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                    stroke="#05080E"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

          {/* 6. Critical Assets & Evacuation Shelters */}
          {layers.assetsAndShelters && (
            <>
              {CRITICAL_ASSETS.map((asset) => {
                const isSelected =
                  selectedTarget.type === 'ASSET' && selectedTarget.id === asset.id;
                const glyph =
                  asset.category === 'HOSPITAL'
                    ? '✚'
                    : asset.category === 'FIRE_EMERGENCY'
                    ? '★'
                    : asset.category === 'POWER_SUBSTATION'
                    ? '⚡'
                    : '■';
                return (
                  <g
                    key={asset.id}
                    transform={`translate(${asset.x}, ${asset.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTarget({ type: 'ASSET', id: asset.id });
                    }}
                    onMouseEnter={() =>
                      setHoveredInfo(
                        `CRITICAL ASSET: ${asset.name} (${asset.category}) · Elev ${asset.elevationM}m MSL`
                      )
                    }
                    onMouseLeave={() => setHoveredInfo(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="-11"
                      y="-11"
                      width="22"
                      height="22"
                      rx="4"
                      fill="#0F172A"
                      stroke={isSelected ? '#38BDF8' : '#F8FAFC'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={asset.category === 'HOSPITAL' ? '#38BDF8' : '#FBBF24'}
                      fontSize="11"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="700"
                    >
                      {glyph}
                    </text>
                  </g>
                );
              })}

              {shelters.map((sh) => {
                const isSelected =
                  selectedTarget.type === 'SHELTER' && selectedTarget.id === sh.id;
                return (
                  <g
                    key={sh.id}
                    transform={`translate(${sh.x}, ${sh.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTarget({ type: 'SHELTER', id: sh.id });
                    }}
                    onMouseEnter={() =>
                      setHoveredInfo(
                        `SHELTER ${sh.id}: ${sh.name} · Occupancy ${sh.currentOccupancy}/${sh.totalCapacity} · Elev ${sh.elevationM}m MSL`
                      )
                    }
                    onMouseLeave={() => setHoveredInfo(null)}
                    className="cursor-pointer"
                  >
                    <polygon
                      points="0,-13 12,10 -12,10"
                      fill="#064E3B"
                      stroke={isSelected ? '#38BDF8' : '#34D399'}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                    />
                    <text
                      x="0"
                      y="7"
                      textAnchor="middle"
                      fill="#A7F3D0"
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="700"
                    >
                      S
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* 7. Rain Gauges & Ultrasonic Water-Level Sensors */}
          {layers.sensors &&
            sensors.map((s) => {
              const isSelected =
                selectedTarget.type === 'SENSOR' && selectedTarget.id === s.id;
              const ringColor =
                s.status === 'STALE'
                  ? '#94A3B8'
                  : s.status === 'CRITICAL_THRESHOLD'
                  ? '#EF4444'
                  : s.status === 'DRIFTING'
                  ? '#F59E0B'
                  : '#22D3EE';

              return (
                <g
                  key={s.id}
                  transform={`translate(${s.x}, ${s.y - 18})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: 'SENSOR', id: s.id });
                  }}
                  onMouseEnter={() =>
                    setHoveredInfo(
                      `SENSOR ${s.id}: ${s.name} · ${s.currentValue} ${s.unit} · Status: ${s.status}`
                    )
                  }
                  onMouseLeave={() => setHoveredInfo(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 10 : 8}
                    fill="#090D16"
                    stroke={ringColor}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill={ringColor}
                    fontSize="8.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="700"
                  >
                    {s.type === 'RAIN_GAUGE' ? 'RG' : 'WL'}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Floating Bottom-Left Multi-Modal Legend (Color + Pattern + Glyph + Text) */}
        <div className="absolute bottom-3 left-3 bg-[#090D16]/95 border border-slate-800 px-3 py-2 text-[11px] font-mono text-slate-300 pointer-events-none max-w-md">
          <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">
            MULTI-MODAL SEVERITY & ROAD STATE LEGEND (COLOR + GLYPH + PATTERN)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span>✖ CRITICAL</span>
              <span className="text-[10px] text-slate-400">(Crosshatch)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span>▲ HIGH</span>
              <span className="text-[10px] text-slate-400">(Diagonal)</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-300">
              <span>◆ MODERATE</span>
              <span className="text-[10px] text-slate-400">(Stipple)</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span>● LOW</span>
              <span className="text-[10px] text-slate-400">(Clear)</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
            <span className="text-cyan-300">━ Recommended Corridor (Under Current Data)</span>
            <span className="text-rose-400">┅✖┅ Closed / Inundated Bridge</span>
            <span className="text-emerald-300">▲S Evacuation Shelter</span>
            <span className="text-sky-300">✚ Tier-1 Hospital</span>
          </div>
        </div>

        {/* Floating Bottom-Right Scale & Live Coordinate Probe */}
        <div className="absolute bottom-3 right-3 bg-[#090D16]/95 border border-slate-800 px-3 py-1.5 text-[11px] font-mono text-slate-300 pointer-events-none flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">SCALE:</span>
            <div className="w-20 h-1.5 border-x border-b border-slate-300 relative">
              <span className="absolute -top-3.5 left-0 text-[9px]">0</span>
              <span className="absolute -top-3.5 right-0 text-[9px]">1.0 km</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            {PILOT_BOUNDS.minLat}°N–{PILOT_BOUNDS.maxLat}°N · {PILOT_BOUNDS.minLng}°E–{PILOT_BOUNDS.maxLng}°E
          </div>
        </div>
      </div>

      {/* Bottom Live Crosshair Probe Bar */}
      <div className="px-3 py-1.5 bg-[#090D16] border-t border-slate-800/90 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2 truncate">
        <span className="truncate">
          {hoveredInfo
            ? `PROBE: ${hoveredInfo}`
            : 'INTERACTION: Click any flood-risk cell, road segment, sensor, shelter, or hospital on the map to inspect drivers & actions.'}
        </span>
        <span className="text-slate-500 shrink-0">625m × 625m Cell Resolution</span>
      </div>
    </div>
  );
};
