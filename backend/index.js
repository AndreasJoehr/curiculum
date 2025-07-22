import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import * as pdfjsModule from 'pdfjs-dist/legacy/build/pdf.js';
const pdfjsLib = pdfjsModule?.default ?? pdfjsModule;

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractTextFromPDF(uint8Array) {
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

app.get('/', (req, res) => {
  res.send('Backend läuft!');
});

app.post('/api/optimize-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file || !req.body.jobDescription) {
      return res.status(400).json({ error: 'CV und Stellenbeschreibung erforderlich.' });
    }
    // 1. PDF-Text extrahieren
    const pdfBuffer = fs.readFileSync(req.file.path);
    const uint8Array = new Uint8Array(pdfBuffer);
    const originalCvText = await extractTextFromPDF(uint8Array);
    // 2. OpenAI-API aufrufen


    //Bitte optimiere den Lebenslauf so, dass er bestmöglich zur Stellenbeschreibung passt.

    const prompt1 = 
    `Hier ist ein Lebenslauf:\n${originalCvText}\n\n
    Hier ist eine Stellenbeschreibung:\n${req.body.jobDescription}\n\n 
    Erstelle an Hand der Informationen im Lebenslauf einen neuen, wahrheitsgetreuen und optimierten Lebenslauf, welcher auf die Stellenbeschreibung zugeschnittenen ist. 
    Schreibe den Lebenslauf in der Sprache der Stellenbeschreibung.
    Führe Anforderungen aus der Stellenbeschreibung nicht auf.
    Der Lebenslauf soll modern und professionell strukturiertsein.
    Lass unnötige Informatioenen weg.
    Gib die Zusammenfassung als Fließtext zurück.
   `;
  

   // Strukruriere den Lebenslauf so, dass er modern und professionell ist. 
   // Gib den optimierten Lebenslauf als Fließtext zurück.`;
    const gptRes1 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Du bist ein professioneller Bewerbungscoach.' },
        { role: 'user', content: prompt1 },
      ],
      max_tokens: 2048,
    });






    // 2a. Optimierten Lebenslauf generieren
    const improvedCvText = gptRes1.choices[0].message.content;

    // 2b. Motivationsschreiben generieren
    const motivationPrompt = 
    `Hier ist ein optimierter Lebenslauf:\n${improvedCvText}\n\n
    Hier ist die Stellenbeschreibung:\n${req.body.jobDescription}\n\n
    Bitte schreibe ein überzeugendes, individuelles Motivationsschreiben, das auf diesen Lebenslauf und die Stellenbeschreibung zugeschnitten ist. 
    Sprich die wichtigsten Anforderungen an und erkläre, warum die Person sehr gut passt. Beliebe dabei wahrheitsgetreu und übertreibe nicht. 
    Schreibe das Motivationsschreiben in der Sprache der Stellenbeschreibung.
    Sprich in der Ich-Form.`;

    const motivationRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Du bist ein professioneller Bewerbungscoach.' },
        { role: 'user', content: motivationPrompt },
      ],
      max_tokens: 1024,
    });

    const motivationPrompt1 = 
    `Hier ist ein optimierter Lebenslauf:\n${improvedCvText}\n\n
    Hier ist ein Motivationsschreiben:\n${motivationPrompt}\n\n
    Passe das Motivationsschreiben an Inhalte des Lebenslaufs an.
    Sprich in der Ich-Form.`;

    const motivationRes1 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Du bist ein professioneller Bewerbungscoach.' },
        { role: 'user', content: motivationPrompt1 },
      ],
      max_tokens: 1024,
    });





    const motivationLetter = motivationRes1.choices[0].message.content;
    // 3. Neues PDF generieren
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const fontSize = 12;
    const { width, height } = page.getSize();
    const lines = improvedCvText.match(/.{1,90}(\s|$)/g) || [improvedCvText];
    let y = height - 40;
    for (const line of lines) {
      page.drawText(line.trim(), { x: 40, y, size: fontSize });
      y -= fontSize + 4;
      if (y < 40) {
        page = pdfDoc.addPage(); // Neue Seite als aktuelle Seite setzen
        y = height - 40;
      }
    }
    const pdfBytes = await pdfDoc.save();
    // 4. PDF und Text als JSON zurückgeben
    res.json({
      improvedCvText,
      motivationLetter,
      pdfBase64: Buffer.from(pdfBytes).toString('base64'),
    });
    // Aufräumen
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler bei der CV-Optimierung.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
}); 