import os
import json
import time
from langchain_ollama import OllamaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
# -------------------------------------------------
# CONFIG
# -------------------------------------------------
os.environ["GOOGLE_API_KEY"] = ""  # Set your Google API key here   

CHROMA_PATH = "./chroma_db"       
MODEL_NAME = "gemini-3.1-flash-lite"   

# -------------------------------------------------
# Load RAG components
# -------------------------------------------------
embeddings = OllamaEmbeddings(model="nomic-embed-text")
vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.2)

# Simple RAG chain
template = """You are PathwayAI, a helpful AI career mentor.
Answer the question using only the context below. Be specific and practical.

Context:
{context}

Question: {question}
"""

prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# -------------------------------------------------
# Test Questions (add more as needed)
# -------------------------------------------------
test_data = [
    # --- High School (1–33) ---
    {"question": "I completed my Higher Secondary Board Exams in CS and am preparing for my upcoming entrance exams to join a B.Tech program this fall. Should I focus on C++ or Java for backend engineering?", "expected_stage": "High School"},
    {"question": "As a JEE aspirant aiming for CS engineering, how early should I start learning LeetCode and System Design concepts?", "expected_stage": "High School"},
    {"question": "I'm balancing high school term finals with learning web development on the side. Is Next.js suitable as a first framework?", "expected_stage": "High School"},
    {"question": "I am in 11th grade with PCMC. What beginner-friendly projects can I build to add to my college application portfolio?", "expected_stage": "High School"},
    {"question": "I am a high school senior interested in Artificial Intelligence. Should I pursue a pure Computer Science degree or an AI/ML specialized degree?", "expected_stage": "High School"},
    {"question": "I am preparing for 12th grade board exams and want to get into competitive programming. Should I start with Python or C++?", "expected_stage": "High School"},
    {"question": "How can a high school student participate in open-source programs like Google Summer of Code before entering college?", "expected_stage": "High School"},
    {"question": "I am in 10th grade and love building simple Python scripts. What mathematics topics should I focus on for future Data Science studies?", "expected_stage": "High School"},
    {"question": "Should I focus on preparing for engineering entrance exams (like JEE) or building web apps during my 12th grade break?", "expected_stage": "High School"},
    {"question": "Is taking an AP Computer Science course worth it if I plan to study CS in India?", "expected_stage": "High School"},
    {"question": "What basic hardware concepts should a high school graduate learn before starting a Computer Science and Engineering degree?", "expected_stage": "High School"},
    {"question": "I am a high school student interested in Cyber Security. What safe platforms exist for beginners to practice ethically?", "expected_stage": "High School"},
    {"question": "How can I prepare for coding hackathons while still in high school?", "expected_stage": "High School"},
    {"question": "I am choosing my 11th grade stream. Is Computer Science necessary in high school to do B.Tech CS in college?", "expected_stage": "High School"},
    {"question": "What is the difference between IT engineering and Computer Science engineering for a high school student making college choices?", "expected_stage": "High School"},
    {"question": "I am in 12th grade. What basic Git and GitHub commands should every beginner developer learn?", "expected_stage": "High School"},
    {"question": "How much math is actually required for Software Engineering vs Game Development for high schoolers choosing electives?", "expected_stage": "High School"},
    {"question": "Should high school students build personal websites using HTML/CSS/JS or use site builders like Framer/Wix?", "expected_stage": "High School"},
    {"question": "What certification, if any, is valuable for high school students wanting to demonstrate early technical skills?", "expected_stage": "High School"},
    {"question": "How do I manage my time between entrance exam coaching and self-taught programming in high school?", "expected_stage": "High School"},
    {"question": "I want to explore robotics in high school. Should I buy an Arduino or a Raspberry Pi to start?", "expected_stage": "High School"},
    {"question": "What free platforms can a high schooler use to host their first web development projects online?", "expected_stage": "High School"},
    {"question": "Is learning Linux terminal commands useful for high school students interested in DevOps?", "expected_stage": "High School"},
    {"question": "I am finishing high school and interested in Mobile App development. Should I start with Flutter or Native Android?", "expected_stage": "High School"},
    {"question": "How can high schoolers find virtual coding internships or research opportunities?", "expected_stage": "High School"},
    {"question": "What is the best way for a high school student to learn object-oriented programming (OOP) principles?", "expected_stage": "High School"},
    {"question": "I am in 11th grade standard. Should I prioritize learning Data Structures or Web Development first?", "expected_stage": "High School"},
    {"question": "Are online coding bootcamps recommended for high school graduates instead of a standard 4-year degree?", "expected_stage": "High School"},
    {"question": "What laptop specifications are required for a high school student entering a Computer Science university program?", "expected_stage": "High School"},
    {"question": "How can I learn problem-solving and algorithmic thinking before learning a programming language?", "expected_stage": "High School"},
    {"question": "Is Cloud Computing worth learning for a high school student, or should I stick to core programming languages first?", "expected_stage": "High School"},
    {"question": "I am in high school and interested in UX/UI design. Do I need to learn frontend coding as well?", "expected_stage": "High School"},
    {"question": "What programming languages are taught in typical first-year B.Tech Computer Science programs?", "expected_stage": "High School"},

    # --- College (34–66) ---
    {"question": "I am working on my final-year capstone project and preparing for campus placements in cloud engineering. What AWS certifications should I target before graduation?", "expected_stage": "College"},
    {"question": "I am writing my Master's thesis on Graph Neural Networks while working as a part-time Graduate Teaching Assistant. Which MLOps frameworks are expected for industry entry roles?", "expected_stage": "College"},
    {"question": "Our university curriculum only covers relational databases, but I want to master NoSQL for my semester mini-project. Where should I begin?", "expected_stage": "College"},
    {"question": "I am taking high school level remedial math courses online to clear prerequisites for my university CS enrollment next month. What discrete math topics matter most?", "expected_stage": "College"},
    {"question": "I am a 2nd year CS student. How many LeetCode questions should I target before campus placement season begins in 4th year?", "expected_stage": "College"},
    {"question": "I am in my 3rd year of college. How do I choose between targeting product-based companies vs service-based companies for internships?", "expected_stage": "College"},
    {"question": "How can I pitch an open-source contribution as a major academic project to my college faculty?", "expected_stage": "College"},
    {"question": "I am a 3rd year IT student. Should I learn Docker and Kubernetes during college or wait until I get a DevOps job?", "expected_stage": "College"},
    {"question": "How do I balance semester GPA exams with off-campus internship preparation?", "expected_stage": "College"},
    {"question": "What full-stack projects stand out most on a college undergraduate resume for software engineering roles?", "expected_stage": "College"},
    {"question": "I am in my 2nd year. Is getting a cloud certification (AWS/Azure) helpful for landing software developer internships?", "expected_stage": "College"},
    {"question": "What System Design topics are usually asked in fresh graduate entry-level software engineer interviews?", "expected_stage": "College"},
    {"question": "I am a final year student without any prior internships. How can I improve my chance of landing an entry-level job off-campus?", "expected_stage": "College"},
    {"question": "How should I prepare for technical phone screens and live coding rounds during campus placements?", "expected_stage": "College"},
    {"question": "I am studying Electrical Engineering but want to switch to Software Engineering. What core CS courses must I audit?", "expected_stage": "College"},
    {"question": "What is the ideal timeline in college to apply for Google Summer of Code (GSoC) or similar open-source fellowships?", "expected_stage": "College"},
    {"question": "Should a 3rd year college student publish research papers or focus on building production-ready apps for industry jobs?", "expected_stage": "College"},
    {"question": "What is the best approach to prepare for core CS subjects like OS, DBMS, and Computer Networks for campus interviews?", "expected_stage": "College"},
    {"question": "How do college students convert a summer internship into a full-time job (PPO/Pre-Placement Offer)?", "expected_stage": "College"},
    {"question": "I am a 1st year CS undergrad. Should I focus on learning backend development, frontend, or competitive programming first?", "expected_stage": "College"},
    {"question": "How important is an active GitHub profile for campus recruitment compared to DSA problem-solving ratings?", "expected_stage": "College"},
    {"question": "I am in my 4th year of college doing a Machine Learning project. How do I deploy my ML model to a live web server for evaluation?", "expected_stage": "College"},
    {"question": "How can college students build networking connections with senior software engineers on LinkedIn for referral requests?", "expected_stage": "College"},
    {"question": "Is pursuing a Master's degree (MS/M.Tech) immediately after B.Tech better than gaining 2 years of work experience?", "expected_stage": "College"},
    {"question": "What should be included in a final year CS capstone project presentation to impress both faculty and recruiters?", "expected_stage": "College"},
    {"question": "How do I structure a cold email to college alumni to ask for entry-level tech referrals?", "expected_stage": "College"},
    {"question": "I am a college sophomore. What is the difference between monolithic architecture and microservices for project planning?", "expected_stage": "College"},
    {"question": "How should college students prepare for HR and behavioral interview rounds alongside coding prep?", "expected_stage": "College"},
    {"question": "What are the key differences between React and Vue for a university team project with a tight deadline?", "expected_stage": "College"},
    {"question": "I am a 3rd year student wanting to focus on Data Engineering. What skills are essential besides SQL and Python?", "expected_stage": "College"},
    {"question": "How can I practice system design mock interviews with peers while still in college?", "expected_stage": "College"},
    {"question": "Should I learn C++ or Java for object-oriented programming coursework and competitive coding in college?", "expected_stage": "College"},
    {"question": "I am in my final semester. What should I include in my developer portfolio to show production-level readiness?", "expected_stage": "College"},

    # --- Working Professional (67–100) ---
    {"question": "I have been in a non-tech corporate role for 3 years and am taking online bootcamps after office hours to shift into Data Science. What Python libraries are essential for production deployment?", "expected_stage": "Working Professional"},
    {"question": "I graduated with a B.E. last month and just signed an offer letter for an SDE-1 position starting next month. What system design topics should I study during my pre-onboarding phase?", "expected_stage": "Working Professional"},
    {"question": "I am mentoring high school students in robotics while managing my day-to-day work as a Senior DevOps Engineer. How can I transition internally to a Solutions Architect role?", "expected_stage": "Working Professional"},
    {"question": "I have 2 years of experience as a Backend Developer in Java. How do I prepare for SDE-2 system design interviews at product companies?", "expected_stage": "Working Professional"},
    {"question": "I am an QA Automation Engineer with 4 years of experience. What is the most effective roadmap to switch to a full-stack developer role?", "expected_stage": "Working Professional"},
    {"question": "As a Software Engineer with 5 years experience, should I pursue an Executive MBA or a Master's in CS to advance to Engineering Management?", "expected_stage": "Working Professional"},
    {"question": "I am a frontend developer with 3 years of React experience. How do I transition to full-stack using Node.js and cloud services?", "expected_stage": "Working Professional"},
    {"question": "How can an SDE-1 with 1 year of experience start taking ownership of architectural decisions in a team setting?", "expected_stage": "Working Professional"},
    {"question": "I work in tech support and want to move into Cloud Architecture. Which AWS certifications and hands-on projects should I prioritize?", "expected_stage": "Working Professional"},
    {"question": "I am a Data Analyst with 2 years of experience wanting to move to Data Engineering. What tools should I focus on next?", "expected_stage": "Working Professional"},
    {"question": "How do experienced developers balance learning new tech stacks (like Rust or Go) with long work hours and family commitments?", "expected_stage": "Working Professional"},
    {"question": "I am a Senior Software Engineer preparing for staff-level promotion. How do I demonstrate cross-team technical leadership?", "expected_stage": "Working Professional"},
    {"question": "I am returning to work after a 2-year career gap in software development. How should I explain this gap and update my skill set?", "expected_stage": "Working Professional"},
    {"question": "I am working as a mainframe engineer with 6 years experience. How can I modernize my profile for modern backend microservices?", "expected_stage": "Working Professional"},
    {"question": "What strategies can a working professional use to prepare for system design and coding interviews in 3 months?", "expected_stage": "Working Professional"},
    {"question": "How do I transition from an individual contributor (IC) Software Engineer to an Engineering Manager (EM) path?", "expected_stage": "Working Professional"},
    {"question": "I am an SDE-2 leading a microservices migration project. What design patterns are essential for maintaining backward compatibility?", "expected_stage": "Working Professional"},
    {"question": "How can working professionals contribute effectively to major open-source projects without impacting their full-time job obligations?", "expected_stage": "Working Professional"},
    {"question": "I have 8 years of IT experience in database administration. How do I transition to Big Data Platform Engineering?", "expected_stage": "Working Professional"},
    {"question": "As a working developer, what are the best practices for setting up local Kubernetes environments (like Minikube/Kind) for testing?", "expected_stage": "Working Professional"},
    {"question": "I am moving from a monolithic backend to serverless on AWS. What architectural pitfalls should our team watch out for?", "expected_stage": "Working Professional"},
    {"question": "How do software engineers negotiate compensation packages (base, equity, bonuses) for mid-to-senior tech roles?", "expected_stage": "Working Professional"},
    {"question": "I am a Mobile Engineer (iOS) with 3 years experience. Should I learn Flutter or double down on Swift and native performance optimization?", "expected_stage": "Working Professional"},
    {"question": "How can working developers stay up to date with AI tools and LLM integrations without getting overwhelmed by trends?", "expected_stage": "Working Professional"},
    {"question": "I am a Cyber Security Analyst wanting to pivot to DevSecOps. What CI/CD pipeline security tooling should I learn?", "expected_stage": "Working Professional"},
    {"question": "What is the best way to document technical designs (RFCs/ADRs) when leading project initiatives at work?", "expected_stage": "Working Professional"},
    {"question": "I have 4 years experience as a PHP backend developer. How do I transition to modern Go/Python cloud services?", "expected_stage": "Working Professional"},
    {"question": "How do senior developers evaluate whether to refactor legacy code or rewrite a service from scratch?", "expected_stage": "Working Professional"},
    {"question": "I am a DevOps Engineer looking to transition into Site Reliability Engineering (SRE). What observability frameworks should I focus on?", "expected_stage": "Working Professional"},
    {"question": "How do software engineers handle burnout and maintain high productivity in fast-paced startup environments?", "expected_stage": "Working Professional"},
    {"question": "I am a Senior Frontend Engineer. How do I gain hands-on system architecture experience if my job only assigns UI tasks?", "expected_stage": "Working Professional"},
    {"question": "What is the expected depth of knowledge for distributed systems (e.g., CAP theorem, consensus algorithms) in Senior SDE interviews?", "expected_stage": "Working Professional"},
    {"question": "How do working professionals build personal technical brands on platforms like GitHub, blogs, or tech conferences?", "expected_stage": "Working Professional"},
    {"question": "I am a Full Stack Developer preparing to apply for remote jobs in international companies. What resume adjustments are critical?", "expected_stage": "Working Professional"}
]
# -------------------------------------------------
# Evaluation Prompt (Gemini as Judge)
# -------------------------------------------------
judge_prompt = ChatPromptTemplate.from_template("""
You are an expert evaluator for a career guidance chatbot called PathwayAI.

Evaluate the AI's answer based on the following:

Question: {question}
Retrieved Context: {context}
AI Answer: {answer}
Expected Academic Stage: {expected_stage}

Give scores from 1 to 5 for each criterion:

1. Faithfulness (1-5): Is the answer fully supported by the retrieved context? (5 = no hallucination)
2. Relevance (1-5): Does the answer directly address the user's question?
3. Stage Awareness (1-5): Is the advice appropriate for the expected academic stage?
4. Actionability (1-5): Does the answer give clear, practical next steps?
5. Overall Quality (1-5)

Also give a short comment.

Return ONLY valid JSON in this exact format:
{{
  "faithfulness": 4,
  "relevance": 5,
  "stage_awareness": 4,
  "actionability": 5,
  "overall": 4,
  "comment": "Short feedback here"
}}
""")

judge_chain = judge_prompt | llm | StrOutputParser()

# -------------------------------------------------
# Run Evaluation
# -------------------------------------------------
def evaluate():
    results = []
    print("Starting evaluation...\n")

    for i, item in enumerate(test_data, 1):
        question = item["question"]
        expected_stage = item["expected_stage"]

        print(f"[{i}/{len(test_data)}] {question[:70]}...")

        # 1. Retrieve context
        docs = retriever.invoke(question)
        context = "\n\n".join([d.page_content for d in docs])

        # 2. Generate answer
        answer = rag_chain.invoke(question)

        # 3. Judge the answer
        try:
            judge_response = judge_chain.invoke({
                "question": question,
                "context": context,
                "answer": answer,
                "expected_stage": expected_stage
            })

            # Clean the response (sometimes Gemini adds markdown)
            judge_response = judge_response.strip()
            if judge_response.startswith("```"):
                judge_response = judge_response.split("```")[1]
                if judge_response.startswith("json"):
                    judge_response = judge_response[4:]

            scores = json.loads(judge_response)

        except Exception as e:
            print(f"  ⚠️ Judge failed: {e}")
            scores = {
                "faithfulness": 0,
                "relevance": 0,
                "stage_awareness": 0,
                "actionability": 0,
                "overall": 0,
                "comment": "Evaluation failed"
            }

        result = {
            "question": question,
            "expected_stage": expected_stage,
            "answer": answer,
            "scores": scores
        }
        results.append(result)

        print(f"  → Overall: {scores.get('overall', 0)}/5 | Faithfulness: {scores.get('faithfulness', 0)}/5")
        time.sleep(4)  # small delay to avoid rate limits

    return results

# -------------------------------------------------
# Print Summary
# -------------------------------------------------
if __name__ == "__main__":
    results = evaluate()

    print("\n" + "="*60)
    print("EVALUATION SUMMARY")
    print("="*60)

    avg_faithfulness = sum(r["scores"]["faithfulness"] for r in results) / len(results)
    avg_relevance = sum(r["scores"]["relevance"] for r in results) / len(results)
    avg_stage = sum(r["scores"]["stage_awareness"] for r in results) / len(results)
    avg_action = sum(r["scores"]["actionability"] for r in results) / len(results)
    avg_overall = sum(r["scores"]["overall"] for r in results) / len(results)

    print(f"Average Faithfulness     : {avg_faithfulness:.2f} / 5")
    print(f"Average Relevance        : {avg_relevance:.2f} / 5")
    print(f"Average Stage Awareness  : {avg_stage:.2f} / 5")
    print(f"Average Actionability    : {avg_action:.2f} / 5")
    print(f"Average Overall Quality  : {avg_overall:.2f} / 5")
    print("="*60)

    # Save detailed results
    with open("evaluation_results1.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\nDetailed results saved to evaluation_results.json")