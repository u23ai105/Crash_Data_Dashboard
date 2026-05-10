"use client";

import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import Map from 'react-map-gl';

const INITIAL_VIEW_STATE = {
  longitude: 78.9629, // Default to center of India, adjust as needed based on data
  latitude: 20.5937,
  zoom: 4,
  pitch: 45,
  bearing: 0
};

export default function DeckMap({ mapData, blackspots }: { mapData: any[], blackspots: any[] }) {
  
  // Calculate center based on data if available
  const viewState = useMemo(() => {
    if (mapData && mapData.length > 0) {
      return {
        longitude: mapData[0].Longitude,
        latitude: mapData[0].Latitude,
        zoom: 10,
        pitch: 45,
        bearing: 0
      };
    }
    return INITIAL_VIEW_STATE;
  }, [mapData]);

  const layers = [
    // Heatmap / KDE layer equivalent
    new HeatmapLayer({
      id: 'heatmapLayer',
      data: mapData,
      getPosition: (d: any) => [d.Longitude, d.Latitude],
      getWeight: 1,
      radiusPixels: 50,
      intensity: 1,
      threshold: 0.05
    }),
    
    // Individual crashes
    new ScatterplotLayer({
      id: 'scatterLayer',
      data: mapData,
      getPosition: (d: any) => [d.Longitude, d.Latitude],
      getFillColor: [59, 130, 246, 150], // Blue
      getRadius: 15,
      pickable: true
    }),

    // Blackspots (DBSCAN Clusters)
    new ScatterplotLayer({
      id: 'blackspotsLayer',
      data: blackspots,
      getPosition: (d: any) => [d.Longitude, d.Latitude],
      getFillColor: [239, 68, 68, 200], // Red
      getRadius: 30,
      pickable: true
    })
  ];

  return (
    <div className="absolute inset-0 w-full h-full">
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>
    </div>
  );
}
