import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Copy, RefreshCw, Zap, Package, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; 

const App = () => {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [template, setTemplate] = useState('General');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })).then(results => setImages(prev => [...prev, ...results]));
  };

  const analyzeImages = async () => {
    if (images.length === 0) return alert("Please upload a photo first!");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/analyze-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, template })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions);
      setStep(2);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    if (!answer) return alert("Please answer the question!");
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
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      alert("Copied!");
    } catch (err) {
      alert("Manual copy needed.");
    }
  };

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
          <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-dashed border-blue-200 text-center">
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Camera className="w-12 h-12 text-blue-400 mb-2" />
              <span className="text-blue-600 font-semibold">Tap to Take Photo</span>
            </label>
          </div>
          {images.length > 0 && <div className="grid grid-cols-3 gap-2">{images.map((img, i) => <img key={i} src={img} className="w-full h-24 object-cover rounded-lg" alt="preview" />)}</div>}
          <button onClick={analyzeImages} disabled={loading || images.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">{loading ? 'Analyzing...' : 'Analyze Project'}</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Choose a Question:</h2>
            {questions.map((q, i) => (
              <button key={i} onClick={() => setSelectedQuestion(q.text)} className={`w-full text-left p-4 rounded-xl border ${selectedQuestion === q.text ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}>{q.text}</button>
            ))}
          </div>
          {selectedQuestion && (
            <div className="bg-white p-4 rounded-xl shadow-sm relative">
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full h-32 p-3 border rounded-lg" placeholder="We used 2-inch foam..." />
              <button onClick={toggleRecording} className={`absolute bottom-3 right-3 p-2 rounded-full shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100'}`}>{isRecording ? <MicOff size={20} /> : <Mic size={20} />}</button>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-200 py-4 rounded-xl font-bold">Back</button>
            <button onClick={generatePost} disabled={loading || !selectedQuestion || !answer} className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">{loading ? 'Writing...' : 'Generate Post'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{generatedPost}</div></div>
          <button onClick={copyToClipboard} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg flex justify-center gap-2"><Copy size={20} /> Copy</button>
          <button onClick={() => { setStep(1); setImages([]); setAnswer(''); setGeneratedPost(''); }} className="w-full bg-white border-2 border-gray-200 text-gray-600 py-4 rounded-xl font-bold flex justify-center gap-2"><RefreshCw size={20} /> New Post</button>
        </div>
      )}
    </div>
  );
}
export default App;
