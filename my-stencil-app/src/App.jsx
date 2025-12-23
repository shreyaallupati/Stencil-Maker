import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [width, setWidth] = useState(100);
  const [filter, setFilter] = useState('color');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return alert("Upload a picture first!");
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_width_cm', width);
    formData.append('filter_type', filter);

    try {
      const response = await axios.post('http://localhost:5174/generate-stencil/', formData, {
        responseType: 'blob', // Important for receiving a PDF file
      });

      // Create a link to download the PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stencil_grid.pdf');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Mural Stencil Maker</h1>
      <div style={{ marginBottom: '20px' }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label>Final Mural Width (cm): </label>
        <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="color">Color</option>
          <option value="bw">Black & White</option>
          <option value="outline">Outline (Ink Saver)</option>
        </select>
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        {loading ? 'Processing Mural...' : 'Download PDF Stencil'}
      </button>
    </div>
  );
}

export default App;