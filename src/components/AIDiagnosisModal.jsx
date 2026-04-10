import { useState } from 'react';
import { X, Upload, Search, CheckCircle } from 'lucide-react';

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
    // Simulate AI diagnosis (2.5 seconds)
    setTimeout(() => {
      setStep(3);
    }, 2500);
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <h2>AI Photo Diagnosis</h2>
          <p>Not sure what's broken? Upload a photo and let our AI diagnose it and estimate costs.</p>
        </div>

        {step === 1 && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <div style={{ border: '2px dashed var(--surface-border)', padding: '2rem', borderRadius: '1rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
              {image ? (
                <img src={image} alt="Uploaded" style={{ maxHeight: '200px', borderRadius: '4px', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                  <Upload size={48} />
                  <p>Click below to upload a photo of the issue.</p>
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
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <label htmlFor="ai-photo-upload" className="btn btn-outline" style={{ cursor: 'pointer' }}>
                {image ? 'Change Photo' : 'Select Photo'}
              </label>
              <button 
                onClick={handleAnalyze} 
                disabled={!image}
                className="btn btn-primary"
              >
                Analyze with AI
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', margin: '3rem 0', color: 'var(--text-main)' }}>
            <Search size={48} className="spin-animation" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem auto' }} />
            <h3>Analyzing the issue...</h3>
            <p className="text-muted">Our AI is fetching typical repair metrics for your area.</p>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#10b981' }}>
              <CheckCircle size={28} />
              <h3 style={{ margin: 0 }}>Diagnosis Complete</h3>
            </div>
            
            <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Issue Identified</h4>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Leaking Under-Sink P-Trap</p>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Recommended Service: <strong>General Plumbing</strong></p>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Dynamic Cost Estimator</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Typical labor cost in your area (within 5km):</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>₹300 - ₹500</p>
            </div>
            
            <button className="btn btn-primary w-full" onClick={onClose}>
              Find Plumbers Near Me
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDiagnosisModal;
