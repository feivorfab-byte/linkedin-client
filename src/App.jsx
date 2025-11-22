import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Copy, RefreshCw, Zap, Package, Sparkles, Send } from 'lucide-react';

// Get API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; 

const App = () => {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [template, setTemplate] = useState('General');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState(''); // NEW state for refinement
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) setAnswer(prev => prev + ' ' + finalTranscript);
      };
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };

  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  // --- Image Processing (No change, keeping full code for replacement) ---
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1500;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setLoading(true);
    try {
      const processedImages = await Promise.all(files.map(processImage));
      setImages(prev => [...prev, ...processedImages]);
    } catch (err) {
      alert("Error processing photo. Try taking a screenshot of it instead.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  // --------------------------------------------

  // --- Core Logic ---

  const analyzeImages = async (recycle = false) => {
    if (images.length === 0) return alert("Please upload a photo first!");
    setLoading(true);
    setSelectedQuestion(null); // Reset selection on new analysis
    setAnswer(''); // Reset answer on new analysis
    
    // Add a flag to the server request for recycling
    const promptModifier = recycle ? "Generate entirely new and different questions than the previous set." : "";

    try {
      const res = await fetch(`${API_URL}/api/analyze-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, template, promptModifier })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setQuestions(data.questions);
      setStep(2);
    } catch (err) {
      alert("Error analyzing images: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Toggle Question Selection and Visibility
  const toggleQuestion = (questionText) => {
    if (selectedQuestion === questionText) {
      // Deselect and show all
      setSelectedQuestion(null);
    } else {
      // Select and hide others
      setSelectedQuestion(questionText);
      setAnswer(''); // Clear answer when a new question is selected
    }
  };

  const generatePost = async () => {
    if (!selectedQuestion || !answer) return alert("Please select a question and provide an answer!");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: selectedQuestion, answer, template })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedPost(data.post);
      setStep(3);
    } catch (err) {
      alert("Error generating post: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Refine Post Logic
  const refinePost = async () => {
    if (!refinementPrompt) return alert("Please type what you want to change first.");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/refine-post`, { // NEW endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPost: generatedPost, 
          refinementPrompt: refinementPrompt 
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setGeneratedPost(data.post); // Update the post with the refined version
      setRefinementPrompt(''); // Clear refinement prompt
    } catch (err) {
      alert("Error refining post: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  // -----------------------

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      alert("Copied!");
    } catch (err) {
      alert("Manual copy needed.");
    }
  };

  const resetApp = () => {
    setStep(1); 
    setImages([]); 
    setAnswer(''); 
    setGeneratedPost(''); 
    setSelectedQuestion(null);
    setQuestions([]);
    setRefinementPrompt('');
  }

  const templates = [
    { id: 'General', icon: <Sparkles size={20}/>, label: 'Standard' },
    { id: 'Rush', icon: <Zap size={20}/>, label: 'Rush Job' },
    { id: 'Technical', icon: <Package size={20}/>, label: 'Complex' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto font-sans text-gray-800">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-blue-900">Post Gen</h1>
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Step {step}/3</div>
      </header>

      {step === 1 && (
        <div className="space-y-6">
          {/* Templates */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <label className="text-sm font-semibold text-gray-500 mb-2 block">Select Style</label>
            <div className="flex gap-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)} className={`flex-1 flex flex-col items-center p-3 rounded-lg border ${template === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  {t.icon}<span className="text-xs mt-1 font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-dashed border-blue-200 text-center">
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Camera className="w-12 h-12 text-blue-400 mb-2" />
              <span className="text-blue-600 font-semibold">Tap to Take Photo</span>
            </label>
          </div>

          {/* Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <img key={i} src={img} className="w-full h-24 object-cover rounded-lg" alt="preview" />
              ))}
            </div>
          )}

          <button onClick={() => analyzeImages(false)} disabled={loading || images.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">
            {loading ? 'Processing...' : 'Analyze Project'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Choose a Question:</h2>
            <button onClick={() => analyzeImages(true)} disabled={loading} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Recycle
            </button>
          </div>
          
          <div className="space-y-3">
            {questions.map((q, i) => {
              const isSelected = selectedQuestion === q.text;
              const isHidden = selectedQuestion !== null && !isSelected;

              return (
                <button 
                  key={i} 
                  onClick={() => toggleQuestion(q.text)} 
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ease-in-out 
                    ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'bg-white'}
                    ${isHidden ? 'opacity-0 h-0 p-0 m-0 border-none pointer-events-none' : 'h-auto opacity-100'}`}
                  style={{ overflow: 'hidden' }}
                >
                  {q.text}
                </button>
              )
            })}
          </div>
          
          {selectedQuestion && (
            <div className="bg-white p-4 rounded-xl shadow-sm relative">
              <textarea 
                value={answer} 
                onChange={(e) => setAnswer(e.target.value)} 
                className="w-full h-32 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                placeholder={`Tell me more about the selected topic: ${selectedQuestion}`} 
              />
              <button 
                onClick={toggleRecording} 
                className={`absolute bottom-6 right-6 p-2 rounded-full shadow-md transition-colors 
                  ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
          )}
          
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-200 py-4 rounded-xl font-bold">Back</button>
            <button onClick={generatePost} disabled={loading || !selectedQuestion || !answer} className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">
              {loading ? 'Writing...' : 'Generate Post'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="font-bold text-lg">Generated Post Draft:</h2>
          
          {/* Post Display */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-medium">{generatedPost}</div>
          </div>

          {/* Refinement Area */}
          <div className="bg-white p-4 rounded-xl shadow-sm relative border border-blue-100">
            <h3 className="text-sm font-semibold mb-2">Refine Post:</h3>
            <textarea 
              value={refinementPrompt} 
              onChange={(e) => setRefinementPrompt(e.target.value)} 
              className="w-full h-16 p-3 border rounded-lg resize-none" 
              placeholder="e.g. Make it shorter and use less technical terms." 
            />
            <button 
              onClick={refinePost} 
              disabled={loading || !refinementPrompt} 
              className="absolute bottom-6 right-6 p-2 rounded-full bg-blue-600 text-white shadow-md disabled:bg-blue-300 hover:bg-blue-700 transition"
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          <button onClick={copyToClipboard} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg flex justify-center gap-2"><Copy size={20} /> Copy to Clipboard</button>
          <button onClick={resetApp} className="w-full bg-white border-2 border-gray-200 text-gray-600 py-4 rounded-xl font-bold flex justify-center gap-2"><RefreshCw size={20} /> Start New Post</button>
        </div>
      )}
    </div>
  );
}
export default App;