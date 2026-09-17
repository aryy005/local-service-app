import { useState } from 'react';
import { X, Upload, Search, CheckCircle } from 'lucide-react';
import '../pages/Auth.css';

const AIDiagnosisModal = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1 = Upload, 2 = Scanning, 3 = Result
  const [image, setImage] = useState(null);

  const handleUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleAnalyze = () => {
    if (!image) return;
    setStep(2);
    // Simulate AI diagnosis (2.2 seconds)
    setTimeout(() => {
      setStep(3);
    }, 2200);
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        <div style={{ marginBottom: '1.25rem' }}>
          <div className="auth-tag">SMART SCAN</div>
          <h2 className="auth-title" style={{ fontSize: '1.5rem', margin: '0.35rem 0 0.25rem 0' }}>
            PHOTO DIAGNOSIS
          </h2>
          <p className="auth-subtitle" style={{ margin: 0 }}>
            Upload a photo of what is broken to diagnose the issue and estimate repair costs.
          </p>
        </div>

        {step === 1 && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0 0.5rem' }}>
            <div style={{ 
              border: '2.5px dashed #111111', 
              padding: '2rem 1rem', 
              borderRadius: '6px', 
              background: '#FAF9F6', 
              marginBottom: '1.5rem',
              boxShadow: '2px 2px 0 #111111'
            }}>
              {image ? (
                <img src={image} alt="Uploaded" style={{ maxHeight: '180px', borderRadius: '4px', objectFit: 'contain', border: '1.5px solid #111111' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#111111' }}>
                  <Upload size={40} color="#111111" />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Click below to upload a photo of the damaged component.</p>
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              id="ai-photo-upload" 
              style={{ display: 'none' }} 
              onChange={handleUpload} 
            />
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <label 
                htmlFor="ai-photo-upload" 
                style={{ 
                  padding: '0.75rem 1.25rem', 
                  fontWeight: 800, 
                  border: '2px solid #111111', 
                  borderRadius: '6px', 
                  boxShadow: '2px 2px 0 #111111',
                  background: '#FFFFFF',
                  color: '#111111',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase'
                }}
              >
                {image ? 'Change Photo' : 'Select Photo'}
              </label>
              <button 
                onClick={handleAnalyze} 
                disabled={!image}
                className="auth-submit-btn"
                style={{ 
                  width: 'auto', 
                  margin: 0, 
                  padding: '0.75rem 1.4rem', 
                  fontSize: '0.85rem',
                  opacity: image ? 1 : 0.5,
                  cursor: image ? 'pointer' : 'not-allowed'
                }}
              >
                ANALYZE PHOTO →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', margin: '2.5rem 0', color: '#111111' }}>
            <Search size={44} className="spin-animation" style={{ color: '#111111', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>
              Analyzing Issue...
            </h3>
            <p style={{ color: '#555555', fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>
              Scanning image against known hardware components & typical repair estimates.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '28px', height: '28px', background: '#D2FE00', border: '1.5px solid #111111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={18} color="#111111" />
              </div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', textTransform: 'uppercase' }}>
                Diagnosis Complete
              </h3>
            </div>
            
            <div style={{ background: '#FAF9F6', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111', padding: '1.25rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#555555', marginBottom: '0.25rem' }}>
                Issue Identified
              </div>
              <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#111111' }}>Leaking Under-Sink P-Trap</p>
              <p style={{ margin: '0.4rem 0 0 0', color: '#555555', fontSize: '0.85rem', fontWeight: 600 }}>
                Recommended Service: <strong>General Plumbing</strong>
              </p>
            </div>

            <div style={{ background: '#EBEAE5', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111', padding: '1.25rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#555555', marginBottom: '0.25rem' }}>
                Standard Repair Estimate
              </div>
              <p style={{ margin: '0 0 0.5rem 0', color: '#555555', fontSize: '0.85rem', fontWeight: 600 }}>Typical labor cost in your local area:</p>
              <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#111111', letterSpacing: '-0.02em' }}>₹300 - ₹500</p>
            </div>
            
            <button className="auth-submit-btn" style={{ width: '100%' }} onClick={onClose}>
              FIND QUALIFIED TECHNICIANS →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDiagnosisModal;
