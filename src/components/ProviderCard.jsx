import { Link } from 'react-router-dom';
import { Star, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
import './ProviderCard.css';

const ProviderCard = ({ provider }) => {
  const details = provider.providerDetails || {};
  const initials = provider.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <Link to={`/provider/${provider._id || provider.id}`} className="provider-card">
      <div className="pc-header">
        <div className="pc-avatar">
          {details.avatarUrl ? (
            <img src={details.avatarUrl} alt={provider.name} />
          ) : (
            <span className="pc-initials">{initials}</span>
          )}
        </div>
        <div className="pc-info">
          <div className="pc-name-row">
            <h3 className="pc-name">{provider.name}</h3>
            {details.aadhaarVerified && (
              <span className="pc-verified">
                <ShieldCheck size={13} /> Verified
              </span>
            )}
          </div>
          <div className="pc-meta">
            <span className="pc-rating">
              <Star size={14} fill="#ffc107" color="#ffc107" />
              {details.rating || '0'}
              <span className="pc-reviews">({details.reviewsCount || 0})</span>
            </span>
            <span className="pc-location">
              <MapPin size={13} /> {details.location || 'N/A'}
            </span>
            {details.totalJobsCompleted > 0 && (
              <span className="pc-location">
                🏆 {details.totalJobsCompleted} Jobs
              </span>
            )}
            {details.experienceYears > 0 && (
              <span className="pc-location">
                💼 {details.experienceYears} Yrs Exp
              </span>
            )}
          </div>
        </div>
      </div>
      
      <p className="pc-description">{details.description}</p>

      <div className="pc-footer">
        <span className="pc-rate">₹{details.hourlyRate || '—'}<small>/hr</small></span>
        <span className="pc-book-btn">
          View Profile <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
};

export default ProviderCard;
