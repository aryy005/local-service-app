import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import './ProviderCard.css';

const ProviderCard = ({ provider }) => {
  const details = provider.providerDetails || {};

  return (
    <Link to={`/provider/${provider._id}`} className="provider-card glass-panel" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
      <div className="provider-img-container">
        <img src={details.avatarUrl} alt={provider.name} className="provider-img" />
      </div>
      
      <div className="provider-info">
        <div className="provider-header-info">
          <h3 className="provider-name">{provider.name}</h3>
          <div className="provider-rating">
            <Star size={16} fill="var(--warning-color)" color="var(--warning-color)" />
            <span className="rating-value">{details.rating || 0}</span>
            <span className="rating-count">({details.reviewsCount || 0})</span>
          </div>
        </div>

        <div className="provider-location">
          <MapPin size={16} />
          <span>{details.location}</span>
        </div>
        
        <p className="provider-skills">
          {details.skills && details.skills.map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </p>
        
        <div className="provider-footer">
          <span className="hourly-rate">₹{details.hourlyRate}<small>/hr</small></span>
          <button className="btn btn-primary btn-sm">Book</button>
        </div>
      </div>
    </Link>
  );
};

export default ProviderCard;
