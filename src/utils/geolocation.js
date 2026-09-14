export const getCurrentLocationName = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key required)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          
          if (!response.ok) throw new Error("Failed to fetch location data");
          
          const data = await response.json();
          
          // Extract the most relevant locality name
          const address = data.address;
          const locationName = 
            address.city || 
            address.town || 
            address.village || 
            address.suburb || 
            address.county || 
            "Current Location";
            
            resolve({
              name: locationName,
              lng: longitude,
              lat: latitude
            });
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(new Error("Could not get your location. Please check browser permissions."));
      },
      { enableHighAccuracy: true }
    );
  });
};

export const getCurrentDetailedAddress = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) throw new Error("Failed to fetch address details from location");
          const data = await response.json();
          const addr = data.address || {};

          // Extract best available street / building
          const streetParts = [
            addr.house_number,
            addr.building,
            addr.road,
            addr.suburb || addr.neighbourhood || addr.residential
          ].filter(Boolean);

          const street = streetParts.length > 0 ? streetParts.join(', ') : (data.name || '');
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.district || '';
          const state = addr.state || '';
          const pincode = addr.postcode || '';

          resolve({
            street,
            city,
            state,
            pincode,
            lat: latitude,
            lng: longitude,
            displayName: data.display_name
          });
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        let msg = "Could not get your location. Please check browser location permissions.";
        if (error.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};
