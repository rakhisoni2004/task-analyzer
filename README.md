# Smart Task Analyzer  
A mini-application that scores, prioritizes, and visualizes tasks based on urgency, importance, effort, and dependencies.  
Built as part of the Software Development Intern Technical Assignment.

---

## 🚀 Features Overview

### ✓ Smart Priority Scoring Algorithm  
Tasks are scored using 4 weighted factors:
- **Urgency** (due dates, overdue boost)
- **Importance** (1–10 scale)
- **Effort** (quick-win favoring low-hours tasks)
- **Dependencies** (tasks that block others gain priority)

Includes 4 strategies:
- **Smart Balance** (default)
- **Fastest Wins**
- **High Impact**
- **Deadline Driven**

---

### ✓ Bonus Feature 1 — Dependency Graph Visualization  
- **Tasks rendered as nodes**
- **Directed edges show dependencies**  
- **Cycle detection with red-node highlight**
- **Clean SVG layout with auto spacing and smart label wrapping**  

---

### ✓ Bonus Feature 2 — Eisenhower Matrix  
*Tasks plotted in 4 quadrants:*
- **Urgent & Important (Do First)**
- **Not Urgent but Important (Plan)**
- **Urgent but Not Important (Delegate)**
- **Not Urgent & Not Important (Eliminate)**
- **Color-coded priority indicators included.**

---

### ✓ Responsive Frontend (HTML + CSS + JS)
- **Task input (manual + bulk JSON)**
- **Strategy selector dropdown**
- **Priority score display with color coding**
- **Graph view & Matrix view tabs**  
- **Clean dark-theme UI** 
- **Error handling + loading states** 

### ✓ Returns top 3 tasks with explanations.
- *Algorithm Explanation (Summary)*
  - **Each task receives a composite score calculated as:**

- **final_score =**
    - **w1 * urgency_component +**
    - **w2 * importance_component +**
    - **w3 * effort_component +**
    - **w4 * dependency_component**

### 1)  Urgency
- **Past-due tasks get heavy boost (120 + days overdue).**
- **Due within 3 days → sharply increasing urgency.**
- **Far future → lower urgency.**

### 2) Importance
- **importance (1–10) × 9**

### 3) Effort (Quick Wins)
- **Inverse of estimated hours:**
- **effort = 30 / (1 + hours)**

### 4) Dependencies (Blocking Power)
- **Each task that depends on this task adds weight.**
- **Weights change based on selected strategy.**



### 📁 Project Structure
backend/
tasks/
static/
templates/
docs/screenshots/
   - **Screenshot 2025-11-27 181348.png**
   - **Screenshot 2025-11-27 181218.png** 
   - **Screenshot 2025-11-27 181241.png** 
   - **Screenshot 2025-11-27 181258.png** 
   - **Screenshot 2025-11-27 181336.png**
requirements.txt
manage.py
README.md



### 🧪 Running Tests
- **python manage.py test tasks -v 2**


### All tests pass (5/5) including:
- **cycle detection**
- **urgency boost**
- **strategy logic**
- **low-effort prioritization**
- **dependency priority** 


### ▶️ Running the App Locally
- **1. Create virtual env**
- **python -m venv venv**
- **2. Activate**
- **Windows:**
- **venv\Scripts\activate**
- **3. Install dependencies**
- **pip install -r requirements.txt**
- **4. Run server**
- **python manage.py runserver**


### Open in browser:
- **http://127.0.0.1:8000/**


### 🖼 Screenshots
   - **Screenshot 2025-11-27 181348.png** 
   - **Screenshot 2025-11-27 181218.png** 
   - **Screenshot 2025-11-27 181241.png** 
   - **Screenshot 2025-11-27 181258.png** 
   - **Screenshot 2025-11-27 181336.png**



### 📌 Future Improvements
- **1 Add database storage for tasks**
- **2 Drag-drop graph layout**
- **3 Save strategies per user**
- **4 AI-based learning for score adjustment**
- **5 Export task reports**


### 👩‍💻 Author
- **Rakhi Soni**
- **Software Developer (Frontend + Backend)**
- **GitHub: https://github.com/rakhisoni2004**



# Final Step — Commit the README
- **Terminal:**
- **powershell**
- **git add README.md**
- **git commit -m "Add professional README"**
- **git push**

### ✓ Backend (Python + Django)
- **No database required (tasks come through request)**
- **API Endpoints:**
  
#### **POST /api/tasks/analyze/**
Request:
```json
{
  "strategy": "smart_balance",
  "tasks": [
    {"id":"1","title":"Fix bug","due_date":"2025-11-30","estimated_hours":3,"importance":8,"dependencies":[]}
  ]
}
Response:

{
  "results": [
    {
      "id": "1",
      "title": "Fix bug",
      "score": 47.2,
      "explanation": {
        "urgency_text": "3 days left",
        "importance": 8,
        "effort_hours": 3,
        "blocks_count": 0
      }
    }
  ]
}

GET /api/tasks/suggest/


Commands — run app & tests
# create venv
python -m venv venv

# activate (Windows)
venv\Scripts\activate

# install
pip install -r requirements.txt

# run server
python manage.py runserver

# tests
python manage.py test tasks -v 2

Git — final README commit & push
git add README.md
git commit -m "Add polished README"
git push


