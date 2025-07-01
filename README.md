# CTI Analyst Self-Assessment Web Application

## Overview

The CTI Analyst Self-Assessment is a web application designed to help users identify their skills gaps in Cyber Threat Intelligence (CTI) across key domains. The app presents a multiple-choice questionnaire, calculates scores by domain, and provides personalized feedback and a future learning roadmap based on user responses.

## Features
- Multiple-choice questionnaire grouped by CTI domains:
  - Technical Foundations
  - Threat Intelligence Fundamentals
  - Analytical Skills
  - Tools and Technologies
  - Communication and Collaboration
  - Industry Knowledge
- Weighted scoring per question and domain
- Results page with overall and domain-specific scores, proficiency level, and targeted feedback
- Review of all answers with correct/incorrect highlighting
- Additional questions on learning style and CTI career interests (not scored)
- Personalized future roadmap advice based on learning style and area of interest
- Responsive, accessible, and user-friendly interface using HTML, Tailwind CSS, and vanilla JavaScript

## Getting Started

You can run this application either using Docker (recommended) or a local web server.

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker
- Docker Compose

#### Running with Docker Compose
1. **Clone or download this repository.**
2. **Start the application:**
   ```bash
   docker-compose up -d
   ```
3. **Open your browser and go to:**
   ```
   http://localhost:8080
   ```

To stop the application:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

To rebuild and restart (if you make changes to the Dockerfile):
```bash
docker-compose up -d --build
```

### Option 2: Local Web Server

#### Prerequisites
- A modern web browser
- Python (for running a local server) or Node.js (for alternatives)

#### Setup
1. **Clone or download this repository.**
2. **Start a local web server in the project directory:**
   - With Python 3:
     ```
     python -m http.server 8000
     ```
   - Or with Node.js:
     ```
     npx serve .
     ```
3. **Open your browser and go to:**
   ```
   http://localhost:8000
   ```

> **Note:** Opening `index.html` directly will not work due to browser security restrictions on loading local JSON files.

### Project Structure
```
.
├── docs/                   # Application root
│   ├── data/              # JSON data files
│   │   ├── learning_style.json
│   │   └── questions.json
│   ├── src/               # Source files
│   │   ├── kraven-security-logo.jpg
│   │   └── script.js
│   └── index.html         # Main HTML file
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile            # Docker container definition
├── LICENSE              # MIT License
└── README.md           # This file
```

## Development

### Making Changes
When running with Docker Compose, the application files are mounted as a volume. This means:
- Changes to files in the `docs` directory will be reflected immediately
- No container rebuild is needed for content changes
- Container will automatically restart if it crashes

### Customization
- Edit `docs/data/questions.json` to add or modify assessment questions and feedback
- Edit `docs/data/learning_style.json` to change learning style or career interest questions

## License
This project is licensed under the MIT License.
