import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Bot, 
  User, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Database, 
  Flame, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Phone,
  Mail,
  Key,
  Check,
  Square,
  Play,
  RotateCcw,
  Zap,
  UserCheck,
  UserPlus,
  Edit3,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { interactWithAgent, getSettingsStatus, registerCandidate, sendDeepgramVoiceTurn, getLiveKitToken } from '../api';

export default function VoiceAgentPage({ onOpenBookingWithData, onOpenApiKeyModal }) {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [consultationStatus, setConsultationStatus] = useState('Idle'); // 'Idle', 'In Consultation'
  const [micError, setMicError] = useState(null);
  const [engineStatus, setEngineStatus] = useState(null);
  const [voiceMode, setVoiceMode] = useState('browser'); // 'browser' | 'deepgram' | 'livekit'
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Candidate Registration & Profile State
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    phone: '',
    interested_course: 'Java Enterprise & Microservices'
  });
  const [isCandidateRegistered, setIsCandidateRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [highlightRegistration, setHighlightRegistration] = useState(false);
  const [regError, setRegError] = useState(null);
  
  // Real-time Lead Qualification State
  const [leadProfile, setLeadProfile] = useState({
    name: null,
    email: null,
    phone: null,
    interested_course: null,
    score: 10,
    category: 'Cold',
    sentiment: 'Neutral'
  });

  // Last RAG Sources
  const [ragSources, setRagSources] = useState([]);
  const [showRagSources, setShowRagSources] = useState(true);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedSpeechRef = useRef('');

  // Live state refs to prevent React stale closure bugs with speech recognition
  const isCandidateRegisteredRef = useRef(isCandidateRegistered);
  const candidateInfoRef = useRef(candidateInfo);

  useEffect(() => {
    isCandidateRegisteredRef.current = isCandidateRegistered;
  }, [isCandidateRegistered]);

  useEffect(() => {
    candidateInfoRef.current = candidateInfo;
  }, [candidateInfo]);

  // Initialize Session
  const initNewSession = () => {
    const newSession = 'sess_' + Math.random().toString(36).substring(2, 10);
    setSessionId(newSession);
    setConsultationStatus('Idle');
    setMessages([]);
    setLiveTranscript('');
    accumulatedSpeechRef.current = '';
    setLeadProfile({
      name: candidateInfo.name || null,
      email: candidateInfo.email || null,
      phone: candidateInfo.phone || null,
      interested_course: candidateInfo.interested_course || null,
      score: isCandidateRegistered ? 45 : 10,
      category: isCandidateRegistered ? 'Warm' : 'Cold',
      sentiment: 'Neutral'
    });
  };

  useEffect(() => {
    initNewSession();

    getSettingsStatus()
      .then(data => setEngineStatus(data))
      .catch(() => {});

    // Setup Web Speech Recognition with Continuous & Interim support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
        setLiveTranscript('');
        accumulatedSpeechRef.current = '';
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (finalChunk) {
          accumulatedSpeechRef.current += (accumulatedSpeechRef.current ? ' ' : '') + finalChunk.trim();
        }

        const fullSpokenText = (accumulatedSpeechRef.current + ' ' + interimChunk).trim();
        setLiveTranscript(fullSpokenText);

        // Reset silence detection timer (0.9 seconds of silence = fast auto-submit)
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          finishAndSubmitVoice();
        }, 900);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setMicError('Microphone permission denied. Please allow microphone access or use the text chat/interview demo below.');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setMicError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Sync speech recognition language when user changes dropdown
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, isLoading]);

  // Multilingual Greetings
  const greetings = {
    'en-IN': "Hello and welcome to VoxSales Academy! I am VoxSales, your autonomous sales counselor. How can I help boost your tech career today?",
    'hi-IN': "नमस्ते और वोक्ससेल्स एकेडमी में आपका स्वागत है! मैं आपकी AI सलाहकार हूँ। मैं आज आपकी टेक करियर में क्या सहायता कर सकती हूँ?",
    'te-IN': "నమస్కారం! VoxSales Academy కి స్వాగతం. నేను మీ AI కెరీర్ అడ్వైజర్ ని. మీ టెక్ కెరీర్ ని ముందుకు తీసుకెళ్లడానికి నేను ఎలా సహాయపడగలను?",
    'ta-IN': "வணக்கம்! VoxSales Academy-க்கு உங்களை வரவேற்கிறோம். நான் உங்கள் AI ஆலோசகர். உங்கள் தொழில்நுட்ப வாழ்க்கைக்கு நான் எவ்வாறு உதவ முடியும்?",
    'kn-IN': "ನಮಸ್ಕಾರ! VoxSales Academy ಗೆ ಸುಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ AI ಸಲಹೆಗಾರ್ತಿ. ನಿಮ್ಮ ತಂತ್ರಜ್ಞಾನ ವೃತ್ತಿಜೀವನಕ್ಕೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    'ml-IN': "നമസ്കാരം! VoxSales Academy-ലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ AI കൺസൾട്ടന്റാണ്. നിങ്ങളുടെ കരിയർ വളർച്ചയ്ക്ക് ഞാൻ എങ്ങനെ സഹായിക്കണം?",
    'en-US': "Hello and welcome to VoxSales Academy! I am your AI education counselor. What questions can I answer for you today?"
  };

  // Localized Demo Scenarios
  const localizedDemoScenarios = {
    'en-IN': [
      { badge: 'Fees & Duration', query: 'What is the cost of java and the duration' },
      { badge: 'Placements', query: 'What placement assistance and packages do you offer?' },
      { badge: 'Curriculum', query: 'What is covered in the Full Stack Web Development cohort?' },
      { badge: 'Booking', query: 'I would like to book a 1-on-1 counseling slot for tomorrow.' }
    ],
    'te-IN': [
      { badge: 'ఫీజు & వ్యవధి', query: 'జావా కోర్సు ఫీజు ఎంత మరియు వ్యవధి ఎంత?' },
      { badge: 'ప్లేస్‌మెంట్స్', query: 'ప్లేస్‌మెంట్ సహాయం మరియు జీతం ప్యాకేజీలు ఎలా ఉంటాయి?' },
      { badge: 'సిలబస్', query: 'ఫుల్ స్టాక్ వెబ్ డెవలప్‌మెంట్‌లో ఏయే టాపిక్స్ నేర్పుతారు?' },
      { badge: 'బుకింగ్', query: 'నేను రేపటికి 1-ఆన్-1 కౌన్సెలింగ్ స్లాట్ బుక్ చేయాలనుకుంటున్నాను.' }
    ],
    'hi-IN': [
      { badge: 'फीस और समय', query: 'जावा कोर्स की फीस और समय कितना है?' },
      { badge: 'प्लेसमेंट', query: 'प्लेसमेंट सहायता और औसत पैकेज क्या है?' },
      { badge: 'सिलेबस', query: 'फुल स्टैक वेब डेवलपमेंट में क्या-क्या सिखाया जाएगा?' },
      { badge: 'बुकिंग', query: 'मैं कल के लिए काउंसलिंग स्लॉट बुक करना चाहता हूँ।' }
    ]
  };

  const finishAndSubmitVoice = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    const fullText = (accumulatedSpeechRef.current + ' ' + liveTranscript).trim();
    if (fullText) {
      handleSendMessage(fullText, 'voice');
    }
    setLiveTranscript('');
    accumulatedSpeechRef.current = '';
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
  };

  // Speech Synthesis (TTS)
  const speakResponse = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Strip bracketed metadata or markdown from voice speech
    const cleanSpeech = text
      .replace(/\[SECTION:[^\]]+\]/g, '')
      .replace(/[*_#`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = voices.find(v => v.lang === selectedLanguage && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google')));
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.lang === selectedLanguage);
    }
    if (!preferredVoice && selectedLanguage.startsWith('te')) {
      preferredVoice = voices.find(v => v.lang.startsWith('te') || v.lang.startsWith('hi'));
    }
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en'));
    }
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Start Conversation (From top banner)
  const handleStartConversation = () => {
    setConsultationStatus('In Consultation');
    if (!isCandidateRegistered) {
      const gatingGreeting = "Welcome to VoxSales Academy! Please fill in your details in the Candidate Details form on the right first. Once you click 'Save & Enable Chat', you can ask all your queries, and your consultation will be saved under your name in Call History.";
      setMessages([
        {
          role: 'assistant',
          content: gatingGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setHighlightRegistration(true);
      setTimeout(() => setHighlightRegistration(false), 3500);
      if (autoSpeak) {
        speakResponse(gatingGreeting);
      }
      return;
    }

    let greeting = greetings[selectedLanguage] || greetings['en-IN'];
    if (candidateInfo.name) {
      greeting = `Hello ${candidateInfo.name}! Welcome to VoxSales Academy. I am VoxSales, your AI tech advisor. How can I assist you with your career goals today?`;
    }
    
    setMessages([
      {
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (autoSpeak) {
      speakResponse(greeting);
    }
  };

  // End Conversation (From top banner)
  const handleEndConversation = () => {
    stopAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setConsultationStatus('Idle');
    setLiveTranscript('');
  };

  const toggleListening = async () => {
    if (isSpeaking) {
      stopAudio();
    }

    if (voiceMode === 'deepgram') {
      if (isListening && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsListening(false);
        return;
      }
      try {
        setConsultationStatus('In Consultation');
        setMicError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const fd = new FormData();
          fd.append('audio', blob, 'turn.webm');
          fd.append('session_id', sessionId);
          fd.append('language', selectedLanguage);
          if (candidateInfoRef.current?.name) fd.append('candidate_name', candidateInfoRef.current.name);
          if (candidateInfoRef.current?.email) fd.append('candidate_email', candidateInfoRef.current.email);
          if (candidateInfoRef.current?.phone) fd.append('candidate_phone', candidateInfoRef.current.phone);
          try {
            setIsLoading(true);
            const data = await sendDeepgramVoiceTurn(fd);
            if (!data.user_text) {
              setMicError(data.audio_error || 'No speech detected by Deepgram.');
              return;
            }
            setMessages((prev) => [
              ...prev,
              { role: 'user', content: data.user_text, mode: 'deepgram', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              { role: 'assistant', content: data.reply, sentiment: data.sentiment, provider: data.provider || 'fallback', is_fallback: Boolean(data.is_fallback), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ]);
            if (data.audio_base64 && autoSpeak) {
              const audio = new Audio(`data:${data.audio_content_type || 'audio/mpeg'};base64,${data.audio_base64}`);
              audio.onplay = () => setIsSpeaking(true);
              audio.onended = () => setIsSpeaking(false);
              audio.play().catch(() => {});
            }
          } catch (err) {
            setMicError(err.message || 'Deepgram voice turn failed.');
          } finally {
            setIsLoading(false);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
      } catch (err) {
        setMicError(err.message || 'Microphone access denied.');
        setIsListening(false);
      }
      return;
    }

    if (!recognitionRef.current) {
      setMicError('Speech recognition is not available in your browser.');
      return;
    }

    if (isListening) {
      finishAndSubmitVoice();
    } else {
      try {
        setConsultationStatus('In Consultation');
        setMicError(null);
        setLiveTranscript('');
        accumulatedSpeechRef.current = '';
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Handle Candidate Registration Submission
  const handleRegisterCandidate = async (e) => {
    if (e) e.preventDefault();
    const cleanName = candidateInfo.name.trim() || 'Chinnavula Manisha';
    const cleanEmail = candidateInfo.email.trim() || 'chkavya209912@gmail.com';
    const cleanPhone = candidateInfo.phone.trim() || '+91 98765 43210';
    const cleanCourse = candidateInfo.interested_course || 'Java Enterprise & Microservices';

    setRegistering(true);
    setRegError(null);

    try {
      await registerCandidate({
        session_id: sessionId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        interested_course: cleanCourse
      });

      isCandidateRegisteredRef.current = true;
      candidateInfoRef.current = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        interested_course: cleanCourse
      };
      setIsCandidateRegistered(true);
      setCandidateInfo({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        interested_course: cleanCourse
      });
      setHighlightRegistration(false);
      setConsultationStatus('In Consultation');

      const welcomeReply = `Thank you, ${cleanName}! Your details have been saved and linked to Call History. You can now ask any question about our live cohorts, curriculum, duration, or fees. What would you like to explore?`;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: welcomeReply,
          sentiment: 'Positive',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setLeadProfile({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        interested_course: cleanCourse,
        category: 'Warm',
        score: 50,
        sentiment: 'Positive'
      });

      if (autoSpeak) {
        speakResponse(welcomeReply);
      }
    } catch (err) {
      setRegError(err.message || 'Failed to register candidate profile.');
    } finally {
      setRegistering(false);
    }
  };

  const handleSendMessage = async (text, mode = 'text') => {
    if (!text.trim() || isLoading) return;

    // Stop speaking & mic
    stopAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }

    // STRICT GATING: Must fill and save details first (check live ref to avoid stale closures)
    const isRegistered = isCandidateRegisteredRef.current || isCandidateRegistered || Boolean(candidateInfoRef.current?.name?.trim());
    if (!isRegistered) {
      setConsultationStatus('In Consultation');
      const userMessage = {
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const gatingReply = "Welcome to VoxSales Academy! Please fill in your details on the right and click 'Save & Enable Chat' first. Once saved, you can ask all your queries, and your consultation will be recorded under your name in Call History.";

      const assistantMessage = {
        role: 'assistant',
        content: gatingReply,
        sentiment: 'Neutral',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setInputText('');
      setLiveTranscript('');
      setHighlightRegistration(true);
      setTimeout(() => setHighlightRegistration(false), 3500);

      if (autoSpeak) {
        speakResponse(gatingReply);
      }
      return;
    }

    setConsultationStatus('In Consultation');

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLiveTranscript('');
    setIsLoading(true);

    try {
      const activeCandidate = {
        name: candidateInfoRef.current?.name?.trim() || candidateInfo.name.trim() || 'Chinnavula Manisha',
        email: candidateInfoRef.current?.email?.trim() || candidateInfo.email.trim() || 'chkavya209912@gmail.com',
        phone: candidateInfoRef.current?.phone?.trim() || candidateInfo.phone.trim() || '+91 98765 43210'
      };

      const data = await interactWithAgent(sessionId, text, mode, selectedLanguage, activeCandidate);

      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        sentiment: data.sentiment,
        provider: data.provider || 'fallback',
        is_fallback: Boolean(data.is_fallback),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update lead qualifications
      if (data.lead) {
        setLeadProfile(prev => ({
          ...prev,
          name: data.lead.name || candidateInfo.name || prev.name,
          email: data.lead.email || candidateInfo.email || prev.email,
          phone: data.lead.phone || candidateInfo.phone || prev.phone,
          interested_course: data.lead.interested_course || candidateInfo.interested_course || prev.interested_course,
          score: data.lead.score ?? prev.score,
          category: data.lead.category || prev.category,
          sentiment: data.sentiment || prev.sentiment,
          bant: data.bant || prev.bant,
          memories: data.memories || prev.memories
        }));
      }

      // Update RAG chunks
      if (data.rag_sources) {
        setRagSources(data.rag_sources);
      }

      // Speak aloud
      if (autoSpeak) {
        speakResponse(data.reply);
      }
    } catch (err) {
      console.error('Agent error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "We offer career cohorts in Python, Java, Full Stack, AI, and DSA with 100% placement support. Would you like to check available slots for a 1-on-1 counseling session?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const demoScenarios = localizedDemoScenarios[selectedLanguage] || localizedDemoScenarios['en-IN'];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-5 h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* 1. TOP NAVY CONSULTANT CARD */}
      <div className="bg-[#0c1427] text-white rounded-2xl p-5 border border-slate-800 shadow-xl shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Avatar & Identity */}
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-cyan-500/25 shrink-0">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  VoxSales — Autonomous Tech Sales Consultant
                </h2>
                <button
                  onClick={onOpenApiKeyModal}
                  title="Configure AI Inference Engine (Groq LPU / Gemini)"
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer transition shadow-xs"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>{engineStatus?.groq_active ? 'Groq LPU (300ms)' : (engineStatus?.gemini_active ? 'Gemini Flash' : 'AI Counselor')}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300/80 font-medium">
                {consultationStatus === 'Idle' 
                  ? (isCandidateRegistered ? `Ready to consult with ${candidateInfo.name}` : 'Enter candidate details on the right to start consultation')
                  : isSpeaking 
                    ? 'VoxSales is speaking to candidate...' 
                    : isListening 
                      ? 'Listening to customer speech...' 
                      : 'Live Consultation Active — 100% Placement Counselor'}
              </p>
            </div>
          </div>

          {/* Right Action Controls: Language + Start / End Buttons */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#14213d] text-slate-200 border border-slate-700/80 text-xs font-semibold px-3 py-2 rounded-xl outline-none cursor-pointer hover:border-slate-600 transition"
              >
                <option value="en-IN">English (India) ▼</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                <option value="ml-IN">Malayalam (മലയാളം)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <button
              onClick={handleStartConversation}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-700/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Conversation</span>
            </button>

            <button
              onClick={handleEndConversation}
              className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 active:scale-95 font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>End Conversation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CONTAINER (2-COLUMN: Chat on Left, Candidate Registration on Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        {/* LEFT: Chat & Voice Workspace */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
          
          {/* Status Pills & Audio Controls Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Voice Engine Mode Selector */}
              <select
                value={voiceMode}
                onChange={async (e) => {
                  const nextMode = e.target.value;
                  setVoiceMode(nextMode);
                  setMicError(null);
                  if (nextMode === 'livekit') {
                    try {
                      const lk = await getLiveKitToken(sessionId, candidateInfo.name || 'prospect');
                      setMicError(`LiveKit room token minted (${lk.room_name}). Ensure voice-agent/agent.py worker is running to join room.`);
                    } catch (err) {
                      setMicError(err.message);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 outline-none cursor-pointer"
                title="Select Voice Pipeline"
              >
                <option value="browser">Voice: Web Speech API</option>
                <option value="deepgram">Voice: Deepgram STT+TTS</option>
                <option value="livekit">Voice: LiveKit Room</option>
              </select>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                consultationStatus === 'Idle' 
                  ? 'bg-slate-200/80 text-slate-700' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${consultationStatus === 'Idle' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span>Status: <strong>{consultationStatus}</strong></span>
              </span>

              {/* AI Speaking Indicator */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                isSpeaking 
                  ? 'bg-purple-100 text-purple-700 font-semibold border border-purple-300 animate-pulse' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <Volume2 className="w-3 h-3" />
                <span>AI Speaking</span>
              </span>

              {/* Customer Speaking Indicator */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                isListening 
                  ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-300 animate-pulse' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                <Mic className="w-3 h-3" />
                <span>Customer Speaking</span>
              </span>

              {/* Stop Audio Button */}
              {isSpeaking && (
                <button
                  onClick={stopAudio}
                  className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <VolumeX className="w-3 h-3 text-rose-500" />
                  <span>Stop Audio</span>
                </button>
              )}
            </div>

            {/* Auto-Speak Checkbox */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
              />
              <span>Auto-Speak Replies</span>
            </label>
          </div>

          {/* Conversation Transcript Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#fbfcfd]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                <div className="max-w-md space-y-2">
                  {!isCandidateRegistered ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <p className="font-bold flex items-center justify-center gap-1 text-sm">
                        <Lock className="w-4 h-4 text-amber-600" />
                        Candidate Registration Required
                      </p>
                      <p className="text-amber-800">
                        Please fill your <strong>Name, Email & Phone</strong> in the registration panel on the right. Once filled, chat is unlocked and calls are saved under your name in Call History!
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm">
                      Candidate <strong>{candidateInfo.name}</strong> verified! Ask any question or click a scenario below.
                    </p>
                  )}
                </div>

                {/* Interview Demo Cards */}
                <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  {demoScenarios.map((sc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(sc.query, 'text')}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-cyan-400 hover:shadow-md transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
                          {sc.badge}
                        </span>
                        <Play className="w-3 h-3 text-slate-300 group-hover:text-cyan-600 transition" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-cyan-700 transition">
                        {sc.query}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0c1427] text-white rounded-br-xs shadow-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs space-y-2'
                    }`}
                  >
                    <div className={`flex items-center justify-between gap-4 border-b pb-1.5 mb-1.5 ${
                      msg.role === 'user' ? 'border-slate-700/60' : 'border-slate-100'
                    }`}>
                      <span className={`font-bold text-[11px] flex items-center gap-2 ${
                        msg.role === 'user' ? 'text-cyan-300' : 'text-cyan-700'
                      }`}>
                        <span>{msg.role === 'user' ? (candidateInfo.name || 'Candidate') : 'VoxSales (AI Counselor)'}</span>
                        {msg.role === 'assistant' && msg.provider && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            msg.is_fallback ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {msg.is_fallback ? 'Fallback' : msg.provider}
                          </span>
                        )}
                      </span>
                      <span className={`text-[10px] font-mono ${
                        msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    <p className={`whitespace-pre-line text-xs leading-relaxed font-medium ${
                      msg.role === 'user' ? 'text-white' : 'text-slate-800'
                    }`}>
                      {msg.content}
                    </p>

                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <button
                          onClick={() => speakResponse(msg.content)}
                          className="hover:text-cyan-600 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen Again</span>
                        </button>
                        {msg.sentiment && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            Sentiment: {msg.sentiment}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Live Streaming Speech Preview */}
            {liveTranscript && (
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-xl p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-slate-800 text-xs shadow-md space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-amber-700 uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> Live Speech Input
                    </span>
                    <button
                      onClick={finishAndSubmitVoice}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer"
                    >
                      Send Now ✓
                    </button>
                  </div>
                  <p className="italic text-slate-700 font-medium">{liveTranscript}...</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-slate-500 italic">
                <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>VoxSales is synthesizing answer with Groq LPU...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input & Text Fallback Footer */}
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            {micError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Mic Toggle Button */}
              <button
                onClick={toggleListening}
                className={`p-3 rounded-xl flex items-center justify-center transition shadow-md cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isListening ? 'Stop Speaking (or pause for auto-send)' : 'Speak Question with Microphone'}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5 text-cyan-700" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage(inputText, 'text');
                }}
                placeholder={isCandidateRegistered ? "Ask about fees, duration, syllabus, placements..." : "Enter your name, email & phone on the right to start..."}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage(inputText, 'text')}
                disabled={isLoading || !inputText.trim()}
                className="bg-[#0c1427] hover:bg-[#15233e] disabled:opacity-40 text-white p-3 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Candidate Registration & CRM Profile Div */}
        <div className={`w-full lg:w-80 shrink-0 bg-white rounded-2xl border ${
          highlightRegistration 
            ? 'border-amber-400 ring-4 ring-amber-300/50 shadow-xl' 
            : 'border-slate-200 shadow-sm'
        } p-5 flex flex-col justify-between overflow-y-auto transition-all duration-300`}>
          
          <div>
            {/* Div Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  isCandidateRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  {isCandidateRegistered ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    {isCandidateRegistered ? 'Candidate Profile' : 'Candidate Details'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isCandidateRegistered ? 'Linked to Call History' : 'Required to consult & save'}
                  </p>
                </div>
              </div>

              {isCandidateRegistered && (
                <button
                  onClick={() => setIsCandidateRegistered(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer font-medium"
                  title="Edit details"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* UNREGISTERED STATE: Form */}
            {!isCandidateRegistered ? (
              <form onSubmit={handleRegisterCandidate} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-100 text-cyan-900 text-[11px] leading-relaxed">
                  👋 <strong>Hello!</strong> Please enter your contact details. When you ask questions, VoxSales will personalize answers and record calls under your name in <strong>Call History</strong>.
                </div>

                {regError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chinnavula Manisha"
                      value={candidateInfo.name}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. chkavya209912@gmail.com"
                      value={candidateInfo.email}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={candidateInfo.phone}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                    Interested Program
                  </label>
                  <select
                    value={candidateInfo.interested_course}
                    onChange={(e) => setCandidateInfo(prev => ({ ...prev, interested_course: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-slate-800 text-xs bg-white cursor-pointer"
                  >
                    <option value="Python Programming & Automation">Python Programming (INR 3,499)</option>
                    <option value="Java Enterprise & Microservices">Java Enterprise (INR 3,999)</option>
                    <option value="Full Stack Web Development (MERN)">Full Stack MERN/Next.js (INR 4,499)</option>
                    <option value="AI, Machine Learning & LLM Specialist">AI & Machine Learning (INR 4,999)</option>
                    <option value="DSA & System Design Masterclass">DSA & System Design (INR 3,299)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{registering ? 'Saving Profile...' : 'Save & Enable Chat'}</span>
                </button>
              </form>
            ) : (
              /* REGISTERED STATE: Candidate Profile Card */
              <div className="space-y-4 text-xs">
                {/* Profile Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-indigo-600/20">
                      {candidateInfo.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {candidateInfo.name}
                        </h4>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mt-0.5">
                        Active Consultation
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-indigo-100/60 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{candidateInfo.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{candidateInfo.phone}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/60">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Target Course</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {candidateInfo.interested_course}
                    </span>
                  </div>
                </div>

                {/* Live Call History Link & Sync Status */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Call History Synced
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      {sessionId.slice(0, 9)}...
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                    This consultation transcript and AI metrics will be permanently archived under <strong>"{candidateInfo.name}"</strong> in Call History and the Overview CRM table.
                  </p>
                </div>

                {/* Live BANT & Cross-Call Memory */}
                {leadProfile.bant && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[10px]">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>BANT Qualification</span>
                      <span className="text-indigo-700">{leadProfile.bant.total}/100 ({leadProfile.bant.category})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['budget', 'authority', 'need', 'timeline'].map((k) => (
                        <div key={k} className="px-2 py-1 rounded bg-white border border-slate-200 flex items-center justify-between">
                          <span className="capitalize text-slate-600">{k}</span>
                          <span className="font-semibold text-slate-900 capitalize">{leadProfile.bant[k]?.level || 'unknown'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Action: Book counseling slot */}
                <button
                  onClick={() => onOpenBookingWithData({
                    customer_name: candidateInfo.name,
                    email: candidateInfo.email,
                    phone: candidateInfo.phone,
                    course: candidateInfo.interested_course
                  })}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Slot for {candidateInfo.name.split(' ')[0]}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Security / Sync Note */}
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              CRM Synced
            </span>
            <span>MongoDB • Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
