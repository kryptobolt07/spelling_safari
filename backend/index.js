require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

app.use(cors());
app.use(express.json());

// Helper function to extract JSON from markdown code blocks
function extractJson(markdownText) {
  const regex = /```json\s*([\s\S]+?)\s*```/;
  const match = markdownText.match(regex);
  if (match) {
    return match[1].trim();
  }
  return markdownText;
}

// Endpoint to generate a sentence for the game
app.post('/generate-sentence', async (req, res) => {
  try {
    const { accuracy, currentLevel } = req.body;

    // Determine difficulty based on performance metrics
    let difficulty = 'medium';
    if (accuracy > 80 && currentLevel > 50) {
      difficulty = 'hard';
    } else if (accuracy < 50 || currentLevel < 30) {
      difficulty = 'easy';
    }

    // Updated prompt instructs Gemini to output raw JSON (without markdown formatting)
    const prompt = `Generate a JSON object for a Spelling Safari game with the following properties:
- "sentence": A natural, engaging sentence appropriate for a level between 1 and 100, with proper spacing and punctuation, that includes exactly 2 common misspellings.
- "errors": An array of exactly two strings representing the misspelled words in the sentence.
The difficulty level is "${difficulty}". Output ONLY the raw JSON object without any markdown formatting.`;

    const result = await model.generateContent(prompt);
    const responseObj = await result.response;
    const generatedText = responseObj.text();
    const jsonText = extractJson(generatedText);

    let output;
    try {
      output = JSON.parse(jsonText);
    } catch (err) {
      console.error("Error parsing generated JSON:", err);
      output = { sentence: jsonText, errors: [], difficulty };
    }

    res.json(output);
  } catch (error) {
    console.error("Error in /generate-sentence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to analyze mistakes and provide suggestions
// Endpoint to analyze mistakes and provide suggestions
app.post('/analyze-mistakes', async (req, res) => {
    try {
      const { mistakes } = req.body; // mistakes should be an array of strings
      if (!mistakes || !Array.isArray(mistakes)) {
        return res.status(400).json({ error: "Invalid mistakes provided" });
      }
      
      // Modified prompt: explicitly distinguish between missed errors and false positives.
      const analysisPrompt = `Based on the following spelling mistakes detected in the user's response: ${JSON.stringify(mistakes)}.
  These mistakes include two types:
    1. Missed errors: words that the user did not identify as mistakes.
    2. False positives: words that the user incorrectly identified as mistakes (i.e., correctly spelled words).
  For each mistake in the list, generate a suggestion object with the following keys:
    - "corrected_spelling": the correct spelling of the word,
    - "explanation": a brief explanation of why it is considered a mistake,
    - "error_pattern": a description of the common error pattern (e.g., "incorrect vowel combination", "extra punctuation", etc.).
  Output a JSON object with a key "suggestions" mapping each mistake to its suggestion object.
  Output ONLY the raw JSON object without any markdown formatting.`;
      
      const result = await model.generateContent(analysisPrompt);
      const responseObj = await result.response;
      const generatedText = responseObj.text();
  
      // Remove any markdown formatting (if still present)
      const extractJson = (markdownText) => {
        const regex = /```json\s*([\s\S]+?)\s*```/;
        const match = markdownText.match(regex);
        if (match) return match[1].trim();
        return markdownText;
      };
  
      const jsonText = extractJson(generatedText);
      
      let output;
      try {
        output = JSON.parse(jsonText);
      } catch (err) {
        console.error("Error parsing analysis JSON:", err);
        output = { suggestions: {} };
      }
      
      res.json(output);
    } catch (error) {
      console.error("Error in /analyze-mistakes:", error);
      res.status(500).json({ error: error.message });
    }
  });
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});