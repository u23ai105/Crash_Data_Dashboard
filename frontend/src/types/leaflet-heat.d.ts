import * as L from 'leaflet';

declare module 'leaflet' {
    function heatLayer(
        latlngs: (L.LatLng | [number, number, number?])[],
        options?: any
    ): L.Layer;
}

declare module 'leaflet.heat';
