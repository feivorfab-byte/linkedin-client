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

  return
