document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    
    let allQuestions = [];
    let allDomainFeedback = {};
    let learningQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let animating = false;
    let reviewMode = false;
    let reviewIndex = null;
    let infoStepShown = false;

    async function loadQuestions() {
        try {
            const res = await fetch('../data/questions.json');
            const data = await res.json();
            allQuestions = data.questions;
            allDomainFeedback = data.domains;

            const learningRes = await fetch('../data/learning_style.json');
            const learningData = await learningRes.json();
            learningQuestions = learningData.questions;
            
            startQuiz();
        } catch (error) {
            console.error("Failed to load questions:", error);
            quizContainer.innerHTML = `<p class="text-red-500">Error: Could not load quiz questions. Please check the console for more details.</p>`;
        }
    }

    function startQuiz() {
        // For now, just show the start button
        quizContainer.innerHTML = `
            <div class="text-center">
                <h2 class="text-2xl font-bold mb-4">Welcome to the CTI Analyst Self-Assessment</h2>
                <p class="mb-6">Click the button below to begin the assessment. You will be guided through a series of questions to help identify your strengths and weaknesses in Cyber Threat Intelligence.</p>
                <button id="start-btn" class="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">Start Assessment</button>
            </div>
        `;
        document.getElementById('start-btn').addEventListener('click', () => {
            displayQuestion();
        });
    }

    function displayQuestion(direction = 'forward') {
        if (animating) return;
        animating = true;
        const combinedQuestions = [...allQuestions, ...learningQuestions];
        // Show info step before learning style questions
        if (!infoStepShown && currentQuestionIndex === allQuestions.length) {
            quizContainer.classList.add('opacity-0');
            setTimeout(() => {
                quizContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[200px]">
                        <div class="text-blue-700 text-2xl mb-4">ℹ️</div>
                        <h2 class="text-xl font-bold mb-2">Learning Style & Areas of Interest</h2>
                        <p class="mb-6 text-gray-700 text-center">The following questions are about your learning style and areas of interest. <br>These are <b>not marked</b> and will not affect your score.</p>
                        <button id="continue-btn" class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400">Continue</button>
                    </div>
                `;
                quizContainer.classList.remove('opacity-0');
                quizContainer.classList.add('opacity-100');
                setTimeout(() => { animating = false; }, 200);
                document.getElementById('continue-btn').focus();
                document.getElementById('continue-btn').addEventListener('click', () => {
                    infoStepShown = true;
                    currentQuestionIndex++;
                    displayQuestion();
                });
            }, 200);
            return;
        }
        if (currentQuestionIndex >= combinedQuestions.length) {
            calculateAndShowResults();
            animating = false;
            return;
        }

        // Animation: fade out
        quizContainer.classList.add('opacity-0');
        setTimeout(() => {
            const question = combinedQuestions[currentQuestionIndex];
            const isLearningQuestion = currentQuestionIndex >= allQuestions.length;
            const progressText = isLearningQuestion 
                ? `Question ${currentQuestionIndex - allQuestions.length + 1} of ${learningQuestions.length} (Learning Style & Goals)`
                : `Question ${currentQuestionIndex + 1} of ${allQuestions.length} (CTI Assessment)`;
            const progressPercent = ((currentQuestionIndex) / combinedQuestions.length) * 100;

            // Determine if we're reviewing a previous answer
            reviewMode = currentQuestionIndex < userAnswers.length;
            reviewIndex = reviewMode ? userAnswers[currentQuestionIndex].answerIndex : null;

            let optionsHTML = '';
            question.options.forEach((option, index) => {
                const isSelected = reviewMode && reviewIndex === index;
                optionsHTML += `
                    <button 
                        class="block w-full text-left bg-gray-100 p-4 rounded-lg my-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-blue-100 transition-colors duration-150 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 font-bold' : ''}"
                        data-index="${index}"
                        tabindex="0"
                        aria-label="${option}"
                        ${isSelected ? 'aria-pressed="true"' : ''}
                    >
                        ${option}
                    </button>
                `;
            });

            quizContainer.innerHTML = `
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-sm text-gray-600">${progressText}</p>
                        <span class="text-xs text-gray-500">${currentQuestionIndex + 1}/${combinedQuestions.length}</span>
                    </div>
                    <div class="w-full bg-gray-300 rounded-full h-3">
                        <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="relative">
                    <h2 class="text-2xl font-bold mb-6">${question.question}</h2>
                    <div>
                        ${optionsHTML}
                    </div>
                    <div class="flex justify-between mt-6">
                        <button id="back-btn" class="${currentQuestionIndex === 0 ? 'invisible' : ''} bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Go to previous question">Back</button>
                        <button id="next-btn" class="${reviewMode ? '' : 'hidden'} bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Go to next question">Next</button>
                    </div>
                </div>
            `;

            // Animate in
            quizContainer.classList.remove('opacity-0');
            quizContainer.classList.add('opacity-100');
            setTimeout(() => { animating = false; }, 200);

            // Option button click/keyboard
            document.querySelectorAll('[data-index]').forEach(button => {
                button.addEventListener('click', (e) => {
                    if (animating) return;
                    const selectedIndex = parseInt(e.currentTarget.getAttribute('data-index'));
                    if (reviewMode) {
                        // Overwrite previous answer
                        userAnswers[currentQuestionIndex].answerIndex = selectedIndex;
                        reviewIndex = selectedIndex;
                        displayQuestion();
                    } else {
                        handleAnswer(selectedIndex);
                    }
                });
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                });
            });

            // Back button
            const backBtn = document.getElementById('back-btn');
            if (backBtn && currentQuestionIndex > 0) {
                backBtn.addEventListener('click', () => {
                    if (animating) return;
                    currentQuestionIndex--;
                    displayQuestion('backward');
                });
            }

            // Next button
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && reviewMode) {
                nextBtn.addEventListener('click', () => {
                    if (animating) return;
                    currentQuestionIndex++;
                    displayQuestion('forward');
                });
            }
        }, 200);
    }

    function handleAnswer(selectedIndex) {
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            answerIndex: selectedIndex
        });

        currentQuestionIndex++;
        displayQuestion();
    }

    function calculateAndShowResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        const domainScores = {};
        const maxDomainScores = {};
        const ctiAnswers = userAnswers.slice(0, allQuestions.length);

        // Initialize scores
        Object.keys(allDomainFeedback).forEach(domain => {
            domainScores[domain] = 0;
            maxDomainScores[domain] = 0;
        });

        // Calculate scores
        ctiAnswers.forEach(userAnswer => {
            const question = allQuestions[userAnswer.questionIndex];
            maxDomainScores[question.domain] += question.points;
            if (userAnswer.answerIndex === question.answer) {
                domainScores[question.domain] += question.points;
            }
        });

        let totalScore = 0;
        let maxTotalScore = 0;
        const domainPercentages = {};

        for(const domain in domainScores) {
            totalScore += domainScores[domain];
            maxTotalScore += maxDomainScores[domain];
            domainPercentages[domain] = maxDomainScores[domain] > 0 ? (domainScores[domain] / maxDomainScores[domain]) * 100 : 0;
        }

        const overallPercentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

        function getProficiency(score) {
            if (score >= 90) return 'Expert';
            if (score >= 80) return 'Advanced';
            if (score >= 70) return 'Intermediate';
            if (score >= 50) return 'Beginner';
            return 'Novice';
        }

        const proficiency = getProficiency(overallPercentage);

        // Find weakest domains
        const sortedDomains = Object.keys(domainPercentages).sort((a, b) => domainPercentages[a] - domainPercentages[b]);
        const weakestDomains = sortedDomains.slice(0, 2).filter(domain => domainPercentages[domain] < 70); // Show up to 2 weakest domains below Intermediate

        let resultsHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-2">Assessment Complete</h2>
                <p class="text-xl">Your Overall Score: <span class="font-bold">${overallPercentage.toFixed(1)}%</span></p>
                <p class="text-2xl font-bold text-blue-600">${proficiency}</p>
            </div>

            <div class="my-8">
                <h3 class="text-2xl font-bold mb-4">Domain Scores</h3>
        `;

        for (const domain in domainPercentages) {
            resultsHTML += `
                <div class="mb-4">
                    <div class="flex justify-between mb-1">
                        <span class="text-base font-medium">${domain}</span>
                        <span class="text-sm font-medium">${domainPercentages[domain].toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div class="bg-blue-500 h-4 rounded-full" style="width: ${domainPercentages[domain]}%"></div>
                    </div>
                </div>
            `;
        }

        resultsHTML += `</div>`;

        if (weakestDomains.length > 0) {
            resultsHTML += `
                <div class="my-8 p-4 bg-yellow-100 border-l-4 border-yellow-500">
                    <h3 class="text-xl font-bold mb-2">Areas for Improvement</h3>
            `;
            weakestDomains.forEach(domain => {
                resultsHTML += `<p class="mb-2"><strong>${domain}:</strong> ${allDomainFeedback[domain]}</p>`;
            });
            resultsHTML += `</div>`;
        }

        // Answer Review Section
        let answerReviewHTML = `
            <div class="my-8">
                <details>
                    <summary class="text-xl font-bold cursor-pointer hover:text-blue-600">Review Your Answers</summary>
                    <div class="mt-4 border-t pt-4">
        `;

        const combinedQuestions = [...allQuestions, ...learningQuestions];
        userAnswers.forEach((userAnswer, index) => {
            const question = combinedQuestions[index];
            const isCtiQuestion = 'domain' in question;
            const userAnswerIndex = userAnswer.answerIndex;

            answerReviewHTML += `
                <div class="mb-6 p-4 rounded-lg ${isCtiQuestion && userAnswerIndex !== question.answer ? 'bg-red-50' : 'bg-green-50'}">
                    <p class="font-bold">${index + 1}. ${question.question}</p>
                    <ul class="list-disc pl-5 mt-2">
            `;

            question.options.forEach((option, optionIndex) => {
                let indicator = '';
                if (optionIndex === userAnswerIndex) {
                    indicator = ` (Your answer)`;
                }
                if (isCtiQuestion && optionIndex === question.answer) {
                    indicator += ` (Correct answer)`;
                }

                let textColor = 'text-gray-800';
                if (isCtiQuestion) {
                    if (optionIndex === question.answer) {
                        textColor = 'text-green-700 font-bold';
                    }
                    if (optionIndex === userAnswerIndex && userAnswerIndex !== question.answer) {
                        textColor = 'text-red-700 font-bold';
                    }
                } else {
                     if (optionIndex === userAnswerIndex) {
                        textColor = 'text-blue-700 font-bold';
                    }
                }


                answerReviewHTML += `<li class="${textColor}">${option}${indicator}</li>`;
            });

            answerReviewHTML += `</ul></div>`;
        });
        
        answerReviewHTML += `</div></details></div>`;

        resultsHTML += answerReviewHTML;
        
        // --- Future Roadmap Section ---
        // Find preferred learning style and area of interest
        let preferredLearningStyle = null;
        let areaOfInterest = null;
        // Find the first learning style and first career goal question
        learningQuestions.forEach((q, i) => {
            if (q.type === 'Learning Style' && preferredLearningStyle === null) {
                const idx = userAnswers[allQuestions.length + i]?.answerIndex;
                if (typeof idx === 'number') preferredLearningStyle = q.options[idx];
            }
            if (q.type === 'Career Goals' && areaOfInterest === null) {
                const idx = userAnswers[allQuestions.length + i]?.answerIndex;
                if (typeof idx === 'number') areaOfInterest = q.options[idx];
            }
        });

        // Generic advice logic
        let advice = '';
        if (preferredLearningStyle && areaOfInterest) {
            if (preferredLearningStyle.includes('hands-on')) {
                advice = `Look for practical labs, sandbox exercises, and open-source tools related to <b>${areaOfInterest}</b>.`;
            } else if (preferredLearningStyle.includes('reading')) {
                advice = `Seek out books, whitepapers, and industry reports focused on <b>${areaOfInterest}</b>.`;
            } else if (preferredLearningStyle.includes('video')) {
                advice = `Find online video courses and recorded webinars about <b>${areaOfInterest}</b>.`;
            } else if (preferredLearningStyle.includes('instructor-led')) {
                advice = `Consider formal training programs and workshops in <b>${areaOfInterest}</b>.`;
            } else {
                advice = `Explore a variety of resources to deepen your expertise in <b>${areaOfInterest}</b>.`;
            }
        }

        if (preferredLearningStyle && areaOfInterest) {
            resultsHTML += `
                <div class="my-8 p-4 bg-blue-50 border-l-4 border-blue-400">
                    <h3 class="text-xl font-bold mb-2">Future Roadmap</h3>
                    <p><b>Preferred Learning Style:</b> ${preferredLearningStyle}</p>
                    <p><b>Area of Interest in CTI:</b> ${areaOfInterest}</p>
                    <p class="mt-2">${advice}</p>
                </div>
            `;
        }

        resultsHTML += `
            <div class="text-center mt-8">
                <button onclick="window.location.reload()" class="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
                    Retake Assessment
                </button>
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;
    }

    loadQuestions();
}); 