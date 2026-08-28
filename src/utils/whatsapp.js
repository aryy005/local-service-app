// Direct WhatsApp Chat Helper Utility
export function openWhatsAppChat(phone, messageText = '') {
  if (!phone) {
    alert("Phone number is not available for this contact.");
    return;
  }

  // Clean phone number (remove spaces, dashes, plus signs)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // If 10 digits without country code, prepend India country code 91
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const encodedMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${cleanPhone}${encodedMessage ? '?text=' + encodedMessage : ''}`;
  
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

export function formatWhatsAppBookingMessage(booking, isProviderView = false) {
  const orderId = booking.orderId || ('ORD-' + booking._id?.slice(-6).toUpperCase());
  
  if (isProviderView) {
    return `Hello ${booking.customerId?.name || 'Customer'},\n\nI am contacting you regarding your LocalFixr service order *#${orderId}* (${booking.description || 'Service'}).\nDate/Slot: ${booking.date} (${booking.timePreference})\nLocation: ${booking.serviceAddress || 'Customer Location'}`;
  } else {
    return `Hello ${booking.providerId?.name || 'Service Professional'},\n\nI am reaching out regarding my LocalFixr service order *#${orderId}* (${booking.description || 'Service'}).\nScheduled for: ${booking.date} (${booking.timePreference})`;
  }
}
