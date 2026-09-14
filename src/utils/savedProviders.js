// Saved / Bookmarked Providers Helper
const STORAGE_KEY = 'localpro_saved_providers';

export const getSavedProviders = (userEmail = 'guest') => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userEmail}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get saved providers', err);
    return [];
  }
};

export const isProviderSaved = (providerId, userEmail = 'guest') => {
  const list = getSavedProviders(userEmail);
  return list.some(p => p._id === providerId || p.id === providerId);
};

export const toggleSaveProvider = (provider, userEmail = 'guest') => {
  try {
    const list = getSavedProviders(userEmail);
    const pid = provider._id || provider.id;
    const exists = list.some(p => (p._id || p.id) === pid);
    
    let updated;
    if (exists) {
      updated = list.filter(p => (p._id || p.id) !== pid);
    } else {
      updated = [
        ...list,
        {
          _id: pid,
          id: pid,
          name: provider.name,
          role: provider.role || 'provider',
          city: provider.city || provider.addressDetails?.city || provider.providerDetails?.location || 'Chandigarh',
          providerDetails: {
            category: provider.providerDetails?.category || 'cat-5',
            categoryName: provider.providerDetails?.categoryName || 'Electrician',
            rating: provider.providerDetails?.rating || 4.8,
            reviewsCount: provider.providerDetails?.reviewsCount || 120,
            hourlyRate: provider.providerDetails?.hourlyRate || 25,
            experienceYears: provider.providerDetails?.experienceYears || 5,
            avatarUrl: provider.providerDetails?.avatarUrl || provider.avatarUrl || 'https://images.unsplash.com/photo-1544723795-3cj5a4a5t6f1?auto=format&fit=crop&q=80&w=200&h=200',
            location: provider.providerDetails?.location || 'Chandigarh',
            aadhaarVerified: provider.providerDetails?.aadhaarVerified ?? true,
          },
          savedAt: new Date().toISOString()
        }
      ];
    }
    localStorage.setItem(`${STORAGE_KEY}_${userEmail}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('saved_providers_changed'));
    return !exists;
  } catch (err) {
    console.error('Failed to toggle save provider', err);
    return false;
  }
};
