import re
from typing import Dict, Any, Tuple

def extract_customer_info_heuristic(text: str) -> Dict[str, Any]:
    """
    Extracts name, email, phone, and course interest using regex & heuristic patterns.
    Works as an immediate or fallback extractor alongside LLM parsing.
    """
    info = {
        "name": None,
        "email": None,
        "phone": None,
        "interested_course": None
    }
    
    # Email regex
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    if email_match:
        info["email"] = email_match.group(0).strip()
        
    # Phone regex (Indian/Standard 10-digit formats with optional country code)
    phone_match = re.search(r'(?:\+?91[\s-]?)?[6789]\d{9}', text)
    if not phone_match:
        phone_match = re.search(r'\b\d{10}\b', text)
    if phone_match:
        info["phone"] = phone_match.group(0).strip()
        
    # Explicit "my name is" or "this is"
    explicit_name_match = re.search(r'(?:my name is|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', text, re.IGNORECASE)
    if explicit_name_match:
        cand = explicit_name_match.group(1).title().strip()
        if cand.lower() not in ["interested", "looking", "calling", "here"]:
            info["name"] = cand
    else:
        # "i am" only if followed by a proper capitalized name not in stop verbs
        iam_match = re.search(r'\bi am\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b', text, re.IGNORECASE)
        if iam_match:
            cand = iam_match.group(1).title().strip()
            stop_words = {"looking", "interested", "trying", "here", "a", "an", "exploring", "wondering", "calling", "student", "working", "planning", "searching", "asking", "ready", "curious", "new"}
            if not any(w in cand.lower().split() for w in stop_words):
                info["name"] = cand
        
    # Course detection
    lower_text = text.lower()
    if "python" in lower_text:
        info["interested_course"] = "Python Programming & Automation"
    elif "java" in lower_text or "spring" in lower_text:
        info["interested_course"] = "Java Enterprise & Microservices"
    elif "full stack" in lower_text or "mern" in lower_text or "next" in lower_text or "web dev" in lower_text:
        info["interested_course"] = "Full Stack Web Development (MERN)"
    elif "ai" in lower_text or "machine learning" in lower_text or "deep learning" in lower_text or "genai" in lower_text:
        info["interested_course"] = "AI, Machine Learning & LLM Specialist"
    elif "dsa" in lower_text or "data structure" in lower_text or "algorithm" in lower_text or "leetcode" in lower_text:
        info["interested_course"] = "DSA & System Design Masterclass"
        
    return info


def calculate_lead_score(
    lead_data: Dict[str, Any], 
    conversation_history: list = None,
    sentiment: str = "Neutral"
) -> Tuple[int, str]:
    """
    Transparent, rule-based lead scoring system.
    Dynamically responds to user engagement, interest, buying signals, or disinterest/rejection.
    
    Rubric:
    - Rejection ("dont want", "not interested", Negative): Drops to 0 points -> Cold
    - Base score: 10 points for engagement
    - Phone provided: +25 points
    - Email provided: +20 points
    - Name provided: +10 points
    - Interested course specified: +20 points
    - Buying signals in chat (fees, discount, admission, emi, placement, syllabus): +15 points
    - Appointment requested / booked: +20 points
    - Positive sentiment bonus: +10 points
    
    Categories:
    - Hot: 70 - 100
    - Warm: 40 - 69
    - Cold: 0 - 39
    """
    user_messages = " ".join([m.get("content", "").lower() for m in conversation_history if m.get("role") == "user"]) if conversation_history else ""
    
    # 1. Check explicit rejection / disinterest (e.g. "i dont want these courses", "not interested")
    rejection_keywords = [
        "dont want", "don't want", "not interested", "no courses", "no course",
        "not looking for courses", "not looking for any", "waste", "scam",
        "dont need", "don't need", "no need", "cancel", "stop calling", "not for me",
        "leave me alone", "no thanks", "do not want", "dont like", "don't like"
    ]
    is_rejected = any(kw in user_messages for kw in rejection_keywords)
    if is_rejected or (sentiment == "Negative" and any(w in user_messages for w in ["no", "not", "dont", "don't", "stop", "cancel"])):
        return 0, "Cold"
        
    score = 10  # Started conversation
    
    if lead_data.get("phone"):
        score += 25
    if lead_data.get("email"):
        score += 20
    if lead_data.get("name"):
        score += 10
    if lead_data.get("interested_course") and lead_data.get("interested_course") not in ["Not Interested", "None"]:
        score += 20
        
    if lead_data.get("appointment_booked"):
        score += 20
        
    # Check buying signal keywords in conversation
    if conversation_history:
        buying_keywords = [
            "fee", "fees", "cost", "price", "discount", "scholarship", 
            "emi", "enroll", "register", "join", "batch", "schedule", 
            "placement", "syllabus", "mentor", "certificate", "timing", "salary"
        ]
        signal_count = sum(1 for kw in buying_keywords if kw in user_messages)
        if signal_count >= 1:
            score += min(15, signal_count * 5)
            
    if sentiment == "Positive":
        score += 10
    elif sentiment == "Negative":
        score = max(0, score - 30)
        
    # Cap score between 0 and 100
    score = max(0, min(100, score))
    
    # Classify
    if score >= 70:
        category = "Hot"
    elif score >= 40:
        category = "Warm"
    else:
        category = "Cold"
        
    return score, category


def analyze_sentiment(text: str) -> str:
    """
    Fast rule-based sentiment classification: Positive, Neutral, Negative.
    """
    lower = text.lower()
    positive_words = [
        "great", "good", "awesome", "excellent", "interested", "sure", 
        "yes", "love", "perfect", "help", "thank", "thanks", "impressive", 
        "excited", "definitely", "ready", "book", "like"
    ]
    negative_words = [
        "bad", "terrible", "worst", "expensive", "useless", "no", 
        "waste", "hate", "scam", "poor", "unhappy", "cancel", "never"
    ]
    
    pos_count = sum(1 for w in positive_words if re.search(r'\b' + re.escape(w) + r'\b', lower))
    neg_count = sum(1 for w in negative_words if re.search(r'\b' + re.escape(w) + r'\b', lower))
    
    if pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count:
        return "Negative"
    return "Neutral"


def evaluate_bant(
    lead_data: Dict[str, Any],
    conversation_history: list = None,
) -> Dict[str, Any]:
    """
    SalesPilot-style BANT qualification scoring (Budget 25, Authority 20, Need 35, Timeline 20).
    Returns per-dimension level ('established' | 'partial' | 'unknown'), points, and total.
    """
    user_messages = " ".join(
        [m.get("content", "").lower() for m in conversation_history if m.get("role") == "user"]
    ) if conversation_history else ""
    summary_text = f"{lead_data.get('summary', '')} {lead_data.get('notes', '')}".lower()
    combined = f"{user_messages} {summary_text}".strip()

    # Budget (25)
    budget_explicit = ["fee", "fees", "inr", "price", "cost", "budget", "emi", "installment", "scholarship", "discount", "pay", "afford"]
    if any(k in combined for k in ["emi", "inr", "budget", "afford", "scholarship", "discount"]):
        budget_level, budget_val, budget_pts = "established", "Discussed fees / EMI / budget", 25
    elif any(k in combined for k in budget_explicit):
        budget_level, budget_val, budget_pts = "partial", "Inquired about pricing", 12.5
    else:
        budget_level, budget_val, budget_pts = "unknown", None, 0

    # Authority (20)
    if any(k in combined for k in ["i want to join", "i am enrolling", "my decision", "i will pay", "i'm ready", "im ready", "sign me up", "book"]):
        auth_level, auth_val, auth_pts = "established", "Direct decision maker", 20
    elif lead_data.get("phone") or lead_data.get("email") or any(k in combined for k in ["parents", "manager", "company", "team"]):
        auth_level, auth_val, auth_pts = "partial", "Contactable / evaluating", 10
    else:
        auth_level, auth_val, auth_pts = "unknown", None, 0

    # Need (35)
    course = lead_data.get("interested_course")
    has_course = bool(course and course not in ["Not Interested", "None", "General Tech Courses"])
    need_signals = ["career", "job", "placement", "switch", "learn", "skill", "project", "syllabus", "interview", "upskill"]
    if has_course and any(k in combined for k in need_signals):
        need_level, need_val, need_pts = "established", f"Targeted {course} with clear goal", 35
    elif has_course or any(k in combined for k in need_signals):
        need_level, need_val, need_pts = "partial", course or "Exploring courses", 17.5
    else:
        need_level, need_val, need_pts = "unknown", None, 0

    # Timeline (20)
    if lead_data.get("appointment_booked") or any(k in combined for k in ["today", "tomorrow", "this week", "immediately", "asap", "next batch", "when does"]):
        time_level, time_val, time_pts = "established", "Near-term / scheduled", 20
    elif any(k in combined for k in ["next month", "soon", "batch", "schedule", "timing", "weeks", "duration"]):
        time_level, time_val, time_pts = "partial", "Asked about batch schedule", 10
    else:
        time_level, time_val, time_pts = "unknown", None, 0

    total = int(round(budget_pts + auth_pts + need_pts + time_pts))
    category = "Hot" if total >= 70 else ("Warm" if total >= 40 else "Cold")
    return {
        "budget": {"level": budget_level, "value": budget_val, "points": budget_pts, "max": 25},
        "authority": {"level": auth_level, "value": auth_val, "points": auth_pts, "max": 20},
        "need": {"level": need_level, "value": need_val, "points": need_pts, "max": 35},
        "timeline": {"level": time_level, "value": time_val, "points": time_pts, "max": 20},
        "total": total,
        "category": category,
    }
