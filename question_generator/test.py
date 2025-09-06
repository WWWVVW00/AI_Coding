import requests
import json

# Test data
payload = {
    "course_outline": "Introduction to Python programming, data structures, and algorithms.",
    "textbook_materials": "Python for Beginners, Advanced Python Techniques.",
    "exam_materials": "Previous exam questions on loops, functions, and OOP."
}

# Send request to the service
response = requests.post(
    "http://localhost:5000/generate_questions",
    headers={"Content-Type": "application/json"},
    data=json.dumps(payload)
)

# Print response
print(response.json())