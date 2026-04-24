# Student Wellness Assistant - Complete Project Documentation

## Project Overview

An AI-powered health tracking system that collects student symptoms via Google Forms, analyzes them using Groq LLM (Llama 3.3 70B), tracks wellness trends, awards points, and sends personalized email reports.

### Technology Stack

| Tool | Purpose |
|------|---------|
| n8n | Workflow automation (Docker) |
| Google Forms | Symptom data collection |
| Google Sheets | Data storage |
| Groq LLM | AI symptom analysis |
| Gmail | Email delivery |
| HTML/CSS/JS + Chart.js | Student dashboard |

---

## Google Sheets Structure

### Sheet 1: `Student_Master` (One row per student)

| Column | Description |
|--------|-------------|
| student_email | Primary key |
| student_name | Full name |
| first_submission | First log date |
| last_submission | Most recent date |
| submission_count | Number of logs |
| latest_sleep | Most recent sleep hours |
| latest_stress | Most recent stress (1-10) |
| latest_energy | Most recent energy (1-5) |
| latest_symptoms | Most recent symptoms |
| total_points | Cumulative points |
| streak | Consecutive weeks |
| improvement_status | IMPROVING/STABLE/WORSENING |

### Sheet 2: `Wellness_History` (Append only)

| Column | Description |
|--------|-------------|
| timestamp | Submission date/time |
| student_email | Student identifier |
| submission_number | Log number |
| symptoms | Reported symptoms |
| sleep | Hours slept |
| stress | Stress level (1-10) |
| energy | Energy level (1-5) |
| condition | AI-predicted condition |
| points | Points earned |
| probability_1 | AI probability % |
| confidence_1 | AI confidence % |
| remedy_1 | Recommended remedy |
| immediate_action_1 | Do now action |
| immediate_action_2 | Next 2-3 hours action |
| immediate_action_3 | By tomorrow action |
| improvement_status | Progress status |
| progress_message | Text description |
| hydration_reminder | Water intake tip |
| break_reminder | Screen break tip |
| sleep_tip | Sleep advice |
| stress_relief_tip | Stress technique |
| wellness_tip | General advice |
| follow_up_needed | Doctor recommendation |

### Sheet 3: `Form Responses` (Linked to Google Form)

| Field | Type |
|-------|------|
| Student's Full Name | Text |
| Student Email Address | Email |
| How many hours of sleep? | Number |
| Stress level (1-10) | Scale |
| Energy level (1/2/3/4/5) | Scale |
| Symptoms (select all that apply) | Checkboxes |
| Water intake per day | Number |

---

## n8n Workflow Nodes

| Node | Name | Function |
|------|------|----------|
| 1 | Google Sheets Trigger | Polls new form submissions (every minute) |
| 2 | Extract Form Data | Converts form data to structured JSON |
| 3 | Searches for student | Looks up email in Student_Master |
| 4 | IF Node | Routes to new/returning student logic |
| 5 | Append New Student | Creates first record for new students |
| 6 | Points calculation | Calculates trends, points, streak |
| 7 | Update Student_Master | Updates existing student record |
| 8 | Basic LLM Chain | AI analysis using Groq |
| 9 | AI output | Parses and validates JSON response |
| 10 | Append Wellness History | Stores submission in history |
| 11 | Send message | Sends HTML email report |

---
