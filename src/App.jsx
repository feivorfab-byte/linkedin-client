import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Sparkles, History, ChevronDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [images, setImages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generatedPost, setGeneratedPost] = useState('');
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  
  // New state for controls
  const [tone, setTone] = useState('balanced');
  const [length, setLength] = useState('medium');
  const [showVariations, setShowVariations] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-history`);
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((imageData) => {
      setImages(imageData);
      setQuestions([]);
      setAnswers({});
      setGeneratedPost('');
      setVariations([]);
      setError('');
    });
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions || []);
        setHashtags(data.hashtags || []);
        setAnswers({});
      } else {
        setError(data.error || 'Failed to analyze images');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    const unanswered = questions.find((q) => !answers[q.id]);
    if (unanswered) {
      setError('Please answer all questions before generating a post');
      return;
    }

    setLoading(true);
    setError('');
    setShowVariations(false);

    try {
      const combinedAnswer = questions
        .map((q) => `${q.text}\n${answers[q.id]}`)
        .join('\n\n');

      const response = await fetch(`${API_BASE_URL}/api/generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions.map(q => q.text).join(' | '),
          answer: combinedAnswer,
          tone,
          length,
          hashtags
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedPost(data.post);
        // Auto-save to history
        await saveToHistory(data.post);
      } else {
        setError(data.error || 'Failed to generate post');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateVariations = async () => {
    const unanswered = questions.find((q) => !answers[q.id]);
    if (unanswered) {
      setError('Please answer all questions before generating variations');
      return;
    }

    setLoadingVariations(true);
    setError('');

    try {
      const combinedAnswer = questions
        .map((q) => `${q.text}\n${answers[q.id]}`)
        .join('\n\n');

      const response = await fetch(`${API_BASE_URL}/api/generate-variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions.map(q => q.text).join(' | '),
          answer: combinedAnswer,
          length,
          hashtags
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVariations(data.variations || []);
        setShowVariations(true);
      } else {
        setError(data.error || 'Failed to generate variations');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoadingVariations(false);
    }
  };

  const saveToHistory = async (post) => {
    try {
      const combinedAnswer = questions
        .map((q) => `${q.text}\n${answers[q.id]}`)
        .join('\n\n');

      await fetch(`${API_BASE_URL}/api/save-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions.map(q => q.text).join(' | '),
          answer: combinedAnswer,
          post,
          hashtags
        }),
      });

      await loadHistory();
    } catch (err) {
      console.error('Error saving to history:', err);
    }
  };

  const useHistoryPost = (entry) => {
    setGeneratedPost(entry.post);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 text-yellow-400" />
            LinkedIn Post Generator
          </h1>
          <p className="text-xl text-gray-300">
            Transform your fabrication projects into compelling stories
          </p>
        </div>

        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* History Button */}
        <div className="max-w-4xl mx-auto mb-6 flex justify-end">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <History className="w-5 h-5" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="max-w-4xl mx-auto mb-8 bg-white/10 backdrop-blur rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Post History</h2>
            {history.length === 0 ? (
              <p className="text-gray-300">No saved posts yet</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="bg-white/5 rounded p-4 hover:bg-white/10 transition">
                    <p className="text-sm text-gray-400 mb-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <p className="text-white line-clamp-3 mb-2">{entry.post}</p>
                    <button
                      onClick={() => useHistoryPost(entry)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Use this post →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image Upload */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-8 border-2 border-dashed border-white/20 hover:border-purple-400 transition">
            <label className="cursor-pointer flex flex-col items-center">
              <Upload className="w-16 h-16 text-purple-400 mb-4" />
              <span className="text-xl text-white mb-2">Upload Project Images</span>
              <span className="text-sm text-gray-400">Click or drag images here</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>

        {images.length > 0 && questions.length === 0 && (
          <div className="max-w-4xl mx-auto mb-8 text-center">
            <button
              onClick={analyzeImages}
              disabled={loading}
              className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-lg font-semibold flex items-center gap-3 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Images
                </>
              )}
            </button>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="max-w-4xl mx-auto mb-8 bg-white/10 backdrop-blur rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Answer These Questions</h2>
            
            {/* Generated Hashtags */}
            {hashtags.length > 0 && (
              <div className="mb-6 p-4 bg-purple-500/20 rounded-lg">
                <p className="text-sm text-purple-200 mb-2">Suggested Hashtags:</p>
                <p className="text-white">{hashtags.join(' ')}</p>
              </div>
            )}

            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-white font-medium mb-2">
                    <span className="text-purple-400">{q.category}:</span> {q.text}
                  </label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    rows="3"
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>

            {/* Tone and Length Controls */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="technical">Technical (Industry Pros)</option>
                  <option value="balanced">Balanced (Mixed Audience)</option>
                  <option value="accessible">Accessible (General Public)</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="short">Short (~150 words)</option>
                  <option value="medium">Medium (~350 words)</option>
                  <option value="long">Long (~550 words)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={generatePost}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Post
                  </>
                )}
              </button>

              <button
                onClick={generateVariations}
                disabled={loadingVariations}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {loadingVariations ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5" />
                    Generate 3 Variations
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Generated Post */}
        {generatedPost && !showVariations && (
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your LinkedIn Post</h2>
            <div className="bg-white rounded-lg p-6">
              <p className="text-gray-800 whitespace-pre-wrap">{generatedPost}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedPost);
                alert('Copied to clipboard!');
              }}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        {/* Variations */}
        {showVariations && variations.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Choose Your Style</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {variations.map((variant, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur rounded-lg p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-2">{variant.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{variant.description}</p>
                  <div className="bg-white rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{variant.post}</p>
                  </div>
                  <button
                    onClick={() => {
                      setGeneratedPost(variant.post);
                      setShowVariations(false);
                      saveToHistory(variant.post);
                    }}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Use This Version
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
