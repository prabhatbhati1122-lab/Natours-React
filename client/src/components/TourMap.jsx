import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function TourMap({ locations }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:
        import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/light-v11",
      scrollZoom: false,
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
      const marker = document.createElement("div");
      marker.className = "marker";
      new mapboxgl.Marker({ element: marker, anchor: "bottom" })
        .setLngLat(loc.coordinates)
        .addTo(map);

      const text = document.createElement("p");
      text.textContent = `Day ${loc.day}: ${loc.description}`;
      new mapboxgl.Popup({ offset: 30 })
        .setLngLat(loc.coordinates)
        .setDOMContent(text)
        .addTo(map);

      bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
      padding: { top: 200, bottom: 150, left: 100, right: 100 },
    });

    return () => map.remove();
  }, [locations]);

  return <div id="map" ref={containerRef} />;
}
