import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Reusable Input Component
const FieldInput = ({ label, value, onChange, type = "number", suffix = "" }) => (
  <div className="field-group">
    <label>{label}</label>
    <div className="input-wrapper">
      <input type={type} value={value} onChange={onChange} />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  </div>
);

// Reusable Select Component
const FieldSelect = ({ label, value, onChange, options }) => (
  <div className="field-group">
    <label>{label}</label>
    <select value={value} onChange={onChange}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // Preview state
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [widthFt, setWidthFt] = useState(3);
  const [widthIn, setWidthIn] = useState(3);
  const [heightFt, setHeightFt] = useState(3);
  const [heightIn, setHeightIn] = useState(3);
  const [unit, setUnit] = useState('cm');
  const [filter, setFilter] = useState('color');
  const [orientation, setOrientation] = useState('portrait');
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Handle file selection and local preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  // Clean up memory
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const toCm = (feet, inches) => (parseFloat(feet) * 30.48) + (parseFloat(inches) * 2.54);

  const handleSubmit = async () => {
    if (!file) return alert("Upload an image first.");
    let tw = unit === 'cm' ? width : toCm(widthFt, widthIn);
    let th = unit === 'cm' ? height : toCm(heightFt, heightIn);

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_width_cm', tw);
    formData.append('target_height_cm', th);
    formData.append('filter_type', filter);
    formData.append('orientation', orientation);

    try {
      const res = await axios.post('http://localhost:8000/generate-stencil/', formData, { 
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stencil_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      setDownloaded(true);
    } catch (e) { 
      console.error(e); 
      alert("Error generating stencil.");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="app-container">
      <main className="main-layout">
        {/* SETTINGS CARD */}
        <div className="art-card">
          <header>
            <h1 className="logo-text">STENCILMAKER</h1>
            <p className="subtitle">Convert artwork into mural guides</p>
          </header>

          <section className="controls">
            <div className="file-upload">
              <input type="file" id="file" hidden onChange={handleFileChange} />
              <label htmlFor="file" className="upload-label">
                {file ? `✓ ${file.name}` : "Choose Masterpiece"}
              </label>
            </div>

            <div className="grid-row">
              <FieldSelect 
                label="System" 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)}
                options={[{label: 'Metric (cm)', value: 'cm'}, {label: 'Imperial (ft)', value: 'ft'}]}
              />
              <FieldSelect 
                label="Filter" 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                options={[
                  {label: 'Full Color', value: 'color'},
                  {label: 'B&W Contrast', value: 'bw'},
                  {label: 'Line Outline', value: 'outline'}
                ]}
              />
            </div>

            {unit === 'cm' ? (
              <div className="grid-row">
                <FieldInput label="Width" value={width} suffix="cm" onChange={(e) => setWidth(e.target.value)} />
                <FieldInput label="Height" value={height} suffix="cm" onChange={(e) => setHeight(e.target.value)} />
              </div>
            ) : (
              <div className="grid-row complex">
                <div className="field-pair">
                  <FieldInput label="Width (ft)" value={widthFt} onChange={(e) => setWidthFt(e.target.value)} />
                  <FieldInput label="In" value={widthIn} onChange={(e) => setWidthIn(e.target.value)} />
                </div>
                <div className="field-pair">
                  <FieldInput label="Height (ft)" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} />
                  <FieldInput label="In" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} />
                </div>
              </div>
            )}

            <FieldSelect 
              label="Paper Orientation" 
              value={orientation} 
              onChange={(e) => setOrientation(e.target.value)}
              options={[{label: 'Portrait', value: 'portrait'}, {label: 'Landscape', value: 'landscape'}]}
            />

            <button 
              onClick={handleSubmit} 
              className={`generate-btn ${loading ? 'loading' : ''}`} 
              disabled={loading}
            >
              GENERATE PDF STENCIL
            </button>
            
            {downloaded && <div className="success-tag">Ready for the wall! ✨</div>}
          </section>
        </div>

        {/* PREVIEW CARD */}
        {previewUrl && (
          <div className="preview-card">
            <label className="preview-label">PREVIEW</label>
            <div className="image-frame">
              <img src={previewUrl} alt="Preview" className="preview-img" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;