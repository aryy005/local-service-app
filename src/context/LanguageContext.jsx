import React, { createContext, useState, useContext } from 'react';

const dict = {
  en: {
    dashboardTitle: "Customer Dashboard",
    welcome: "Welcome back",
    myOrders: "My Orders",
    myProfile: "My Profile",
    bookAgain: "🔄 Book Again",
    messageProvider: "Message Provider",
    noBookings: "No bookings yet",
    loading: "Loading dashboard...",
    aiDiagnosisBtn: "🤖 AI Photo Diagnosis & Cost Estimator",
    findPro: "Find Professionals",
    recentOrdersStr: "Job Request"
  },
  hi: {
    dashboardTitle: "ग्राहक डैशबोर्ड (Customer Dashboard)",
    welcome: "वापसी पर स्वागत है",
    myOrders: "मेरे आदेश",
    myProfile: "मेरी प्रोफ़ाइल",
    bookAgain: "🔄 फिर से बुक करें",
    messageProvider: "प्रोवाइडर को मेसेज करें",
    noBookings: "अभी तक कोई बुकिंग नहीं",
    loading: "लोड हो रहा है...",
    aiDiagnosisBtn: "🤖 एआई फोटो डायग्नोसिस और लागत अनुमानक",
    findPro: "प्रोफेशनल खोजें",
    recentOrdersStr: "कार्य अनुरोध"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const t = (key) => dict[lang][key] || key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
