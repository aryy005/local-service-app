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
            
          resolve(locationName);
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
