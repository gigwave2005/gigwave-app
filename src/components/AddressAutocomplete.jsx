import React, { useRef, useEffect } from 'react';

export default function AddressAutocomplete({ onSelect, placeholder = "Type address..." }) {
  const inputRef = useRef(null);

  useEffect(() => {
    // Wait for Google Maps
    const interval = setInterval(() => {
      if (window.google?.maps?.places && inputRef.current) {
        clearInterval(interval);
        
        // Create autocomplete
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name']
        });

        // Listen for selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place?.geometry) {
            const data = {
              address: place.formatted_address,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              name: place.name
            };
            
            console.log('✅ ADDRESS CAPTURED:', data);
            onSelect(data);
          }
        });

        console.log('✅ Autocomplete ready');         
        
         // ✅ Make dropdown text black
        if (!document.getElementById('pac-text-fix')) {
          const style = document.createElement('style');
          style.id = 'pac-text-fix';
          style.innerHTML = `
            .pac-item,
            .pac-item *,
            .pac-item-query,
            .pac-matched {
              color: #000000 !important;
            }
          `;
          document.head.appendChild(style);
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: '#2a2a2a',
        color: '#ffffff',
        border: '2px solid #00d4ff',
        borderRadius: '8px',
        fontSize: '16px',
        outline: 'none'
      }}
    />
  );
}