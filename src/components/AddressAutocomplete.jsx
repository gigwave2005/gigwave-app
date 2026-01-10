import React, { useRef, useEffect } from 'react';

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Start typing..." }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) return;

      onSelect({
        address: place.formatted_address || place.name,
        location: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
        name: place.name || ''
      });
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/30 focus:border-electric focus:outline-none"
      autoComplete="off"
    />
  );
}