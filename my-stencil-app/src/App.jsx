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
  // STATE VARIABLES
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [backendPreviewUrl, setBackendPreviewUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [widthFt, setWidthFt] = useState(3);
  const [widthIn, setWidthIn] = useState(3);
  const [heightFt, setHeightFt] = useState(3);
  const [heightIn, setHeightIn] = useState(3);
  const [unit, setUnit] = useState('cm');
  const [filter, setFilter] = useState('color');
  const [orientation, setOrientation] = useState('portrait');

  // NEW STATES: Margins
  const [addMargins, setAddMargins] = useState('no');
  const [marginUnit, setMarginUnit] = useState('cm');
  const [marginX, setMarginX] = useState(5); // Left/Right
  const [marginY, setMarginY] = useState(5); // Top/Bottom
  const [marginXFt, setMarginXFt] = useState(0);
  const [marginXIn, setMarginXIn] = useState(2);
  const [marginYFt, setMarginYFt] = useState(0);
  const [marginYIn, setMarginYIn] = useState(2);

  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // FETCH PREVIEW FROM BACKEND
  useEffect(() => {
    if (!file) return;

    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      
      let tw = unit === 'cm' ? width : toCm(widthFt, widthIn);
      let th = unit === 'cm' ? height : toCm(heightFt, heightIn);
      let mx = addMargins === 'yes' ? (marginUnit === 'cm' ? marginX : toCm(marginXFt, marginXIn)) : 0;
      let my = addMargins === 'yes' ? (marginUnit === 'cm' ? marginY : toCm(marginYFt, marginYIn)) : 0;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_width_cm', tw);
      formData.append('target_height_cm', th);
      formData.append('filter_type', filter);
      formData.append('orientation', orientation);
      formData.append('add_margins', addMargins === 'yes');
      formData.append('margin_x_cm', mx);
      formData.append('margin_y_cm', my);

      try {
        const res = await axios.post('http://localhost:8000/generate-preview/', formData, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        setBackendPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        console.error("Preview generation failed", e);
      } finally { setIsPreviewLoading(false); }
    };

    const timer = setTimeout(fetchPreview, 800); // Debounce to avoid spamming backend
    return () => clearTimeout(timer);
  }, [file, width, height, widthFt, widthIn, heightFt, heightIn, unit, filter, orientation, addMargins, marginUnit, marginX, marginY, marginXFt, marginXIn, marginYFt, marginYIn]);

  const toCm = (feet, inches) => (parseFloat(feet || 0) * 30.48) + (parseFloat(inches || 0) * 2.54);

  // GRID CALCULATION FOR PREVIEW
  const getGridInfo = () => {
    const tw = unit === 'cm' ? width : toCm(widthFt, widthIn);
    const th = unit === 'cm' ? height : toCm(heightFt, heightIn);
    const a4_w = orientation === 'portrait' ? 21.0 : 29.7;
    const a4_h = orientation === 'portrait' ? 29.7 : 21.0;

    return {
      cols: Math.ceil(tw / a4_w),
      rows: Math.ceil(th / a4_h),
      totalW: tw,
      totalH: th
    };
  };

  const { cols, rows } = getGridInfo();

  const handleSubmit = async () => {
    if (!file) return alert("Upload an image first.");
    let tw = unit === 'cm' ? width : toCm(widthFt, widthIn);
    let th = unit === 'cm' ? height : toCm(heightFt, heightIn);

    // Calculate final margins in CM
    let mx = addMargins === 'yes' ? (marginUnit === 'cm' ? marginX : toCm(marginXFt, marginXIn)) : 0;
    let my = addMargins === 'yes' ? (marginUnit === 'cm' ? marginY : toCm(marginYFt, marginYIn)) : 0;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_width_cm', tw);
    formData.append('target_height_cm', th);
    formData.append('filter_type', filter);
    formData.append('orientation', orientation);
    formData.append('add_margins', addMargins === 'yes');
    formData.append('margin_x_cm', mx);
    formData.append('margin_y_cm', my);

    try {
      const res = await axios.post('http://localhost:8000/generate-stencil/', formData, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stencil_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      setDownloaded(true);
    } catch (e) {
      alert("Error generating stencil.");
    } finally { setLoading(false); }
  };

  return (
    <div className="app-container">
      <main className="main-layout">
        <div className="art-card">
          <header>
            <h1 className="logo-text">STENCILMAKER</h1>
          </header>

          <section className="controls">
            <div className="file-upload">
              <input type="file" id="file" hidden onChange={handleFileChange} />
              <label htmlFor="file" className="upload-label">{file ? `✓ ${file.name}` : "Choose Image"}</label>
            </div>

            <div className="grid-row">
              <FieldSelect 
                label="System" 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)} 
                options={[{ label: 'Metric (cm)', value: 'cm' }, { label: 'Imperial (ft)', value: 'ft' }]} 
              />
              <FieldSelect 
                label="Filter" 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)} 
                options={[{ label: 'Color', value: 'color' }, { label: 'B&W', value: 'bw' }, { label: 'Outline', value: 'outline' }]} 
              />
            </div>

            {/* Main Mural Dimensions */}
            {unit === 'cm' ? (
              <div className="grid-row">
                <FieldInput 
                  label="Mural Width" 
                  value={width} 
                  suffix="cm" 
                  onChange={(e) => setWidth(e.target.value)} 
                />
                <FieldInput 
                  label="Mural Height" 
                  value={height} 
                  suffix="cm" 
                  onChange={(e) => setHeight(e.target.value)} 
                />
              </div>
            ) : (
              <div className="grid-row complex">
                <div className="field-pair">
                  <FieldInput 
                    label="W (ft)" 
                    value={widthFt} 
                    onChange={(e) => setWidthFt(e.target.value)} 
                  />
                  <FieldInput 
                  label="In" 
                  value={widthIn} 
                  onChange={(e) => setWidthIn(e.target.value)} 
                  />
                </div>
                <div className="field-pair">
                  <FieldInput 
                    label="H (ft)" 
                    value={heightFt} 
                    onChange={(e) => setHeightFt(e.target.value)} 
                  />
                  <FieldInput 
                    label="In" 
                    value={heightIn} 
                    onChange={(e) => setHeightIn(e.target.value)} 
                  />
                </div>
              </div>
            )}

            {/* MARGIN SECTION */}
            <div className="margin-logic-box">
              <FieldSelect
                label="Add White Margins?"
                value={addMargins}
                onChange={(e) => setAddMargins(e.target.value)}
                options={[{ label: 'No', value: 'no' }, { label: 'Yes, add border', value: 'yes' }]}
              />

              {addMargins === 'yes' && (
                <div className="margin-inputs">
                  <FieldSelect 
                    label="Margin Units" 
                    value={marginUnit} 
                    onChange={(e) => setMarginUnit(e.target.value)} 
                    options={[{ label: 'cm', value: 'cm' }, { label: 'ft/in', value: 'ft' }]} 
                  />
                  {marginUnit === 'cm' ? (
                    <div className="grid-row">
                      <FieldInput 
                        label="Sides (X)" 
                        value={marginX} 
                        suffix="cm" 
                        onChange={(e) => setMarginX(e.target.value)} 
                      />
                      <FieldInput 
                        label="Top/Bot (Y)" 
                        value={marginY} 
                        suffix="cm" 
                        onChange={(e) => setMarginY(e.target.value)} 
                      />
                    </div>
                  ) : (
                    <div className="grid-row complex">
                      <div className="field-pair">
                        <FieldInput 
                          label="X (ft)" 
                          value={marginXFt} 
                          onChange={(e) => setMarginXFt(e.target.value)} 
                        />
                        <FieldInput 
                          label="In" 
                          value={marginXIn} 
                          onChange={(e) => setMarginXIn(e.target.value)} 
                        />
                      </div>
                      <div className="field-pair">
                        <FieldInput 
                          label="Y (ft)" 
                          value={marginYFt} 
                          onChange={(e) => setMarginYFt(e.target.value)} 
                        />
                        <FieldInput 
                          label="In" 
                          value={marginYIn} 
                          onChange={(e) => setMarginYIn(e.target.value)} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <FieldSelect 
              label="Paper" 
              value={orientation} 
              onChange={(e) => setOrientation(e.target.value)} 
              options={[{ label: 'Portrait', value: 'portrait' }, { label: 'Landscape', value: 'landscape' }]} 
            />

            <button 
              onClick={handleSubmit} 
              className={`generate-btn ${loading ? 'loading' : ''}`}
              disabled={loading}>{loading ? "PROCESSING..." : "GENERATE PDF"}
            </button>
          </section>
        </div>

        {/* PREVIEW SECTION */}
        {previewUrl && (
          <div className="preview-container-horizontal">
            <div className="preview-card">
              <label className="preview-label">A4 Grid Preview ({cols} x {rows} sheets)</label>
              <div className="image-frame grid-preview-frame">
                {isPreviewLoading ? (
                  <div className="loader"></div>
                ) : backendPreviewUrl ? (
                  <img src={backendPreviewUrl} alt="Accurate Grid Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 5px 15px rgba(0,0,0,2)' }} />
                ) : (
                  //<div style={{ color: '#999' }}>Upload image to see preview</div>
                  <div className="loader"></div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;