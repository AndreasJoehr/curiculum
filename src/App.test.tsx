import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('App rendert ohne Fehler', () => {
  // Testet, ob die App-Komponente ohne Fehler rendert
  // (Passe ggf. an deine App an)
  render(<App />);
});
