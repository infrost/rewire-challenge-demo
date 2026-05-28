"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";

import { osmStyle } from "@/components/ecosystem-map/map-config";
import { markerSize } from "@/components/ecosystem-map/map-utils";
import type { MapCluster } from "@/lib/landscape-core";

export function useMapLibreClusters({
  clusters,
  maxCount,
  onClusterSelect,
}: {
  clusters: MapCluster[];
  maxCount: number;
  onClusterSelect: (cluster: MapCluster) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialiseMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibregl = await import("maplibre-gl");

      if (cancelled || !containerRef.current) {
        return;
      }

      maplibreRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: osmStyle,
        center: [12, 35],
        zoom: 1.2,
        minZoom: 1.2,
        maxZoom: 8,
        attributionControl: false,
        renderWorldCopies: true,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      const attrib = new maplibregl.AttributionControl({ compact: true });
      map.addControl(attrib, "bottom-right");
      
      map.on("load", () => {
        map.resize();
        setMapReady(true);
        // Force collapse the attribution control on load
        setTimeout(() => {
          const container = containerRef.current?.querySelector(".maplibregl-ctrl-attrib");
          if (container && container.classList.contains("maplibregl-compact-show")) {
            container.removeAttribute("open");
            container.classList.remove("maplibregl-compact-show");
          }
        }, 50);
      });
      mapRef.current = map;

      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);

      map.once("remove", () => resizeObserver.disconnect());
    }

    initialiseMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;

    if (!map || !maplibregl || !mapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = clusters.map((cluster) => {
      const size = markerSize(cluster.count, maxCount);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "map-cluster-marker";
      element.dataset.dominantType = cluster.dominantType;
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.setAttribute(
        "aria-label",
        `${cluster.label}: ${cluster.count} organisations`,
      );

      const visual = document.createElement("div");
      visual.className = "map-cluster-visual";
      element.appendChild(visual);

      const count = document.createElement("span");
      count.className = "map-cluster-count";
      count.textContent = String(cluster.count);
      visual.appendChild(count);

      const label = document.createElement("span");
      label.className = "map-cluster-label";
      label.textContent = cluster.label;
      element.appendChild(label);

      element.addEventListener("click", () => {
        onClusterSelect(cluster);
        map.easeTo({
          center: cluster.coordinates,
          zoom: cluster.zoom,
          duration: 850,
        });
      });

      return new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(cluster.coordinates)
        .addTo(map);
    });
  }, [clusters, mapReady, maxCount, onClusterSelect]);

  function focusMap(center: [number, number], zoom: number) {
    mapRef.current?.easeTo({ center, zoom, duration: 850 });
  }

  return { containerRef, focusMap };
}
