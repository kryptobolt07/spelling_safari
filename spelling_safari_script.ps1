# Save this script as setup-spelling-safari.ps1 and run it in your CWD

# Get current working directory
$cwd = Get-Location

Write-Host "Creating project directories and files in $cwd..."

# Create directories
New-Item -Path "$cwd\public" -ItemType Directory -Force | Out-Null
New-Item -Path "$cwd\src" -ItemType Directory -Force | Out-Null

# Optional: Create a basic package.json if you don't already have one
if (!(Test-Path "$cwd\package.json")) {
@'
{
  "name": "spelling-safari",
  "version": "0.1.0",
  "private": true,
  "dependencies": {},
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
'@ | Out-File -FilePath "$cwd\package.json" -Encoding utf8
Write-Host "Created package.json"
} else {
    Write-Host "package.json already exists; skipping creation."
}

# Create tailwind.config.js
@'
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
'@ | Out-File -FilePath "$cwd\tailwind.config.js" -Encoding utf8
Write-Host "Created tailwind.config.js"

# Create src/index.css with Tailwind directives
@'
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
'@ | Out-File -FilePath "$cwd\src\index.css" -Encoding utf8
Write-Host "Created src/index.css"

# Create src/App.jsx with the main React component
@'
import React, { useState, useEffect } from "react";
import { sentencesData } from "./data";

const getRandomSentence = (difficulty) => {
  const arr = sentencesData[difficulty];
  return arr[Math.floor(Math.random() * arr.length)];
};

function App() {
  const [difficulty, setDifficulty] = useState("easy");
  const [sentenceObj, setSentenceObj] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [selectedWords, setSelectedWords] = useState([]);
  const [feedback, setFeedback] = useState({}); // { index: "correct" or "incorrect" }
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [streak, setStreak] = useState(0);
  const [roundTimes, setRoundTimes] = useState([]);

  useEffect(() => {
    loadNewSentence();
  }, [difficulty]);

  const loadNewSentence = () => {
    const newSentence = getRandomSentence(difficulty);
    setSentenceObj(newSentence);
    setStartTime(Date.now());
    setSelectedWords([]);
    setFeedback({});
  };

  const handleWordClick = (word, index) => {
    if (selectedWords.includes(index)) return;

    const timeTaken = (Date.now() - startTime) / 1000; // seconds
    const cleanedWord = word.replace(/[.,]/g, ""); // remove punctuation

    let isError = sentenceObj && sentenceObj.errors.includes(cleanedWord);

    setSelectedWords(prev => [...prev, index]);
    setFeedback(prev => ({ ...prev, [index]: isError ? "correct" : "incorrect" }));

    if (isError) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      setStreak(prev => prev + 1);
    } else {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setStreak(0);
    }

    setRoundTimes(prev => [...prev, timeTaken]);
  };

  const handleNext = () => {
    const totalAttempts = score.correct + score.incorrect;
    const accuracy = totalAttempts > 0 ? (score.correct / totalAttempts) * 100 : 0;
    const avgTime = roundTimes.length > 0 ? roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length : 0;

    if (accuracy > 80 && avgTime < 2) {
      if (difficulty === "easy") setDifficulty("medium");
      else if (difficulty === "medium") setDifficulty("hard");
    } else if (accuracy < 50 || avgTime > 5) {
      if (difficulty === "hard") setDifficulty("medium");
      else if (difficulty === "medium") setDifficulty("easy");
    }

    loadNewSentence();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Spelling Safari: The Great Hunt</h1>
      {sentenceObj && (
        <div className="bg-white p-6 rounded shadow-md max-w-xl">
          <p className="text-xl mb-4">
            {sentenceObj.sentence.split(" ").map((word, index) => (
              <span
                key={index}
                onClick={() => handleWordClick(word, index)}
                className={`cursor-pointer mr-2 ${
                  feedback[index] === "correct"
                    ? "text-green-500"
                    : feedback[index] === "incorrect"
                    ? "text-red-500"
                    : "text-gray-800"
                }`}
              >
                {word}
              </span>
            ))}
          </p>
          <div className="mb-4">
            <p>
              <strong>Score:</strong> {score.correct} correct, {score.incorrect} incorrect
            </p>
            <p>
              <strong>Streak:</strong> {streak}
            </p>
            {roundTimes.length > 0 && (
              <p>
                <strong>Avg Time:</strong> {(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length).toFixed(2)} sec/word
              </p>
            )}
          </div>
          <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Next Sentence
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
'@ | Out-File -FilePath "$cwd\src\App.jsx" -Encoding utf8
Write-Host "Created src/App.jsx"

# Create src/data.js with predefined sentences
@'
export const sentencesData = {
  easy: [
    {
      sentence: "I dont like teh cold.",
      errors: ["dont", "teh"]
    },
    {
      sentence: "She cant find her keys.",
      errors: ["cant"]
    }
  ],
  medium: [
    {
      sentence: "There going to the store.",
      errors: ["There"]
    }
  ],
  hard: [
    {
      sentence: "He should of studied more.",
      errors: ["should of"]
    }
  ]
};
'@ | Out-File -FilePath "$cwd\src\data.js" -Encoding utf8
Write-Host "Created src/data.js"

Write-Host "Project directories and files have been created successfully."
