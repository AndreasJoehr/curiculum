import React, { useState } from 'react';
import './App.css';

function App() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [improvedCvText, setImprovedCvText] = useState<string | null>(null);
  const [motivationLetter, setMotivationLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDownloadUrl(null);
    setImprovedCvText(null);
    setMotivationLetter(null);
    if (!cvFile) {
      setError('Bitte lade deinen CV als PDF hoch.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Bitte füge eine Stellenbeschreibung ein.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('cv', cvFile);
    formData.append('jobDescription', jobDescription);
    try {
      const backendApi = process.env.REACT_APP_BACKEND_API;
      if (!backendApi) {
        throw new Error('REACT_APP_BACKEND_API ist nicht gesetzt!');
      }
      const response = await fetch(backendApi, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Fehler beim Verarbeiten der Anfrage');
      const data = await response.json();
      setImprovedCvText(data.improvedCvText);
      setMotivationLetter(data.motivationLetter);
      // PDF-Download-Link erzeugen
      const pdfBlob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      setDownloadUrl(url);
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>CV Optimierer</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>CV als PDF hochladen:</label><br />
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Stellenbeschreibung (Copy & Paste):</label><br />
          <textarea
            rows={8}
            style={{ width: '100%', maxWidth: 500 }}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Füge hier die Stellenbeschreibung ein..."
          />
        </div>
        <button type="submit" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Wird verarbeitet...' : 'CV optimieren'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {improvedCvText && (
        <div style={{ marginTop: 32 }}>
          <label>Optimierter CV (Text):</label>
          <textarea
            value={improvedCvText}
            readOnly
            rows={16}
            style={{ width: '100%', maxWidth: 700, marginTop: 8 }}
          />
        </div>
      )}
      {motivationLetter && (
        <div style={{ marginTop: 32 }}>
          <label>Motivationsschreiben:</label>
          <textarea
            value={motivationLetter}
            readOnly
            rows={12}
            style={{ width: '100%', maxWidth: 700, marginTop: 8 }}
          />
        </div>
      )}
      {downloadUrl && (
        <div style={{ marginTop: 16 }}>
          <a href={downloadUrl} download="optimierter-cv.pdf">Optimierten CV herunterladen</a>
        </div>
      )}
    </div>
  );
}

export default App;
