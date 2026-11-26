import json
import logging
import re
import concurrent.futures
from typing import Dict, Any, List, Optional
from app.config import settings
from app.lead_scorer import extract_customer_info_heuristic, analyze_sentiment

logger = logging.getLogger("voxsales.ai")

# Dedicated non-blocking executor for AI generation
_ai_executor = concurrent.futures.ThreadPoolExecutor(max_workers=6, thread_name_prefix="vox_ai")

SYSTEM_PROMPT = """You are VoxSales AI, a world-class, professional, and consultative technical education counselor for VoxSales Academy (Fortivex Education).
We offer 5 live cohort bootcamps:
1. Python Programming & Automation Bootcamp (12 Weeks | INR 3,499)
2. Java Enterprise & Microservices Masterclass (16 Weeks | INR 3,999)
3. Full Stack Web Development (MERN + Next.js 14) (18 Weeks | INR 4,499)
4. AI, Machine Learning & LLM Specialist (20 Weeks | INR 4,999)
5. DSA & System Design Masterclass for Placements (14 Weeks | INR 3,299)

CRITICAL INSTRUCTION: MULTILINGUAL UNDERSTANDING WITH ENGLISH RESPONSES
- Candidates will speak or write to you in multiple Indian languages: Telugu (తెలుగు), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Hindi (हिंदी), or English (or code-mixed Hinglish / Tenglish).
- You MUST fully comprehend their query in whatever language they speak or write.
- YOU MUST ALWAYS DELIVER YOUR RESPONSE IN NATURAL, POLITE, PROFESSIONAL ENGLISH.
  * Reason: The browser's speech synthesis (TTS) uses an English voice. Responding in English ensures full-sentence, clear audio playback where all words, explanations, and numbers are spoken fluently without any missing words or truncated output.
- Keep technical terms (Python, Java, Full Stack, AI/ML, DSA) and exact fees (INR 3,499, INR 3,999, INR 4,499, INR 4,999, INR 3,299) accurate.

Guidelines:
1. Answer the candidate's exact question using facts from the provided COURSE CONTEXT. Be crisp, insightful, and professional.
2. If the user asks compound questions (e.g. fee AND duration), explicitly answer BOTH parts in your response.
3. Tone: Warm, executive, and encouraging. Keep responses concise (2 to 3 sentences) so they sound natural over voice speech synthesis.
4. DO NOT repeat "Would you like to schedule a free 1-on-1 counseling session..." on every response! Answer the user's specific question directly, and ask a relevant conversational follow-up (e.g. about their coding background or career goals).
5. ONLY suggest scheduling a counseling session or picking a slot when the candidate explicitly asks about booking, scheduling, speaking to an advisor, or enrolling.
6. If the user shares contact details (Name, Email, Phone), acknowledge them warmly.

ALWAYS return your answer as a JSON object matching this schema:
{
  "reply": "Your voice-ready conversational response in English here.",
  "extracted_lead": {
    "name": "Candidate name if mentioned, else null",
    "email": "Email address if mentioned, else null",
    "phone": "Phone number if mentioned, else null",
    "interested_course": "Python, Java, Full Stack, AI/ML, or DSA if detected, else null"
  },
  "sentiment": "Positive" | "Neutral" | "Negative",
  "booking_intent": true | false
}
"""

class AIService:
    def __init__(self):
        self.groq_client = None
        self.client = None
        self._init_groq()
        self._init_gemini()

    def _init_groq(self):
        key = settings.GROQ_API_KEY.strip()
        if key:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=key, timeout=3.5)
                logger.info("Groq API client initialized successfully with ultra-fast LPU inference (llama-3.3-70b-versatile).")
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")
                self.groq_client = None
        else:
            self.groq_client = None

    def _init_gemini(self):
        key = settings.GEMINI_API_KEY.strip()
        if key:
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(
                    api_key=key,
                    http_options=types.HttpOptions(
                        retry_options=types.HttpRetryOptions(attempts=1)
                    )
                )
                logger.info("Gemini API client initialized successfully with flash-lite configuration.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")
                self.client = None
        else:
            self.client = None

    def generate_response(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        rag_chunks: List[Dict[str, Any]],
        language: str = "en-IN",
        candidate_name: Optional[str] = None,
        memory_context: str = ""
    ) -> Dict[str, Any]:
        """
        Generates contextual AI sales response using:
        1. Groq LPU (qwen/qwen3.8-27b) ~200-400ms latency
        2. Gemini Flash-Lite fallback
        3. Deterministic intelligent educational counselor fallback
        """
        user_message = user_message.strip()
        heuristic_lead = extract_customer_info_heuristic(user_message)
        if candidate_name and not heuristic_lead.get("name"):
            heuristic_lead["name"] = candidate_name.strip()
        heuristic_sentiment = analyze_sentiment(user_message)

        # Clean context text by removing raw bracketed section headers
        cleaned_chunks = []
        for c in rag_chunks:
            raw_text = c.get('content', '')
            clean_text = re.sub(r'\[SECTION:[^\]]+\]', '', raw_text).strip()
            cleaned_chunks.append({**c, "content": clean_text})

        context_text = "\n\n".join([f"[{c.get('course', 'Course')}]: {c.get('content', '')}" for c in cleaned_chunks])
        if memory_context:
            context_text = f"{memory_context}\n\n{context_text}"

        lower_msg = user_message.lower()
        booking_intent = any(word in lower_msg for word in ["book", "appointment", "counseling", "slot", "schedule", "call", "meet", "demo"])

        # 1. Try Groq LPU First (Ultra-fast ~300ms)
        if self.groq_client:
            try:
                future = _ai_executor.submit(
                    self._call_groq,
                    user_message,
                    conversation_history,
                    context_text,
                    heuristic_lead,
                    heuristic_sentiment,
                    booking_intent,
                    language
                )
                res = future.result(timeout=3.5)
                res["is_fallback"] = False
                res["provider_used"] = "groq"
                return res
            except Exception as e:
                logger.warning(f"Groq API error ({e}). Attempting secondary model fallback...")

        # 2. Try Gemini API Second
        if self.client:
            try:
                future = _ai_executor.submit(
                    self._call_gemini,
                    user_message,
                    conversation_history,
                    context_text,
                    heuristic_lead,
                    heuristic_sentiment,
                    booking_intent,
                    language
                )
                res = future.result(timeout=4.0)
                res["is_fallback"] = False
                res["provider_used"] = "gemini"
                return res
            except concurrent.futures.TimeoutError:
                logger.warning("Gemini API exceeded 4.0s limit. Switching to contextual counselor engine.")
            except Exception as e:
                logger.warning(f"Gemini API call failed ({e}). Switching to contextual counselor engine.")

        # 3. Rule-based Intelligent Counselor Fallback
        res = self._generate_intelligent_fallback(user_message, conversation_history, cleaned_chunks, heuristic_lead, heuristic_sentiment, booking_intent, language)
        res["is_fallback"] = True
        res["provider_used"] = "deterministic_fallback"
        return res

    def _call_groq(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        context: str,
        heuristic_lead: Dict[str, Any],
        heuristic_sentiment: str,
        booking_intent: bool,
        language: str = "en-IN"
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        if context:
            messages.append({"role": "system", "content": f"OFFICIAL COURSE KNOWLEDGE BASE CONTEXT:\n{context}"})

        for msg in history[-6:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})

        cand_info = f" Registered Candidate Name: {heuristic_lead['name']}." if heuristic_lead.get("name") else ""
        messages.append({
            "role": "user",
            "content": f"Candidate message (Candidate Language Code: {language}.{cand_info}):\n{user_message}\n\nRespond strictly in valid JSON format in English."
        })

        chat_completion = None
        for groq_model in ["qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"]:
            try:
                chat_completion = self.groq_client.chat.completions.create(
                    messages=messages,
                    model=groq_model,
                    temperature=0.2,
                    max_tokens=300,
                    response_format={"type": "json_object"}
                )
                break
            except Exception as model_err:
                logger.warning(f"Groq model {groq_model} failed: {model_err}")
                continue

        if not chat_completion:
            raise RuntimeError("All Groq models failed.")

        raw_json = chat_completion.choices[0].message.content.strip()
        result = json.loads(raw_json)

        # Merge heuristic extractions if LLM missed any
        lead = result.get("extracted_lead", {})
        for k, v in heuristic_lead.items():
            if v and not lead.get(k):
                lead[k] = v
        result["extracted_lead"] = lead
        if not result.get("sentiment"):
            result["sentiment"] = heuristic_sentiment
        if result.get("booking_intent") is None:
            result["booking_intent"] = booking_intent
        return result

    def _call_gemini(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        context: str,
        heuristic_lead: Dict[str, Any],
        heuristic_sentiment: str,
        booking_intent: bool,
        language: str = "en-IN"
    ) -> Dict[str, Any]:
        from google.genai import types

        formatted_history = []
        for msg in history[-6:]:
            role = "user" if msg.get("role") == "user" else "model"
            formatted_history.append(f"{role.upper()}: {msg.get('content', '')}")

        history_block = "\n".join(formatted_history)

        prompt = f"""{SYSTEM_PROMPT}

SESSION LANGUAGE CODE: {language}

OFFICIAL KNOWLEDGE BASE CONTEXT:
{context}

CONVERSATION HISTORY:
{history_block}

CURRENT CANDIDATE QUERY:
"{user_message}"

Respond strictly in valid JSON:"""

        for model_id in ['gemini-3.8-flash', 'gemini-2.5-flash']:
            try:
                response = self.client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                        max_output_tokens=260,
                    )
                )
                raw_json = response.text.strip()
                if raw_json.startswith("```"):
                    raw_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json, flags=re.DOTALL).strip()
                try:
                    result = json.loads(raw_json)
                except Exception:
                    m = re.search(r'"reply"\s*:\s*"([^"]+)"', raw_json)
                    reply_text = m.group(1) if m else raw_json
                    result = {
                        "reply": reply_text,
                        "extracted_lead": heuristic_lead,
                        "sentiment": heuristic_sentiment,
                        "booking_intent": booking_intent
                    }

                lead = result.get("extracted_lead", {})
                for k, v in heuristic_lead.items():
                    if v and not lead.get(k):
                        lead[k] = v
                result["extracted_lead"] = lead
                if not result.get("sentiment"):
                    result["sentiment"] = heuristic_sentiment
                if result.get("booking_intent") is None:
                    result["booking_intent"] = booking_intent
                return result
            except Exception as inner_e:
                logger.warning(f"Gemini model {model_id} warning: {inner_e}")
                continue

        raise RuntimeError("All Gemini models failed.")

    def _generate_intelligent_fallback(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        rag_chunks: List[Dict[str, Any]],
        heuristic_lead: Dict[str, Any],
        heuristic_sentiment: str,
        booking_intent: bool,
        language: str = "en-IN"
    ) -> Dict[str, Any]:
        """
        Sophisticated, domain-tailored counselor engine with query-specific intent parsing
        in Telugu, Tamil, Kannada, Malayalam, Hindi, and English.
        Accurately handles compound intents (e.g. Cost + Duration) and exact Indian language queries.
        """
        lower = user_message.lower().strip()
        words = lower.split()
        course_name = heuristic_lead.get("interested_course") or ""

        # 1. Contact info provided (phone or email)
        if heuristic_lead.get("phone") or heuristic_lead.get("email"):
            name = heuristic_lead.get("name") or "there"
            target = course_name or "our tech career program"
            return {
                "reply": f"Thank you so much, {name}! I have recorded your details for {target}. Our senior academic mentor will reach out with your personalized syllabus roadmap and scholarship letter.",
                "extracted_lead": heuristic_lead,
                "sentiment": "Positive",
                "booking_intent": True
            }

        # 2. Greetings across all supported languages
        if any(w in lower for w in [
            "hi", "hello", "hey", "good morning", "good evening", "namaste",
            "నమస్కారం", "హలో", "வணக்கம்", "ஹலோ", "ನಮಸ್ಕಾರ", "ಹಲೋ", "നമസ്കാരം", "ഹലോ", "नमस्ते", "प्रणाम"
        ]) and len(words) <= 4:
            return {
                "reply": "Hello and welcome to VoxSales Academy! I am your AI career advisor. You can speak to me in English, Telugu, Hindi, Tamil, Kannada, or Malayalam, and I will assist you with Python, Java, Full Stack, AI/ML, and DSA. How can I help boost your tech career today?",
                "extracted_lead": heuristic_lead,
                "sentiment": "Positive",
                "booking_intent": False
            }

        # 3. Explicit Booking / Appointment intent
        if booking_intent:
            name_str = f", {heuristic_lead['name']}" if heuristic_lead.get("name") else ""
            return {
                "reply": f"I would be delighted to schedule a free 1-on-1 counseling session for you{name_str}! You can choose your preferred time slot directly on our Appointments calendar. What is your email and phone number so we can confirm?",
                "extracted_lead": heuristic_lead,
                "sentiment": "Positive",
                "booking_intent": True
            }

        # Detect flags for compound and single intents
        has_fee = any(w in lower for w in [
            "fee", "fees", "cost", "price", "pricing", "discount", "scholarship", "emi", "pay",
            "ఫీజు", "ఖర్చు", "ధర", "ఈఎంఐ", "డిస్కౌంట్",
            "கட்டணம்", "விலை", "ஈஎம்ஐ", "தள்ளுபடி",
            "ಶುಲ್ಕ", "ಬೆಲೆ", "ಇಎಂಐ", "ರಿಯಾಯಿತಿ",
            "ഫീസ്", "ചെലവ്", "ഇഎംഐ", "ഇളവ്",
            "फीस", "कीमत", "ईएमआई", "छूट"
        ])
        has_duration = any(w in lower for w in [
            "duration", "how long", "time", "timing", "batch", "batches", "weeks", "months", "schedule",
            "వ్యవధి", "సమయం", "వారాలు", "నెలలు", "బ్యాచ్",
            "கால அளவு", "நேரம்", "மாதங்கள்", "பேட்ச்",
            "ಅವಧಿ", "ಸಮಯ", "ವಾರಗಳು", "ತಿಂಗಳುಗಳು", "ಬ್ಯಾಚ್",
            "കാലാവധി", "സമയം", "ആഴ്ചകൾ", "മാസങ്ങൾ", "ബാച്ച്",
            "अवधि", "समय", "सप्ताह", "महीने", "बैच"
        ])
        has_syllabus = any(w in lower for w in [
            "syllabus", "curriculum", "topic", "topics", "learn", "teach", "taught", "cover", "covers", "covered", "modules", "content", "what do you teach", "what is covered", "what will i learn", "curriculam",
            "సిలబస్", "పాఠాలు", "నేర్పుతారు", "విషయాలు", "టాపిక్స్",
            "பாடத்திட்டம்", "சிலபஸ்", "கற்பிப்பீர்கள்", "பாடங்கள்",
            "ಪಠ್ಯಕ್ರಮ", "ಸಿಲಬಸ್", "ಕಲಿಸುತ್ತೀರಿ", "ವಿಷಯಗಳು",
            "സിലബസ്", "പഠിപ്പിക്കുന്നത്", "വിഷയങ്ങൾ",
            "सिलेबस", "पाठ्यक्रम", "सिखाया"
        ])
        has_placement = any(w in lower for w in [
            "placement", "placements", "job", "jobs", "salary", "package", "ctc", "hiring", "interview", "guarantee",
            "ప్లేస్‌మెంట్", "ఉద్యోగం", "జీతం", "ఇంటర్వ్యూ", "కంపెనీలు",
            "வேலைவாய்ப்பு", "வேலை", "சம்பளம்", "நேர்காணல்",
            "ಉದ್ಯೋಗ", "ಪ್ಲೇಸ್‌ಮೆಂಟ್", "ಸಂಬಳ", "ಸಂದರ್ಶನ",
            "പ്ലേസ്മെന്റ്", "ജോലി", "ശമ്പളം", "ഇന്റർവ്യൂ",
            "प्लेसमेंट", "नौकरी", "सैलरी", "पैकेज", "इंटरव्यू"
        ])

        # Detect specific course
        is_java = any(w in lower for w in ["java", "జావా", "ஜாவா", "ಜಾವಾ", "जावा"]) or "java" in course_name.lower()
        is_python = any(w in lower for w in ["python", "పైథాన్", "பைதான்", "ಪೈಥಾನ್", "पायथन"]) or "python" in course_name.lower()
        is_fullstack = any(w in lower for w in ["full stack", "fullstack", "mern", "ఫుల్ స్టాక్", "ஃபுல் ஸ்டாக்", "ಫುಲ್"]) or "full stack" in course_name.lower()
        is_ai = any(w in lower for w in ["ai", "machine learning", "ml", "genai", "llm", "ఆర్టిఫిషియల్"]) or "ai" in course_name.lower()
        is_dsa = any(w in lower for w in ["dsa", "algorithms", "డేటా స్ట్రక్చర్స్", "leetcode"]) or "dsa" in course_name.lower()

        # 4. COMPOUND QUERY: Cost/Fee + Duration together
        if has_fee and has_duration:
            if is_java:
                reply = "The Java Enterprise & Microservices Masterclass offer fee is INR 3,999 (with zero-interest EMI starting at INR 666/month), and the program duration is 16 Weeks (4 Months) with live weekday evening and weekend batches."
            elif is_python:
                reply = "The Python Programming & Automation Bootcamp fee is INR 3,499 (EMI starting at INR 583/month), and the duration is 12 Weeks (3 Months) with live mentor support."
            elif is_fullstack:
                reply = "The Full Stack Web Development bootcamp (MERN + Next.js 14) fee is INR 4,499 (EMI starting at INR 750/month), and the course runs for 18 Weeks (4.5 Months)."
            elif is_ai:
                reply = "The AI, Machine Learning & LLM Specialist program is INR 4,999 (EMI starting at INR 833/month), and the duration is 20 Weeks (5 Months) of intensive hands-on training."
            elif is_dsa:
                reply = "The DSA & System Design Masterclass fee is INR 3,299 (EMI starting at INR 550/month), and the duration is 14 Weeks (3.5 Months) focused on cracking product company interviews."
            else:
                reply = "Our course fees range from INR 3,299 to INR 4,999 with program durations between 12 to 20 weeks. No-cost EMI is available from INR 550/month. Which course would you like exact details on?"
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": heuristic_sentiment, "booking_intent": False}

        # 5. Pricing, Fees & EMI
        if has_fee:
            if is_java:
                reply = "The Java Enterprise Masterclass fee is INR 3,999 (discounted from INR 5,499) with zero-cost EMI starting at INR 666/month and up to 25% entrance scholarships."
            elif is_python:
                reply = "The Python Programming & Automation Bootcamp is INR 3,499 with flexible no-cost EMI starting at INR 583/month."
            elif is_fullstack:
                reply = "The Full Stack Web Development program is INR 4,499 (regular INR 5,999) with easy EMI options starting at INR 750/month."
            elif is_ai:
                reply = "The AI & ML Specialist program is INR 4,999 under scholarship tier, with 6-month zero-interest EMI at INR 833/month."
            elif is_dsa:
                reply = "The DSA & System Design Masterclass is INR 3,299, with no-cost EMI starting at just INR 550/month."
            else:
                reply = "Our course fees range between INR 3,299 and INR 4,999 (Python: INR 3,499, Java: INR 3,999, Full Stack: INR 4,499, AI/ML: INR 4,999, DSA: INR 3,299) with easy no-cost EMI from INR 550/month. Which program are you considering?"
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": heuristic_sentiment, "booking_intent": False}

        # 6. Duration, Schedule & Batches
        if has_duration:
            if is_java:
                reply = "The Java Enterprise Masterclass runs for 16 Weeks (4 Months). Weekday batches run Mon–Thu 8:00 PM to 9:30 PM IST, and weekend batches run Sat & Sun 2:00 PM to 5:00 PM IST."
            elif is_python:
                reply = "The Python Bootcamp runs for 12 Weeks (3 Months) with flexible weekday evening and weekend morning batches."
            elif is_fullstack:
                reply = "The Full Stack Web Development cohort spans 18 Weeks (4.5 Months) with live evening sessions and weekend mentor labs."
            elif is_ai:
                reply = "The AI & Machine Learning Specialist cohort is an intensive 20-Week (5 Months) program with live model deployment projects."
            elif is_dsa:
                reply = "The DSA Masterclass runs for 14 Weeks (3.5 Months) covering 300+ LeetCode patterns and system design."
            else:
                reply = "Our cohorts run from 12 to 20 weeks with flexible weekday evening and weekend batches designed for students and working professionals. Which schedule works best for you?"
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": heuristic_sentiment, "booking_intent": False}

        # 7. Syllabus, Curriculum, Topics
        if has_syllabus:
            if is_java:
                reply = "The Java Masterclass covers Core Java 21, Spring Boot 3, Microservices with Spring Cloud, Kafka event streaming, and Docker deployment."
            elif is_python:
                reply = "The Python Bootcamp covers core OOP, NumPy, Pandas, web scraping, and building REST APIs with FastAPI."
            elif is_fullstack:
                reply = "Our Full Stack curriculum covers React 19, Next.js 14, Node.js, Express, MongoDB, and AWS cloud deployment with live production capstone projects."
            elif is_ai:
                reply = "The AI & ML Specialist program covers Python, Deep Learning with PyTorch, Generative AI APIs, LangChain, and production RAG architectures."
            elif is_dsa:
                reply = "The DSA and System Design Masterclass covers core algorithms, trees, dynamic programming, 300+ LeetCode patterns, and low-level system design."
            else:
                reply = "Our programs cover hands-on industry curricula in Python, Java Enterprise, Full Stack Web Dev, AI/ML, and DSA with live capstone projects. Which syllabus would you like to explore?"
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": heuristic_sentiment, "booking_intent": False}

        # 8. Placement / Jobs / Salaries
        if has_placement:
            reply = "We offer 100% placement assistance across 350+ hiring partners, including resume audits, GitHub reviews, and 5+ mock technical interviews with senior engineers. Starting packages typically range from 6 to 14 LPA."
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": "Positive", "booking_intent": False}

        # 9. General course inquiry
        if course_name or is_java or is_python or is_fullstack or is_ai or is_dsa:
            c_label = "Java Enterprise" if is_java else ("Python" if is_python else ("Full Stack" if is_fullstack else ("AI/ML" if is_ai else ("DSA" if is_dsa else course_name))))
            reply = f"Our {c_label} cohort includes live mentor sessions, production capstones, and dedicated placement support. Would you like to know about the syllabus, fee, or upcoming batch timings?"
            return {"reply": reply, "extracted_lead": heuristic_lead, "sentiment": heuristic_sentiment, "booking_intent": False}

        # 10. Fallback for general questions
        return {
            "reply": "We offer career cohorts in Python (INR 3,499), Java Microservices (INR 3,999), Full Stack MERN/Next.js (INR 4,499), AI & Machine Learning (INR 4,999), and DSA (INR 3,299). What specific questions can I answer for you regarding fees, duration, or syllabus?",
            "extracted_lead": heuristic_lead,
            "sentiment": heuristic_sentiment,
            "booking_intent": False
        }

ai_service = AIService()
