"use client";

import React, { useEffect, useRef, useState } from 'react';

// Distinct colors for cluster IDs
const CLUSTER_COLORS = [
  '#e11d48', '#ea580c', '#d97706', '#16a34a', '#0891b2',
  '#2563eb', '#7c3aed', '#c026d3', '#059669', '#dc2626',
];

interface DeckMapProps {
  mapData: any[];
  blackspots: any[];
  kdeRadius?: number;
  kdeBlur?: number;
}

export default function DeckMap({ mapData, blackspots, kdeRadius = 20, kdeBlur = 22 }: DeckMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready || !wrapperRef.current) return;
    let cancelled = false;

    const boot = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      // @ts-ignore
      try { await import('leaflet.heat'); } catch {}

      if (cancelled) return;

      // Fix marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Clean up previous
      if (mapObjRef.current) {
        try { mapObjRef.current.remove(); } catch {}
        mapObjRef.current = null;
      }

      // Fresh container
      const wrapper = wrapperRef.current!;
      wrapper.innerHTML = '';
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      wrapper.appendChild(container);

      // Center
      let center: [number, number] = [20.5937, 78.9629];
      let zoom = 5;
      if (mapData?.length > 0 && mapData[0].Latitude && mapData[0].Longitude) {
        center = [mapData[0].Latitude, mapData[0].Longitude];
        zoom = 11;
      }

      // World bounds to prevent infinite scrolling
      const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

      const map = L.map(container, {
        center,
        zoom,
        zoomControl: false,       // ← Remove +/- buttons
        attributionControl: false,
        minZoom: 3,               // ← Can't zoom out past one globe
        maxBounds: worldBounds,   // ← Lock to world extent
        maxBoundsViscosity: 1.0,  // ← Hard stop at boundary
      });
      mapObjRef.current = map;

      // ── Terrain tile layer (CartoDB Voyager — free, labels + terrain context) ──
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        noWrap: true,  // ← Prevent world repeating
      }).addTo(map);

      // Minimal attribution bottom-left
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://carto.com/" style="color:#666">CARTO</a> · <a href="https://www.openstreetmap.org/" style="color:#666">OSM</a>')
        .addTo(map);

      // ═══════════════════════════════════════
      // LAYER 1: KDE Heatmap
      // ═══════════════════════════════════════
      if (mapData?.length > 0 && (L as any).heatLayer) {
        const heatPoints = mapData
          .filter((pt: any) => pt.Latitude && pt.Longitude)
          .map((pt: any) => {
            const sev = pt.Severity || '';
            let weight = 0.4;
            if (sev === 'Fatal') weight = 1.0;
            else if (sev === 'Grievous') weight = 0.6;
            else if (sev === 'Minor') weight = 0.3;
            return [pt.Latitude, pt.Longitude, weight];
          });

        (L as any).heatLayer(heatPoints, {
          radius: kdeRadius, blur: kdeBlur, maxZoom: 15, max: 1.0,
          gradient: { 0.15: '#3b82f6', 0.35: '#8b5cf6', 0.5: '#f59e0b', 0.7: '#f97316', 0.9: '#ef4444', 1.0: '#dc2626' },
        }).addTo(map);
      }

      // ═══════════════════════════════════════
      // LAYER 2: ALL Crash Points (colored by severity, hoverable)
      // Every point gets severity coloring regardless of cluster membership
      // ═══════════════════════════════════════
      if (mapData?.length > 0) {
        const crashGroup = L.layerGroup();
        mapData.forEach((pt: any) => {
          if (!pt.Latitude || !pt.Longitude) return;

          const sev = pt.Severity || 'Unknown';
          const isNoise = pt.Cluster_ID === -1 || pt.Cluster_ID === null || pt.Cluster_ID === undefined;

          // Color by severity (always)
          let fillColor = '#3b82f6';
          let strokeColor = '#2563eb';
          if (sev === 'Fatal') { fillColor = '#ef4444'; strokeColor = '#dc2626'; }
          else if (sev === 'Grievous') { fillColor = '#f97316'; strokeColor = '#ea580c'; }
          else if (sev === 'Minor') { fillColor = '#22c55e'; strokeColor = '#16a34a'; }

          const marker = L.circleMarker([pt.Latitude, pt.Longitude], {
            radius: isNoise ? 4 : 5.5,
            fillColor,
            color: strokeColor,
            weight: isNoise ? 1 : 1.5,
            opacity: isNoise ? 0.7 : 1,
            fillOpacity: isNoise ? 0.6 : 0.85,
          });

          // Hover tooltip
          const clusterLabel = isNoise ? 'Unclustered' : `Cluster #${pt.Cluster_ID}`;
          marker.bindTooltip(
            `<b style="color:${fillColor}">${sev}</b><br/>` +
            `${clusterLabel}<br/>` +
            `${pt.Latitude.toFixed(4)}, ${pt.Longitude.toFixed(4)}`,
            { direction: 'top', offset: [0, -8], className: 'map-tooltip' }
          );

          // Click popup
          marker.bindPopup(
            `<div style="font-family:system-ui;font-size:12px;line-height:1.6;min-width:180px">` +
            `<div style="font-weight:700;font-size:14px;color:${fillColor};margin-bottom:4px">● ${sev} Crash</div>` +
            `<div><b>Status:</b> ${clusterLabel}</div>` +
            `<div><b>Latitude:</b> ${pt.Latitude.toFixed(5)}</div>` +
            `<div><b>Longitude:</b> ${pt.Longitude.toFixed(5)}</div>` +
            `</div>`
          );

          // Hover enlarge effect
          marker.on('mouseover', function () {
            (this as any).setRadius(isNoise ? 7 : 8);
            (this as any).setStyle({ weight: 2.5, fillOpacity: 1 });
          });
          marker.on('mouseout', function () {
            (this as any).setRadius(isNoise ? 4 : 5.5);
            (this as any).setStyle({ weight: isNoise ? 1 : 1.5, fillOpacity: isNoise ? 0.6 : 0.85 });
          });

          crashGroup.addLayer(marker);
        });
        crashGroup.addTo(map);
      }

      // ═══════════════════════════════════════
      // LAYER 4: Blackspot Clusters (distinct colors, hoverable)
      // ═══════════════════════════════════════
      if (blackspots?.length > 0) {
        const bsGroup = L.layerGroup();
        const clusters = new Map<number, { lats: number[]; lngs: number[]; count: number }>();

        blackspots.forEach((pt: any) => {
          if (pt.Cluster_ID == null || pt.Cluster_ID === -1 || !pt.Latitude || !pt.Longitude) return;
          if (!clusters.has(pt.Cluster_ID)) clusters.set(pt.Cluster_ID, { lats: [], lngs: [], count: 0 });
          const c = clusters.get(pt.Cluster_ID)!;
          c.lats.push(pt.Latitude);
          c.lngs.push(pt.Longitude);
          c.count++;
        });

        const clusterIds = Array.from(clusters.keys()).sort((a, b) => a - b);
        clusterIds.forEach((id, idx) => {
          const c = clusters.get(id)!;
          const lat = c.lats.reduce((a, b) => a + b, 0) / c.lats.length;
          const lng = c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length;
          const clr = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];

          // Danger zone ring
          L.circle([lat, lng], {
            radius: 80, fillColor: clr, color: clr,
            weight: 2, opacity: 0.5, fillOpacity: 0.1, dashArray: '6,4',
          }).addTo(bsGroup);

          // Centroid marker
          const centroid = L.circleMarker([lat, lng], {
            radius: 10, fillColor: clr, color: '#fff',
            weight: 2.5, opacity: 1, fillOpacity: 0.9,
          });

          centroid.bindTooltip(
            `<b style="color:${clr}">⚠ Blackspot #${id}</b><br/>${c.count} crashes`,
            { direction: 'top', offset: [0, -12], className: 'map-tooltip' }
          );

          centroid.bindPopup(
            `<div style="font-family:system-ui;font-size:12px;line-height:1.6;min-width:200px">` +
            `<div style="font-weight:700;font-size:15px;color:${clr};margin-bottom:4px">⚠️ BLACKSPOT #${id}</div>` +
            `<div><b>Crashes in cluster:</b> ${c.count}</div>` +
            `<div><b>Centroid:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>` +
            `<div style="margin-top:6px;padding:4px 8px;background:#fef2f2;border-radius:6px;color:#991b1b;font-size:10px;border:1px solid #fecaca">` +
            `High-risk zone · DBSCAN ε=50m, minPts=5</div></div>`
          );

          centroid.on('mouseover', function () {
            (this as any).setRadius(14);
            (this as any).setStyle({ weight: 3 });
          });
          centroid.on('mouseout', function () {
            (this as any).setRadius(10);
            (this as any).setStyle({ weight: 2.5 });
          });

          bsGroup.addLayer(centroid);
        });
        bsGroup.addTo(map);
      }

      // Fit bounds
      if (mapData?.length > 1) {
        const pts = mapData
          .filter((p: any) => p.Latitude && p.Longitude)
          .map((p: any) => [p.Latitude, p.Longitude] as [number, number]);
        if (pts.length > 1) {
          const bounds = L.latLngBounds(pts);
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
        }
      }

      setTimeout(() => { if (!cancelled && map) map.invalidateSize(); }, 300);
    };

    boot();

    return () => {
      cancelled = true;
      if (mapObjRef.current) {
        try { mapObjRef.current.remove(); } catch {}
        mapObjRef.current = null;
      }
    };
  }, [ready, mapData, blackspots]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <style>{`
        .map-tooltip {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          font-size: 11px !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          color: #334155 !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) !important;
          line-height: 1.4 !important;
        }
        .map-tooltip::before { border-top-color: rgba(255, 255, 255, 0.95) !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.98) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
          color: #334155 !important;
        }
        .leaflet-popup-tip { background: rgba(255, 255, 255, 0.98) !important; }
        .leaflet-popup-close-button { color: #64748b !important; font-size: 18px !important; }
        .leaflet-popup-close-button:hover { color: #0f172a !important; }
      `}</style>
      <div ref={wrapperRef} style={{ width: '100%', height: '100%', background: '#f1f5f9' }} />
    </div>
  );
}
