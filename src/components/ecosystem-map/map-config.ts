import type { StyleSpecification } from "maplibre-gl";

export const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export const regionViews = [
  { label: "World", center: [12, 35] as [number, number], zoom: 1.2 },
  { label: "UK", center: [-2.5, 54.5] as [number, number], zoom: 5.2 },
  { label: "Europe", center: [11, 50.5] as [number, number], zoom: 4 },
  { label: "North America", center: [-96, 39] as [number, number], zoom: 3.2 },
  { label: "Asia", center: [103, 35] as [number, number], zoom: 3.2 },
];
