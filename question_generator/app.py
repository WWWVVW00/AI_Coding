from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import PyPDF2
from io import BytesIO

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")
openai.api_base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
openai_model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Initialize OpenAI client
openai_client = openai.OpenAI(
    api_key=openai.api_key,
    base_url=openai.api_base
)

# Debug: Print API configuration
print(f"[DEBUG] OpenAI API Base: {openai.api_base}")
print(f"[DEBUG] OpenAI API Key: {'*' * len(openai.api_key) if openai.api_key else 'None'}")
print(f"[DEBUG] OpenAI Model: {openai_model}")

def extract_text_from_pdf(pdf_file):
    """Extract text content from a PDF file."""
    pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_file.read()))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

@app.route('/generate_questions', methods=['POST'])
def generate_questions():
    """
    Generate exam questions and answers based on provided course materials.
    Expected input format (either JSON or PDF files):
    {
        "course_outline": "...",  # Optional
        "textbook_materials": "...",  # Optional
        "exam_materials": "...",  # Optional
        "textbook_pdf": PDF_FILE,  # Optional
        "exam_pdf": PDF_FILE  # Optional
    }
    """
    combined_materials = ""
    
    # Handle JSON input
    if request.is_json:
        data = request.get_json()
        if data.get('course_outline'):
            combined_materials += f"Course Outline:\n{data['course_outline']}\n\n"
        if data.get('textbook_materials'):
            combined_materials += f"Textbook Materials:\n{data['textbook_materials']}\n\n"
        if data.get('exam_materials'):
            combined_materials += f"Exam Materials:\n{data['exam_materials']}\n\n"
    
    # Handle PDF input
    if 'textbook_pdf' in request.files:
        textbook_pdf = request.files['textbook_pdf']
        combined_materials += f"Textbook PDF Content:\n{extract_text_from_pdf(textbook_pdf)}\n\n"
    if 'exam_pdf' in request.files:
        exam_pdf = request.files['exam_pdf']
        combined_materials += f"Exam PDF Content:\n{extract_text_from_pdf(exam_pdf)}\n\n"
    
    # Validate at least one input is provided
    if not combined_materials.strip():
        return jsonify({"error": "No input materials provided"}), 400
    
    # Check if mock mode is enabled
    if os.getenv("MOCK_MODE", "False").lower() == "true":
        mock_questions = [
            {"question": "What is the main topic of the course?", "answer": "The main topic is Python programming."},
            {"question": "List two data structures covered in the course.", "answer": "Lists and dictionaries."},
            {"question": "What is the purpose of a loop?", "answer": "To repeat a block of code multiple times."},
            {"question": "Define a function in Python.", "answer": "A reusable block of code that performs a specific task."},
            {"question": "What is OOP?", "answer": "Object-Oriented Programming, a programming paradigm based on objects."}
        ]
        return jsonify({
            "questions": mock_questions,
            "mock_mode": True,
            "parsed_materials": combined_materials  # Return parsed materials for debugging
        })
    else:
        # Generate questions using OpenAI
        try:
            # Debug: Print request details
            print(f"[DEBUG] Sending request to: {openai.api_base}")
            
            response = openai_client.chat.completions.create(
                model=openai_model,
                messages=[
                    {"role": "system", "content": "You are an expert educator who generates exam questions and answers based on provided course materials."},
                    {"role": "user", "content": f"Generate 5 exam questions with answers based on the following materials:\n\n{combined_materials}"}
                ],
                temperature=0.7
            )
            
            # Debug: Print response status
            print(f"[DEBUG] Response status: {response}")
            
            # Extract generated questions and answers
            generated_content = response.choices[0].message.content
            # Parse generated content into JSON format
            questions_list = []
            for qa_pair in generated_content.split("\n\n"):
                if qa_pair.strip():
                    parts = qa_pair.split("\n")
                    if len(parts) >= 2:
                        question = parts[0].strip()
                        answer = "\n".join(parts[1:]).strip()
                        questions_list.append({"question": question, "answer": answer})
            return jsonify({"questions": questions_list})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)))