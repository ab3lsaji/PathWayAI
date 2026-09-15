try:
    __import__("pysqlite3")
    import sys

    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass

import base64
import io
import json
import os
import re
import sqlite3
import uuid
from typing import Any, Dict, List, Literal, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import docx
from docx import Document
from docx.shared import Inches, Pt
import pypdf

from langchain_chroma import Chroma
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings

# Import Google Cloud Vision Service and Google Auth Dependency
from ocr_service import extract_text
from auth import get_current_user

load_dotenv()

app = FastAPI(title="PathwayAI Interactive Chat with Multimodal History")

# CORS setup for local development and production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],
)

# ---------------------------------------------------------------------------
# 1. DATABASE & HISTORY SETUP (SQLite Persistence)
# ---------------------------------------------------------------------------
DB_FILE = "chat_history.db"


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("PRAGMA foreign_keys = ON;")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            user_email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("PRAGMA table_info(sessions)")
    columns = [col[1] for col in cursor.fetchall()]
    if "user_email" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN user_email TEXT")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
        )
    """)

    cursor.execute("PRAGMA table_info(messages)")
    msg_columns = [col[1] for col in cursor.fetchall()]
    if "image" not in msg_columns:
        cursor.execute("ALTER TABLE messages ADD COLUMN image TEXT")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS node_progress (
            session_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            status TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, node_id),
            FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


init_db()


def create_session_if_not_exists(
    session_id: str, title: str, user_email: Optional[str] = None
):
    """Inserts session or updates generic fallback titles with a newly generated topic title."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO sessions (session_id, title, user_email) VALUES (?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET 
            title = CASE 
                WHEN sessions.title IN ('New Chat', 'New Career Guidance', 'Career Guidance Session') 
                     OR sessions.title LIKE 'Hi %' 
                     OR sessions.title LIKE 'Hello%' 
                     OR sessions.title LIKE 'I am %' 
                     OR sessions.title LIKE 'Hey %'
                THEN excluded.title 
                ELSE sessions.title 
            END,
            user_email = COALESCE(excluded.user_email, sessions.user_email)
    """,
        (session_id, title, user_email),
    )
    conn.commit()
    conn.close()


def update_session_title(session_id: str, title: str):
    """Directly updates session title once a concise topic is extracted."""
    if not title or not title.strip():
        return
    # Never overwrite a good title with the generic fallback
    if title.strip() in ["Career Guidance Session", "New Chat", "New Career Guidance"]:
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE sessions SET title = ? WHERE session_id = ?",
        (title.strip(), session_id),
    )
    conn.commit()
    conn.close()


def _deterministic_fallback_title(message: str) -> str:
    """
    Smart deterministic title builder.
    It no longer keeps the original sentence order.
    It extracts the most important career keywords and rebuilds a clean title.
    """
    if not message or not message.strip():
        return "Career Guidance Session"

    text = message.lower().strip()

    # -------------------------------------------------
    # 1. Keyword lists (ordered by importance)
    # -------------------------------------------------
    companies = [
        "microsoft", "google", "amazon", "meta", "apple", "netflix",
        "nvidia", "openai", "adobe", "oracle", "ibm", "salesforce",
        "uber", "airbnb", "linkedin", "twitter", "xai"
    ]
    roles = [
        "software developer", "software engineer", "sde", "sde i", "sde ii",
        "machine learning engineer", "ml engineer", "mle",
        "data scientist", "data engineer", "data analyst",
        "frontend developer", "backend developer", "full stack developer",
        "devops engineer", "cloud engineer", "ai engineer",
        "research scientist", "product manager", "program manager"
    ]
    degrees = [
        "msc in ai", "msc ai", "ms in ai", "masters in ai",
        "msc in computer science", "ms in cs", "btech", "b.tech",
        "bachelor", "undergraduate", "postgraduate", "phd"
    ]
    skills = [
        "artificial intelligence", "machine learning", "deep learning",
        "computer vision", "nlp", "data science", "cloud computing",
        "system design", "dsa", "algorithms"
    ]

    # -------------------------------------------------
    # 2. Detect the strongest signals
    # -------------------------------------------------
    found_company = next((c for c in companies if c in text), None)
    found_role = next((r for r in roles if r in text), None)
    found_degree = next((d for d in degrees if d in text), None)
    found_skill = next((s for s in skills if s in text), None)

    # -------------------------------------------------
    # 3. Build a clean title from the signals
    # -------------------------------------------------
    parts = []

    if found_degree:
        # Normalize degree names
        if "msc" in found_degree or "ms " in found_degree:
            parts.append("MSc AI")
        else:
            parts.append(found_degree.title())

    if found_role:
        # Prefer the full nice form
        role_map = {
            "software developer": "Software Developer",
            "software engineer": "Software Engineer",
            "sde": "Software Engineer",
            "sde i": "SDE I",
            "sde ii": "SDE II",
            "machine learning engineer": "ML Engineer",
            "ml engineer": "ML Engineer",
            "mle": "ML Engineer",
            "data scientist": "Data Scientist",
            "data engineer": "Data Engineer",
            "data analyst": "Data Analyst",
            "frontend developer": "Frontend Developer",
            "backend developer": "Backend Developer",
            "full stack developer": "Full Stack Developer",
            "ai engineer": "AI Engineer",
        }
        nice_role = role_map.get(found_role, found_role.title())
        parts.append(nice_role)
    elif found_skill:
        parts.append(found_skill.title())

    if found_company:
        parts.append(f"at {found_company.title()}")

    if parts:
        title = " ".join(parts)
        # Soft length limit
        if len(title) > 42:
            title = title[:39].rsplit(" ", 1)[0] + "…"
        return title

    # -------------------------------------------------
    # 4. Ultimate fallback – clean sequential words
    # -------------------------------------------------
    # Remove greetings and “I am <name> currently doing…”
    text = re.sub(
        r"^(hi|hello|hey|hi there|hello there)\s+",
        "", text, flags=re.IGNORECASE
    )
    text = re.sub(
        r"^(i am|i'm|im|my name is)\s+\w+\s+",
        "", text, flags=re.IGNORECASE
    )
    text = re.sub(
        r"^(currently|doing my|i am currently|i'm currently)\s+",
        "", text, flags=re.IGNORECASE
    )

    # Remove remaining filler
    stop = {
        "i", "am", "want", "to", "become", "a", "an", "the", "my",
        "currently", "doing", "how", "do", "get", "there", "in", "at"
    }
    words = [w for w in re.findall(r"[a-z0-9]+", text) if w not in stop]

    if not words:
        return "Career Guidance Session"

    title = " ".join(words[:5]).title()
    if len(title) > 40:
        title = title[:37] + "…"
    return title if len(title) > 3 else "Career Guidance Session"


async def generate_chat_title(first_message: str) -> str:
    """Generate a clean career-focused title. Always has a strong fallback."""
    cleaned_input = (first_message or "").strip()

    if not cleaned_input or len(cleaned_input) < 5:
        return "Career Guidance Session"

    # Prepare fallback first – this is what will almost always be used
    # if the LLM fails or returns something noisy
    fallback = _deterministic_fallback_title(cleaned_input)

    try:
        title_llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            temperature=0.0,
            google_api_key=os.getenv("GEMINI_API_KEY"),
            streaming=False,
        )

        prompt = f"""Create a short chat title (3-6 words) for a career guidance app.

Rules:
- Completely ignore the person's name and any greetings.
- Ignore filler like "i am currently doing", "i want to become", "how do i get".
- Focus only on the career goal / role / company / degree.
- Good examples:
  • Microsoft Software Developer
  • MSc AI Career Path
  • Software Engineer at Microsoft
  • ML Engineer Roadmap
- Return ONLY the title. No quotes, no extra text.

Message:
{cleaned_input}"""

        response = await title_llm.ainvoke(prompt)
        raw = (response.content or "").strip().strip('"\'`')

        # Reject anything that still looks personal or generic
        bad = any(
            re.search(p, raw, re.IGNORECASE)
            for p in [
                r"\b(abel|saji|abraham)\b",
                r"^(hi|hello|hey)\b",
                r"i am ",
                r"currently do",
                r"i want to",
            ]
        )

        if (
            not raw
            or bad
            or len(raw) < 4
            or len(raw) > 50
            or raw.lower() in {
                "career guidance session", "new chat", "career path",
                "career roadmap", "career guidance"
            }
        ):
            return fallback

        return raw

    except Exception as e:
        print(f"[Title] LLM failed → using smart fallback: {e}")
        return fallback


def save_chat_message(
    session_id: str, role: str, content: str, image: Optional[str] = None
):
    """Saves a user or assistant message to SQLite database including optional image payload."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (session_id, role, content, image) VALUES (?, ?, ?, ?)",
        (session_id, role, content, image),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# 2. DOCUMENT EXTRACTION HELPER
# ---------------------------------------------------------------------------
class UploadedFile(BaseModel):
    name: str
    type: str
    data: str


def extract_document_text(file_info: UploadedFile) -> str:
    """Decodes base64 file payloads and extracts plain text from PDF, DOCX, and TXT files."""
    try:
        if "," in file_info.data:
            _, base64_data = file_info.data.split(",", 1)
        else:
            base64_data = file_info.data

        file_bytes = base64.b64decode(base64_data)
        file_stream = io.BytesIO(file_bytes)
        file_name = file_info.name.lower()
        file_type = file_info.type.lower()

        if "pdf" in file_type or file_name.endswith(".pdf"):
            reader = pypdf.PdfReader(file_stream)
            extracted_text = "\n".join(
                [page.extract_text() or "" for page in reader.pages]
            )
            return f"\n\n--- ATTACHED PDF DOCUMENT ('{file_info.name}') ---\n{extracted_text.strip()}\n--- END DOCUMENT CONTENT ---"

        elif (
            "word" in file_type
            or "officedocument" in file_type
            or file_name.endswith(".docx")
        ):
            doc = docx.Document(file_stream)
            extracted_text = "\n".join(
                [p.text for p in doc.paragraphs if p.text]
            )
            return f"\n\n--- ATTACHED WORD DOCUMENT ('{file_info.name}') ---\n{extracted_text.strip()}\n--- END DOCUMENT CONTENT ---"

        elif "text" in file_type or file_name.endswith(".txt"):
            extracted_text = file_bytes.decode("utf-8", errors="ignore")
            return f"\n\n--- ATTACHED TEXT FILE ('{file_info.name}') ---\n{extracted_text.strip()}\n--- END DOCUMENT CONTENT ---"

        return ""
    except Exception as e:
        print(f"Error parsing document '{file_info.name}': {e}")
        return f"\n\n[Failed to extract text from document '{file_info.name}']"


# ---------------------------------------------------------------------------
# 3. PYDANTIC MODELS FOR REQUESTS AND RESPONSES
# ---------------------------------------------------------------------------
class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    image: Optional[str] = None
    file: Optional[UploadedFile] = None


class MessageSchema(BaseModel):
    role: str
    content: str
    image: Optional[str] = None


class SessionResponse(BaseModel):
    messages: List[MessageSchema]
    node_progress: Dict[str, str]


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[Message]


class SessionSummary(BaseModel):
    session_id: str
    title: str
    created_at: str


class RoadmapNode(BaseModel):
    id: str
    label: str
    phase: Optional[str] = None
    description: str
    status: Optional[str] = "TO_DO"


class RoadmapEdge(BaseModel):
    id: str
    source: str
    target: str


class RoadmapRequest(BaseModel):
    session_id: Optional[str] = None
    role: str
    academic_stage: str
    current_skills: Optional[str] = ""


class VisualRoadmapResponse(BaseModel):
    title: str
    role: str
    session_id: Optional[str] = None
    nodes: List[RoadmapNode]
    edges: List[RoadmapEdge]


class NodeStatusUpdate(BaseModel):
    session_id: str
    node_id: str
    status: Literal["TO_DO", "IN_PROGRESS", "DONE"]


class DocumentExportRequest(BaseModel):
    content: str
    filename: Optional[str] = "PathwayAI_Guidance.docx"


# ---------------------------------------------------------------------------
# 4. CHROMADB RAG & LLM SETUP
# ---------------------------------------------------------------------------
DB_DIR = "./chroma_db"
USE_CLOUD = os.getenv("USE_CLOUD_AI", "true").lower() == "true"

try:
    if USE_CLOUD:
        embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=os.getenv("GEMINI_API_KEY"),
        )
    else:
        embedding_model = OllamaEmbeddings(model="nomic-embed-text")

    vectorstore = Chroma(
        persist_directory=DB_DIR, embedding_function=embedding_model
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
except Exception as e:
    print(f"RAG Initialization Warning: {e}")
    retriever = None


def get_llm():
    if USE_CLOUD:
        return ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            temperature=0.4,
            google_api_key=os.getenv("GEMINI_API_KEY"),
            streaming=True,
        )
    return ChatOllama(model="llava", temperature=0.4, streaming=True)


def format_message_content(
    content: str, image_url: Optional[str] = None
) -> Union[str, List[Dict[str, Any]]]:
    if not image_url:
        return content

    formatted_image = image_url
    if not image_url.startswith("data:") and not image_url.startswith("http"):
        formatted_image = f"data:image/jpeg;base64,{image_url}"

    user_text = (
        content.strip() if content.strip() else "Analyze this image and guide me."
    )

    text_prompt = f"""
{user_text}

Format your response strictly into two visual sections:
1. **Transcribed Text**: Transcribe the exact text from the image word-for-word.
2. **Personalized Career Advice**: Provide concise, targeted advice based ONLY on what was written or requested. Do not list unrelated subfields.
""".strip()

    return [
        {"type": "text", "text": text_prompt},
        {
            "type": "image_url",
            "image_url": {"url": formatted_image},
        },
    ]


# ---------------------------------------------------------------------------
# 5. SYSTEM PROMPT
# ---------------------------------------------------------------------------
system_prompt = """You are PathwayAI, an interactive AI career mentor covering ALL academic domains.

Engage in a helpful, concise, structured, and realistic mentorship discussion with the student.
Adapt dynamically to whatever domain or path the user asks about.

CRITICAL INSTRUCTIONS FOR MULTIMODAL & HANDWRITTEN IMAGE ANALYSIS:
1. STRICT ISOLATION OF OCR vs. GUIDANCE:
   - Always separate verbatim text transcribed from the image from your own AI guidance.
   - NEVER claim that general advice, standardized tests (like SAT/ACT), or subfields were "extracted" or "read" from the user's notes unless those exact words appear in the image.
2. NO GENERIC DOMAIN DUMPS:
   - Focus STRICTLY on the specific goal written in the note (e.g., if the student writes "I want to become a software developer", build a roadmap specifically for Software Development).
   - DO NOT dump every computer science field (Cybersecurity, Game Dev, Cloud Computing, Data Science, etc.) unless explicitly asked.
3. ACADEMIC STAGE ADAPTATION:
   - If the note/prompt indicates Class 10/11/12, give clear steps for completing high school, picking the right undergraduate degree, and core skills to start now (Programming, Math, Projects).

### RULE 1: ACADEMIC STAGE ADAPTATION
Detect the student's academic level from their message or chat history.

IF THE USER IS A SCHOOL STUDENT (e.g., Class 10/11/12):
1. PROVIDE A CHRONOLOGICAL ROADMAP starting from high school graduation to college and career.

IF THE USER IS A COLLEGE STUDENT OR WORKING PROFESSIONAL:
- Focus directly on skill gap analysis, certifications, domain tools, frameworks, system design, entrance exams, and portfolio projects.

### RULE 2: UNIVERSAL COLLEGE RECOMMENDATION & GENUINE REVIEWS
When asked for top colleges/institutions in ANY domain:
1. Hyperlink the official website of EVERY college using clean Markdown syntax: `[College Name](https://official-domain.edu)`.
2. Deliver a detailed, genuine, and balanced review highlighting Entrance Exams, Strengths, and Trade-offs.

Reference Knowledge:
{context}
"""

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)


# ---------------------------------------------------------------------------
# 6. HEALTH CHECK & CHAT HISTORY API ENDPOINTS
# ---------------------------------------------------------------------------
@app.get("/")
def health_check():
    return {
        "status": "PathwayAI API Running",
        "mode": "Cloud" if USE_CLOUD else "Local",
    }


@app.get("/api/sessions", response_model=List[SessionSummary])
def get_sessions(current_user: Optional[dict] = Depends(get_current_user)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    user_email = (
        current_user.get("email") or current_user.get("user_id")
        if current_user
        else None
    )

    if user_email:
        cursor.execute(
            "SELECT session_id, title, created_at FROM sessions WHERE user_email = ? ORDER BY created_at DESC",
            (user_email,),
        )
    else:
        cursor.execute(
            "SELECT session_id, title, created_at FROM sessions WHERE user_email IS NULL ORDER BY created_at DESC"
        )

    rows = cursor.fetchall()
    conn.close()
    return [{"session_id": r[0], "title": r[1], "created_at": r[2]} for r in rows]


@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
def get_session_messages(
    session_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    user_email = (
        current_user.get("email") or current_user.get("user_id")
        if current_user
        else None
    )

    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT user_email FROM sessions WHERE session_id = ?",
            (session_id,),
        )
        session_row = cursor.fetchone()

        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found")

        stored_user_email = session_row[0]
        if stored_user_email and stored_user_email != user_email:
            raise HTTPException(
                status_code=403, detail="Unauthorized access to this session"
            )

        cursor.execute(
            "SELECT node_id, status FROM node_progress WHERE session_id = ?",
            (session_id,),
        )
        progress_map = dict(cursor.fetchall())

        cursor.execute(
            "SELECT role, content, image FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        rows = cursor.fetchall()

    messages = []
    for role, content, image in rows:
        if role == "assistant" and "```json" in content:
            try:
                match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
                if match:
                    raw_json = match.group(1).strip()
                    roadmap_data = json.loads(raw_json)

                    if "nodes" in roadmap_data and isinstance(
                        roadmap_data["nodes"], list
                    ):
                        for node in roadmap_data["nodes"]:
                            node_id = str(node.get("id"))
                            if node_id in progress_map:
                                node["status"] = progress_map[node_id]

                    new_json_str = (
                        f"```json\n{json.dumps(roadmap_data, indent=2)}\n```"
                    )
                    content = re.sub(
                        r"```json\s*[\s\S]*?\s*```", new_json_str, content
                    )
            except Exception as e:
                print(f"Error merging roadmap node status: {e}")

        messages.append({"role": role, "content": content, "image": image})

    return {"messages": messages, "node_progress": progress_map}


# ---------------------------------------------------------------------------
# 7. STREAMING CHAT ENDPOINT (MULTIMODAL & DOCUMENT SUPPORT)
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_current_user),
):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    session_id = request.session_id or str(uuid.uuid4())
    last_message = request.messages[-1]

    last_user_content = last_message.content
    last_user_image = last_message.image

    # --- GOOGLE CLOUD VISION OCR INTERCEPTOR ---
    raw_image_data = None
    if last_user_image:
        raw_image_data = last_user_image
    elif last_message.file and last_message.file.type.startswith("image/"):
        raw_image_data = last_message.file.data

    if raw_image_data:
        try:
            header, encoded = (
                raw_image_data.split(",", 1)
                if "," in raw_image_data
                else ("", raw_image_data)
            )
            image_bytes = base64.b64decode(encoded)

            ocr_text = extract_text(image_bytes)

            if ocr_text:
                last_user_content = (
                    f"The user uploaded an image containing handwritten text. "
                    f"Here is the exact verbatim transcription extracted via Google Cloud Vision OCR:\n\n"
                    f"\"\"\"\n{ocr_text}\n\"\"\"\n\n"
                    f"User's Question / Instruction: {last_message.content or 'Please transcribe the text verbatim and provide career guidance.'}"
                )

                last_user_image = None
                last_message.image = None
                if last_message.file:
                    last_message.file = None

        except Exception as e:
            print(f"[OCR ERROR]: {e}")

    if last_message.file and not last_message.file.type.startswith("image/"):
        doc_text = extract_document_text(last_message.file)
        last_user_content += doc_text

    user_email = (
        current_user.get("email") or current_user.get("user_id")
        if current_user
        else None
    )

    # First ensure session exists with temporary title
    create_session_if_not_exists(
        session_id, "Career Guidance Session", user_email=user_email
    )

    # Generate meaningful title from the first user message of the conversation
    first_message_content = (
        request.messages[0].content.strip()
        if request.messages
        else last_message.content.strip()
    )
    title_source = (
        first_message_content
        or (last_message.file.name if last_message.file else "")
        or "New Chat"
    )

    generated_title = await generate_chat_title(title_source)
    update_session_title(session_id, generated_title)

    save_chat_message(session_id, "user", last_user_content, last_user_image)

    past_messages = []
    for m in request.messages[:-1]:
        m_content = m.content

        if m.file and not m.file.type.startswith("image/"):
            m_content += extract_document_text(m.file)

        if m.role == "user":
            past_messages.append(
                HumanMessage(
                    content=m_content
                    if m_content.strip()
                    else "[Uploaded Image/Document]"
                )
            )
        else:
            past_messages.append(AIMessage(content=m.content))

    context_str = "No extra context."
    if retriever and last_user_content.strip():
        try:
            docs = retriever.invoke(last_user_content[:1000])
            if docs:
                context_str = "\n\n".join([d.page_content for d in docs])
        except Exception as e:
            print(f"RAG lookup warning: {e}")

    llm = get_llm()
    chain = prompt | llm

    current_input = format_message_content(last_user_content, last_user_image)

    async def generate():
        full_assistant_response = ""
        async for chunk in chain.astream(
            {
                "context": context_str,
                "chat_history": past_messages,
                "input": current_input,
            }
        ):
            if chunk.content:
                if isinstance(chunk.content, list):
                    text_parts = []
                    for part in chunk.content:
                        if isinstance(part, str):
                            text_parts.append(part)
                        elif isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                        elif hasattr(part, "text"):
                            text_parts.append(part.text)
                    chunk_text = "".join(text_parts)
                else:
                    chunk_text = str(chunk.content)

                if chunk_text:
                    full_assistant_response += chunk_text
                    yield chunk_text

        save_chat_message(session_id, "assistant", full_assistant_response)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Session-ID": session_id},
    )


@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    user_email = (
        current_user.get("email") or current_user.get("user_id")
        if current_user
        else None
    )

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT user_email FROM sessions WHERE session_id = ?", (session_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    stored_user_email = row[0]
    if stored_user_email and stored_user_email != user_email:
        conn.close()
        raise HTTPException(
            status_code=403, detail="Unauthorized deletion request"
        )

    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))

    conn.commit()
    conn.close()
    return {"message": f"Session {session_id} successfully deleted"}


# ---------------------------------------------------------------------------
# 8. DOCUMENT EXPORT ENDPOINT (WORD / .DOCX)
# ---------------------------------------------------------------------------
@app.post("/api/export/docx")
def export_to_docx(request: DocumentExportRequest):
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    title_p = doc.add_paragraph()
    title_run = title_p.add_run("PathwayAI — Career Guidance Report")
    title_run.font.size = Pt(18)
    title_run.font.bold = True

    lines = request.content.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("### "):
            p = doc.add_paragraph()
            r = p.add_run(stripped.replace("### ", ""))
            r.font.size = Pt(13)
            r.font.bold = True
        elif stripped.startswith("## "):
            p = doc.add_paragraph()
            r = p.add_run(stripped.replace("## ", ""))
            r.font.size = Pt(15)
            r.font.bold = True
        elif stripped.startswith("# "):
            p = doc.add_paragraph()
            r = p.add_run(stripped.replace("# ", ""))
            r.font.size = Pt(17)
            r.font.bold = True

        elif stripped.startswith("- ") or stripped.startswith("* "):
            p = doc.add_paragraph(style="List Bullet")
            text = re.sub(r"^[\-\*]\s+", "", stripped)
            parts = re.split(r"(\*\*.*?\*\*)", text)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    r = p.add_run(part[2:-2])
                    r.font.bold = True
                else:
                    p.add_run(part)

        else:
            p = doc.add_paragraph()
            parts = re.split(r"(\*\*.*?\*\*)", stripped)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    r = p.add_run(part[2:-2])
                    r.font.bold = True
                else:
                    p.add_run(part)

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)

    filename = (
        request.filename
        if request.filename.endswith(".docx")
        else f"{request.filename}.docx"
    )

    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )