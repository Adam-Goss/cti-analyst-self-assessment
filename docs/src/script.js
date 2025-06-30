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
    let combinedQuestions = [];

    // Emoji map for domains
    const domainEmojis = {
        'Technical Foundations': '💻',
        'Threat Intelligence Fundamentals': '🕵️‍♂️',
        'Analytical Skills': '🧠',
        'Tools and Technologies': '🛠️',
        'Communication and Collaboration': '💬',
        'Industry Knowledge': '🌐',
        'Learning Style': '🎓',
        'Career Goals': '🧑‍💼'
    };

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadQuestions() {
        try {
            const res = await fetch('./data/questions.json');
            const data = await res.json();
            const allFetchedQuestions = data.questions;
            const domains = Object.keys(data.domains);

            // Shuffle all questions first
            shuffleArray(allFetchedQuestions);

            // For each domain, select up to 5 questions
            const selectedQuestions = [];
            for (const domain of domains) {
                const domainQuestions = allFetchedQuestions.filter(q => q.domain === domain);
                selectedQuestions.push(...domainQuestions.slice(0, 5));
            }

            // Final list of 30 questions (5 per domain)
            allQuestions = selectedQuestions;
            allDomainFeedback = data.domains;

            const learningRes = await fetch('./data/learning_style.json');
            const learningData = await learningRes.json();
            learningQuestions = learningData.questions;
            
            // Store combinedQuestions once
            combinedQuestions = [...allQuestions, ...learningQuestions];
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

    function setInnerHTMLIfChanged(element, html) {
        // Only update innerHTML if content is different
        if (element.innerHTML !== html) {
            element.innerHTML = html;
        }
    }

    function displayQuestion(direction = 'forward') {
        if (animating) return;
        animating = true;
        // Use precomputed combinedQuestions
        // Show info step before learning style questions
        if (!infoStepShown && currentQuestionIndex === allQuestions.length) {
            quizContainer.classList.add('opacity-0', direction === 'forward' ? 'translate-x-8' : '-translate-x-8');
            setTimeout(() => {
                const infoHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[200px] animate-fade-in">
                        <div class="text-blue-700 text-3xl mb-4">ℹ️</div>
                        <h2 class="text-xl font-bold mb-2">Learning Style & Areas of Interest</h2>
                        <p class="mb-6 text-gray-700 text-center">The following questions are about your learning style and areas of interest. <br>These are <b>not marked</b> and will not affect your score.</p>
                        <button id="continue-btn" class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">Continue</button>
                    </div>
                `;
                setInnerHTMLIfChanged(quizContainer, infoHTML);
                quizContainer.classList.remove('opacity-0', 'translate-x-8', '-translate-x-8');
                quizContainer.classList.add('opacity-100');
                setTimeout(() => { animating = false; }, 200);
                document.getElementById('continue-btn').focus();
                document.getElementById('continue-btn').addEventListener('click', () => {
                    infoStepShown = true;
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

        // Animation: fade/slide out
        quizContainer.classList.add('opacity-0', direction === 'forward' ? 'translate-x-8' : '-translate-x-8');
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

            // Domain badge
            let domain = question.domain || question.type;
            let emoji = domainEmojis[domain] || '❓';
            let domainBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 mb-4 shadow-sm">${emoji} ${domain}</span>`;

            let optionsHTML = '';
            question.options.forEach((option, index) => {
                const isSelected = reviewMode && reviewIndex === index;
                optionsHTML += `
                    <button 
                        class="block w-full text-left bg-white p-4 rounded-xl my-2 border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-blue-50 transition-all duration-150 text-lg font-medium ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100 font-bold' : ''}"
                        data-index="${index}"
                        tabindex="0"
                        aria-label="${option}"
                        ${isSelected ? 'aria-pressed="true"' : ''}
                    >
                        ${option}
                    </button>
                `;
            });

            const questionHTML = `
                <div>
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-sm text-gray-600">${progressText}</p>
                            <span class="text-xs text-gray-500">${currentQuestionIndex + 1}/${combinedQuestions.length}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    <div class="relative flex flex-col items-center">
                        ${domainBadge}
                        <h2 class="text-2xl font-bold mb-6 text-center">${question.question}</h2>
                        <div class="w-full" id="options-container">${optionsHTML}</div>
                        <div class="flex justify-between mt-8 w-full">
                            <button id="back-btn" class="${currentQuestionIndex === 0 ? 'invisible' : ''} bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" aria-label="Go to previous question">← Back</button>
                            <button id="next-btn" class="${reviewMode ? '' : 'hidden'} bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" aria-label="Go to next question">Next →</button>
                        </div>
                    </div>
                </div>
            `;
            setInnerHTMLIfChanged(quizContainer, questionHTML);
            quizContainer.classList.remove('opacity-0', 'translate-x-8', '-translate-x-8');
            quizContainer.classList.add('opacity-100');
            setTimeout(() => { animating = false; }, 200);

            // Event delegation for option buttons
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.onclick = (e) => {
                    const button = e.target.closest('[data-index]');
                    if (!button || animating) return;
                    const selectedIndex = parseInt(button.getAttribute('data-index'));
                    if (reviewMode) {
                        userAnswers[currentQuestionIndex].answerIndex = selectedIndex;
                        reviewIndex = selectedIndex;
                        displayQuestion();
                    } else {
                        handleAnswer(selectedIndex);
                    }
                };
                optionsContainer.onkeydown = (e) => {
                    const button = e.target.closest('[data-index]');
                    if (!button) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                };
            }

            // Back button
            const backBtn = document.getElementById('back-btn');
            if (backBtn && currentQuestionIndex > 0) {
                backBtn.onclick = () => {
                    if (animating) return;
                    currentQuestionIndex--;
                    displayQuestion('backward');
                };
            }

            // Next button
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && reviewMode) {
                nextBtn.onclick = () => {
                    if (animating) return;
                    currentQuestionIndex++;
                    displayQuestion('forward');
                };
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

        const proficiencyEmojis = {
            'Expert': '🏆',
            'Advanced': '🥇',
            'Intermediate': '🥈',
            'Beginner': '🥉',
            'Novice': '🔰'
        };

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
        const proficiencyEmoji = proficiencyEmojis[proficiency] || '🔰';

        // Find weakest domains
        const sortedDomains = Object.keys(domainPercentages).sort((a, b) => domainPercentages[a] - domainPercentages[b]);
        const weakestDomains = sortedDomains.slice(0, 2).filter(domain => domainPercentages[domain] < 70); // Show up to 2 weakest domains below Intermediate

        let resultsHTML = `
            <div class="animate-fade-in-slide max-w-xl mx-auto">
                <div class="text-center mb-8">
                    <div class="text-5xl mb-2">${proficiencyEmoji}</div>
                    <h2 class="text-3xl font-bold mb-2">Assessment Complete</h2>
                    <p class="text-xl">Your Overall Score: <span class="font-bold">${overallPercentage.toFixed(1)}%</span></p>
                    <p class="text-2xl font-bold text-blue-600 flex items-center justify-center gap-2">${proficiencyEmoji} ${proficiency}</p>
                </div>

                <div class="my-8">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">📊 Domain Scores</h3>
        `;

        for (const domain in domainPercentages) {
            resultsHTML += `
                <div class="mb-4">
                    <div class="flex justify-between mb-1 items-center">
                        <span class="text-base font-medium flex items-center gap-2">${domainEmojis[domain] || '❓'} ${domain}</span>
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
                <section class="my-10">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2 text-yellow-700">⚠️ Areas for Improvement</h3>
                    <div class="flex flex-col gap-4">
            `;
            weakestDomains.forEach(domain => {
                resultsHTML += `
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 flex items-start gap-4 shadow-sm">
                            <span class="text-2xl mt-1">${domainEmojis[domain] || '❓'}</span>
                            <div>
                                <div class="font-semibold text-lg text-yellow-800 mb-1">An area to work on: ${domain}</div>
                                <div class="text-yellow-900 text-base leading-relaxed">${allDomainFeedback[domain]}</div>
                            </div>
                        </div>
                `;
            });
            resultsHTML += `</div></section>`;
        }

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
            const areaOfInterestBold = `<b>${areaOfInterest}</b>`;
            let advicePoints = [];
            if (preferredLearningStyle.includes('hands-on')) {
                advicePoints = [
                    `Look for practical labs and sandbox exercises.`,
                    `Get familiar with open-source tools for ${areaOfInterestBold}.`,
                    `Try building small projects to apply your skills.`
                ];
            } else if (preferredLearningStyle.includes('reading')) {
                advicePoints = [
                    `Seek out books and whitepapers on ${areaOfInterestBold}.`,
                    `Follow blogs from security researchers and intelligence firms.`,
                    `Study industry reports and case studies.`
                ];
            } else if (preferredLearningStyle.includes('video')) {
                advicePoints = [
                    `Find online video courses and recorded webinars about ${areaOfInterestBold}.`,
                    `Watch walkthroughs on YouTube from security conferences.`,
                    `Follow creators who specialize in your area of interest.`
                ];
            } else if (preferredLearningStyle.includes('instructor-led')) {
                advicePoints = [
                    `Consider formal training programs and workshops in ${areaOfInterestBold}.`,
                    `Look for relevant certifications to guide your learning path.`,
                    `Join local or online study groups.`
                ];
            } else {
                advicePoints = [
                    `Explore a variety of resources to deepen your expertise in ${areaOfInterestBold}.`
                ];
            }
            advice = `<ul class="list-disc list-inside mt-2 text-blue-800 text-base leading-relaxed">${advicePoints.map(p => `<li>${p}</li>`).join('')}</ul>`;
        }

        if (preferredLearningStyle && areaOfInterest) {
            resultsHTML += `
                <section class="my-10">
                    <h3 class="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-700">🧭 Future Roadmap</h3>
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-md">
                        <div class="grid md:grid-cols-2 gap-6 items-start">
                            <!-- Left side: Your choices -->
                            <div class="flex flex-col gap-4">
                                <div>
                                    <div class="text-sm font-semibold text-blue-600 mb-1">YOUR PREFERRED LEARNING STYLE</div>
                                    <div class="text-base font-bold text-blue-900 flex items-center gap-2">
                                        <span>${domainEmojis['Learning Style']}</span>
                                        <span>${preferredLearningStyle}</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-blue-600 mb-1">YOUR AREA OF INTEREST</div>
                                    <div class="text-base font-bold text-blue-900 flex items-center gap-2">
                                        <span>${domainEmojis['Career Goals']}</span>
                                        <span>${areaOfInterest}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Right side: Advice -->
                            <div>
                                 <div class="text-sm font-semibold text-blue-600 mb-1">OUR SUGGESTIONS</div>
                                 ${advice}
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        // Answer Review Section
        let answerReviewHTML = `
            <section class="my-10">
                <details>
                    <summary class="text-xl font-bold cursor-pointer hover:text-[#C6372F]">📝 Review Your Answers</summary>
                    <div class="mt-4 border-t pt-4">
        `;

        userAnswers.forEach((userAnswer, index) => {
            const question = allQuestions[userAnswer.questionIndex];
            const isCtiQuestion = 'domain' in question;
            const userAnswerIndex = userAnswer.answerIndex;

            answerReviewHTML += `
                <div class="mb-6 p-4 rounded-lg ${isCtiQuestion && userAnswerIndex !== question.answer ? 'bg-red-50' : 'bg-green-50'}">
                    <p class="font-bold flex items-center gap-2">${isCtiQuestion ? (domainEmojis[question.domain] || '❓') : '❓'} ${index + 1}. ${question.question}</p>
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
        
        answerReviewHTML += `</div></details></section>`;

        resultsHTML += answerReviewHTML;

        // --- Recommended Services Section ---
        let recommendedServicesHTML = `
            <section class="my-10">
                <details>
                    <summary class="text-xl font-bold cursor-pointer hover:text-[#C6372F]">🚀 Next Steps: Recommended Services</summary>
                    <div class="mt-4 border-t pt-6">
                        <div class="flex items-start gap-4 mb-6">
                            <img src="./src/kraven-security-logo.jpg" alt="Kraven Security Logo" class="w-16 h-16 rounded-lg shadow-md">
                            <p class="flex-1 text-base text-gray-700">Based on your results, here are some professional services from <a href="https://kravensecurity.com/" target="_blank" class="text-[#C6372F] hover:underline font-semibold">Kraven Security</a> that can help you level up your CTI skills.</p>
                        </div>
                        <div class="space-y-4">
        `;
        
        // General recommendations
        recommendedServicesHTML += `
                            <div class="bg-gray-50 rounded-lg p-4 flex items-start gap-4">
                                <span class="text-2xl mt-1">🧑‍🏫</span>
                                <div>
                                    <h4 class="font-bold text-lg">One-on-One Coaching</h4>
                                    <p class="text-gray-800">For personalized guidance, one-on-one coaching can help you build a custom learning plan to address your specific areas for improvement.</p>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-4 flex items-start gap-4">
                                 <span class="text-2xl mt-1">💼</span>
                                <div>
                                    <h4 class="font-bold text-lg">Interview & Resume Assessment</h4>
                                    <p class="text-gray-800">Struggling with landing a role in CTI? This service can help you improve your resume and prepare for interviews.</p>
                                </div>
                            </div>
        `;

        // Dynamic recommendations based on weakest domains
        if(weakestDomains.includes('Analytical Skills')) {
            recommendedServicesHTML += `
                            <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4">
                                <span class="text-2xl mt-1">🎯</span>
                                <div>
                                    <h4 class="font-bold text-lg text-green-800">Recommended Course: Structured Analytical Techniques</h4>
                                    <p class="text-green-900">Since you're looking to improve your analytical skills, this course can help you sharpen your thinking and reduce bias in your analysis.</p>
                                </div>
                            </div>
            `;
        }
        if(weakestDomains.includes('Tools and Technologies')) {
             recommendedServicesHTML += `
                            <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4">
                                <span class="text-2xl mt-1">🎯</span>
                                <div>
                                    <h4 class="font-bold text-lg text-green-800">Recommended Courses: MISP & Python</h4>
                                    <p class="text-green-900">To improve with tools, check out courses like 'Threat Intelligence with MISP' or 'Python Threat Hunting Tools' to build hands-on technical skills.</p>
                                </div>
                            </div>
            `;
        }
        
        recommendedServicesHTML += `
                        </div>
                        <div class="text-center mt-6">
                            <a href="https://kravensecurity.com/" target="_blank" class="text-[#C6372F] hover:underline font-semibold">Explore all services and courses →</a>
                        </div>
                    </div>
                </details>
            </section>
        `;

        resultsHTML += recommendedServicesHTML;
        
        resultsHTML += `
            <div class="text-center mt-8">
                <button onclick="window.location.reload()" class="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-all">
                    Retake Assessment
                </button>
            </div>
        `;

        resultsContainer.innerHTML = `<div class="animate-fade-in-slide">${resultsHTML}</div>`;
    }

    loadQuestions();

    // Add animation styles
    const style = document.createElement('style');
    style.innerHTML = `
    @keyframes fade-in-slide {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-slide { animation: fade-in-slide 0.4s cubic-bezier(.4,0,.2,1); }
    .animate-fade-in { animation: fade-in-slide 0.4s cubic-bezier(.4,0,.2,1); }
    `;
    document.head.appendChild(style);
}); 