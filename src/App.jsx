import React, { useState, useEffect } from 'react';

function App() {
  // Expected backend sentence structure:
  // { sentence: string, errors: [string], difficulty: string }
  const [sentenceData, setSentenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track user interactions: indices clicked and corresponding feedback ("correct" or "incorrect")
  const [clickedIndices, setClickedIndices] = useState([]);
  const [feedback, setFeedback] = useState({});
  // Score tracks correct and incorrect clicks (plus missed errors added on submission)
  const [score, setScore] = useState({ correct: 0, incorrect: 0, streak: 0 });
  
  // Overall user stats (for long-term progression; currently stored locally)
  const [stats, setStats] = useState({ accuracy: 0, currentLevel: 50 });
  
  // Timing state to track response speed
  const [startTime, setStartTime] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);
  
  // States for submission and analysis features
  const [submitted, setSubmitted] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  // analysisFeedback can be either a suggestions object or an encouraging message object
  const [analysisFeedback, setAnalysisFeedback] = useState("");
  // Controls whether the analysis panel is visible
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Helper function: Clean text by removing punctuation, extra spaces, and converting to lowercase
  const cleanText = (text) => {
    return text.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  };

  // Fetch a new sentence from the backend
  const fetchSentence = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/generate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accuracy: stats.accuracy, currentLevel: stats.currentLevel })
      });
      if (!response.ok) throw new Error('Failed to fetch sentence');
      const data = await response.json();
      setSentenceData(data);
      // Reset all interactive states for the new sentence
      setClickedIndices([]);
      setFeedback({});
      setScore({ correct: 0, incorrect: 0, streak: 0 });
      setResponseTimes([]);
      setStartTime(Date.now());
      setSubmitted(false);
      setShowMistakes(false);
      setAnalysisFeedback("");
      setAnalyzing(false);
      setShowAnalysis(false);
      setShowAnimation(false);
    } catch (err) {
      console.error('Error fetching sentence:', err);
      setError('Error fetching sentence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch the first sentence on component mount
  useEffect(() => {
    fetchSentence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle word click (only allowed before submission)
  const handleWordClick = (word, index) => {
    if (!sentenceData || submitted || clickedIndices.includes(index)) return;
    const currentTime = Date.now();
    const timeTaken = (currentTime - startTime) / 1000;
    setResponseTimes(prev => [...prev, timeTaken]);
    setClickedIndices(prev => [...prev, index]);

    const cleanedWord = cleanText(word);
    // Compare clicked word against backend errors (which are returned as strings)
    const isError = sentenceData.errors.some(errorStr => cleanText(errorStr) === cleanedWord);

    if (isError) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setScore(prev => ({ ...prev, correct: prev.correct + 1, streak: prev.streak + 1 }));
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'incorrect' }));
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1, streak: 0 }));
    }
  };

  // Compute sentence accuracy based solely on clicks
  const computeSentenceAccuracy = () => {
    const totalClicks = score.correct + score.incorrect;
    return totalClicks > 0 ? ((score.correct / totalClicks) * 100).toFixed(2) : '0';
  };

  // Handle submission:
  // - Lock in answers, count missed errors, and trigger performance animation
  const handleSubmit = () => {
    let missedCount = 0;
    if (sentenceData) {
      const words = sentenceData.sentence.split(' ');
      // For each error word, check if none of its occurrences were clicked
      sentenceData.errors.forEach(errorStr => {
        const cleanedError = cleanText(errorStr);
        const indices = words
          .map((w, idx) => (cleanText(w) === cleanedError ? idx : null))
          .filter(idx => idx !== null);
        if (!indices.some(idx => clickedIndices.includes(idx))) {
          missedCount++;
        }
      });
    }
    if (missedCount > 0) {
      setScore(prev => ({ ...prev, incorrect: prev.incorrect + missedCount }));
    }
    setSubmitted(true);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 3000);
  };

  // Regenerate: fetch a new sentence without evaluating the current one
  const handleRegenerate = () => {
    fetchSentence();
  };

  // Next: update progress and fetch the next sentence
  const handleNext = () => {
    const sentenceAccuracy = parseFloat(computeSentenceAccuracy());
    let newLevel = stats.currentLevel;
    if (sentenceAccuracy >= 80) {
      newLevel = Math.min(100, stats.currentLevel + 5);
    } else if (sentenceAccuracy < 50) {
      newLevel = Math.max(1, stats.currentLevel - 5);
    }
    setStats({ accuracy: sentenceAccuracy, currentLevel: newLevel });
    fetchSentence();
  };

  // Toggle the Reveal Mistakes panel
  const handleRevealMistakes = () => {
    setShowMistakes(!showMistakes);
  };

  // Handle Analyze:
  // - If analysis feedback already exists, toggle the analysis panel.
  // - If no mistakes exist (score.incorrect <= 0), pick a random encouraging message.
  // - Otherwise, send an analysis request to the backend with the list of mistakes.
  const handleAnalyze = async () => {
    // If feedback already exists, toggle panel visibility
    if (analysisFeedback && (analysisFeedback.message || Object.keys(analysisFeedback).length > 0)) {
      setShowAnalysis(!showAnalysis);
      return;
    }
    // If no mistakes, display an encouraging message
    if (score.incorrect <= 0) {
      const encouragements = [
        "Great job! No mistakes!",
        "Fantastic! You're perfect!",
        "Kudos! No errors found!",
        "Excellent work, all correct!",
        "Bravo! You made no mistakes!",
        "Superb performance!",
        "Impressive! No errors detected!",
        "You're a spelling champ!",
        "Outstanding! No errors!",
        "Keep it up! Perfect round!"
      ];
      const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
      setAnalysisFeedback({ message: randomMessage });
      setShowAnalysis(true);
      return;
    }
    setAnalyzing(true);
    // Gather mistakes: missed errors and false positives.
    let mistakes = [];
    if (sentenceData) {
      const words = sentenceData.sentence.split(' ');
      // Missed errors: error words that were not clicked.
      sentenceData.errors.forEach(errorStr => {
        const cleanedError = cleanText(errorStr);
        const indices = words
          .map((w, idx) => (cleanText(w) === cleanedError ? idx : null))
          .filter(idx => idx !== null);
        if (!indices.some(idx => clickedIndices.includes(idx))) {
          mistakes.push(errorStr);
        }
      });
      // False positives: clicked words that are not errors.
      clickedIndices.forEach(idx => {
        const word = words[idx];
        const cleanedWord = cleanText(word);
        if (!sentenceData.errors.some(errorStr => cleanText(errorStr) === cleanedWord)) {
          mistakes.push(word);
        }
      });
    }

    try {
      const response = await fetch('http://localhost:3000/analyze-mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mistakes })
      });
      if (!response.ok) throw new Error('Analysis request failed');
      const data = await response.json();
      // Expect backend to return a "suggestions" object with keys as mistake words
      setAnalysisFeedback(data.suggestions);
      setShowAnalysis(true);
    } catch (err) {
      console.error(err);
      setAnalysisFeedback({ message: "Analysis failed. Please try again." });
      setShowAnalysis(true);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-extrabold text-purple-800 mb-4">Spelling Safari: The Great Hunt</h1>
      {loading ? (
        <p className="text-lg text-gray-700">Loading sentence...</p>
      ) : error ? (
        <p className="text-lg text-red-500">{error}</p>
      ) : sentenceData ? (
        <>
          {/* Sentence Display */}
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full">
            <p className="text-2xl font-medium mb-4 break-words whitespace-normal leading-relaxed">
              {sentenceData.sentence.split(' ').map((word, index) => (
                <span
                  key={index}
                  onClick={() => handleWordClick(word, index)}
                  className={`cursor-pointer mr-2 inline-block transition-colors duration-200 ${
                    feedback[index] === 'correct'
                      ? 'text-green-600 font-bold'
                      : feedback[index] === 'incorrect'
                      ? 'text-red-600 font-bold'
                      : 'text-gray-800'
                  }`}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>

          {/* Performance Animation */}
          {submitted && showAnimation && (
            <div className="mt-4">
              <p className="text-3xl animate-bounce">⭐️⭐️⭐️</p>
            </div>
          )}

          {/* Game Stats */}
          <div className="mt-6 bg-white p-4 rounded-lg shadow-md w-full max-w-md text-center">
            <p className="text-lg">
              Sentence Accuracy: <span className="font-bold">{computeSentenceAccuracy()}%</span>
            </p>
            <p className="text-lg">
              Score: <span className="font-bold">{score.correct}</span> correct, <span className="font-bold">{score.incorrect}</span> incorrect
            </p>
            <p className="text-lg">Streak: <span className="font-bold">{score.streak}</span></p>
            <p className="text-lg mt-2">
              User Level: <span className="font-bold">{stats.currentLevel}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {!submitted ? (
              <>
                <button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:from-green-500 hover:to-blue-600 transition-all duration-300 text-xl font-semibold"
                >
                  Submit
                </button>
                <button
                  onClick={handleRegenerate}
                  className="bg-gray-300 text-gray-800 px-6 py-3 rounded-full shadow-lg hover:bg-gray-400 transition-all duration-300 text-xl font-semibold"
                >
                  Regenerate
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:from-purple-500 hover:to-pink-600 transition-all duration-300 text-xl font-semibold"
                >
                  Next
                </button>
                <button
                  onClick={handleRevealMistakes}
                  className="bg-yellow-300 text-yellow-800 px-6 py-3 rounded-full shadow-lg hover:bg-yellow-400 transition-all duration-300 text-xl font-semibold"
                >
                  {showMistakes ? "Hide Mistakes" : "Reveal Mistakes"}
                </button>
                <button
                  onClick={handleAnalyze}
                  className="bg-blue-300 text-blue-800 px-6 py-3 rounded-full shadow-lg hover:bg-blue-400 transition-all duration-300 text-xl font-semibold"
                  disabled={analyzing}
                >
                  {analyzing ? "Analyzing..." : "Analyze"}
                </button>
              </>
            )}
          </div>

          {/* Mistakes Panel */}
          {submitted && showMistakes && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow-md w-full max-w-md text-center">
              <h2 className="text-xl font-bold mb-2">Error Details</h2>
              {sentenceData.errors.map((errorStr, i) => (
                <p key={i} className="text-lg">
                  Error: <span className="font-bold">{errorStr}</span>
                </p>
              ))}
            </div>
          )}

          {/* Analysis Feedback Panel */}
          {submitted && showAnalysis && analysisFeedback && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow-md w-full max-w-md text-left">
              <h2 className="text-xl font-bold mb-2">Improvement Suggestions</h2>
              {analysisFeedback.message ? (
                // If we received an encouraging message (no mistakes or all correct)
                <p className="text-lg">{analysisFeedback.message}</p>
              ) : (
                // Otherwise, if suggestions exist, filter out any suggestion with error_type "None"
                <>
                  {Object.entries(analysisFeedback)
                    .filter(([mistake, suggestion]) => suggestion.error_type !== "None")
                    .length > 0 ? (
                    Object.entries(analysisFeedback)
                      .filter(([mistake, suggestion]) => suggestion.error_type !== "None")
                      .map(([mistake, suggestion], i) => (
                        <div key={i} className="mb-4 border-b pb-2">
                          <p className="text-lg"><strong>Mistake:</strong> {mistake}</p>
                          <p className="text-lg"><strong>Corrected Spelling:</strong> {suggestion.suggestion}</p>
                          <p className="text-lg"><strong>Explanation:</strong> {suggestion.explanation}</p>
                          <p className="text-lg"><strong>Error Pattern:</strong> {suggestion.error_pattern}</p>
                        </div>
                      ))
                  ) : (
                    <p className="text-lg">No errors detected. Excellent work!</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default App;
