
import { model, auth, db } from "./firebase.js";
import { askHybridAI } from "./hybrid-ai.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";


// =====================================
// 1. SHARED APP ELEMENTS
// =====================================

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const authMessage = document.getElementById("auth-message");

let authLoadVersion = 0;


// =====================================
// 2. STUDY PLANNER - FIREBASE
// =====================================

const taskInput = document.getElementById("study-task");
const dateInput = document.getElementById("study-date");
const addTaskButton = document.getElementById("add-task");
const taskList = document.getElementById("task-list");

let studyTasks = [];

async function saveTasks() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const plannerRef = doc(
            db, "users", user.uid, "studyData", "planner"
        );

        await setDoc(plannerRef, {
            tasks: studyTasks,
            updatedAt: new Date()
        });

        console.log("Study tasks saved to Firebase!");

    } catch (error) {
        console.error("Firebase save error:", error);
    }
}

async function loadTasks(user, loadVersion) {
    try {
        const plannerRef = doc(
            db, "users", user.uid, "studyData", "planner"
        );

        const snapshot = await getDoc(plannerRef);

        if (
            loadVersion !== authLoadVersion ||
            auth.currentUser?.uid !== user.uid
        ) return;

        studyTasks = snapshot.exists()
            ? snapshot.data().tasks || []
            : [];

        displayTasks();

        console.log("Study tasks loaded from Firebase!");

    } catch (error) {
        console.error("Firebase load error:", error);
    }
}

function updateStudyProgress() {
    const completed = studyTasks.filter(
        task => task.completed
    ).length;

    const total = studyTasks.length;

    const percentage = total === 0
        ? 0
        : (completed / total) * 100;

    document.getElementById("progress-text").textContent =
        `${completed} of ${total} tasks completed`;

    document.getElementById("progress-fill").style.width =
        `${percentage}%`;
}

function displayTasks() {
    taskList.replaceChildren();

    studyTasks.forEach((task, index) => {
        const item = document.createElement("div");
        const checkbox = document.createElement("input");
        const text = document.createElement("span");
        const deleteButton = document.createElement("button");

        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        text.textContent = `${task.name} — ${task.date}`;

        checkbox.addEventListener("change", async () => {
            studyTasks[index].completed = checkbox.checked;

            await saveTasks();
            updateStudyProgress();
        });

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
            studyTasks.splice(index, 1);

            await saveTasks();
            displayTasks();
        });

        item.append(checkbox, text, deleteButton);
        taskList.appendChild(item);
    });

    updateStudyProgress();
}

addTaskButton.addEventListener("click", async () => {
    const name = taskInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
        alert("Please enter both a task and a date.");
        return;
    }

    if (!auth.currentUser) {
        alert("Please log in before saving study tasks.");
        return;
    }

    studyTasks.push({
        name,
        date,
        completed: false
    });

    await saveTasks();
    displayTasks();

    taskInput.value = "";
    dateInput.value = "";
});


// =====================================
// 3. SMART NOTES - FIREBASE
// =====================================

const notesButton = document.getElementById("generate-notes");
const studyMaterial = document.getElementById("study-material");
const notesResult = document.getElementById("notes-result");
const notesHistory = document.getElementById("notes-history");

let savedNotes = [];

function displayNotesHistory() {
    notesHistory.replaceChildren();

    savedNotes.forEach((note, index) => {
        const item = document.createElement("div");
        const heading = document.createElement("h3");
        const content = document.createElement("p");
        const deleteButton = document.createElement("button");

        heading.textContent = `Saved Note ${index + 1}`;
        content.textContent = note;
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
            savedNotes.splice(index, 1);

            await saveNotesToFirebase();
            displayNotesHistory();
        });

        item.append(heading, content, deleteButton);
        notesHistory.appendChild(item);
    });
}

async function saveNotesToFirebase() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const notesRef = doc(
            db, "users", user.uid, "studyData", "notes"
        );

        await setDoc(notesRef, {
            notes: savedNotes,
            updatedAt: new Date()
        });

        console.log("Notes saved to Firebase!");

    } catch (error) {
        console.error("Firebase notes save error:", error);
    }
}

async function loadNotesFromFirebase(user, loadVersion) {
    try {
        const notesRef = doc(
            db, "users", user.uid, "studyData", "notes"
        );

        const snapshot = await getDoc(notesRef);

        if (
            loadVersion !== authLoadVersion ||
            auth.currentUser?.uid !== user.uid
        ) return;

        savedNotes = snapshot.exists()
            ? snapshot.data().notes || []
            : [];

        displayNotesHistory();

        console.log("Notes loaded from Firebase!");

    } catch (error) {
        console.error("Firebase notes load error:", error);
    }
}

notesButton.addEventListener("click", async () => {
    const material = studyMaterial.value.trim();

    if (!material) {
        notesResult.textContent =
            "Please enter your study material.";
        return;
    }

    notesButton.disabled = true;
    notesButton.textContent = "Creating Notes...";
    notesResult.textContent = "Generating your notes...";

    try {
        const result = await askHybridAI(`
            Convert this study material into simple, organized notes.
            Include:
            1. Short summary
            2. Important concepts
            3. Key points
            4. Simple examples

            Study material: ${material}
        `);

        const notes = result.answer;

        notesResult.textContent = notes;

        if (auth.currentUser) {
            savedNotes.unshift(notes);

            await saveNotesToFirebase();
            displayNotesHistory();
        }

        const sourceBox = document.getElementById("notes-source");

        if (sourceBox) {
            sourceBox.textContent =
                `AI source: ${result.source || "Unknown"}`;
        }

    } catch (error) {
        console.error("Smart Notes Error:", error);

        notesResult.textContent =
            "Unable to generate notes. Please try again.";

    } finally {
        notesButton.disabled = false;
        notesButton.textContent = "Generate Smart Notes";
    }
});


// =====================================
// 4. AI TUTOR - FIREBASE HISTORY
// =====================================

const tutorForm = document.getElementById("tutor-form");
const questionInput = document.getElementById("question");
const responseBox = document.getElementById("ai-response");
const askButton = document.getElementById("ask-button");
const historyBox = document.getElementById("tutor-history");

let tutorHistory = [];

function displayTutorHistory() {
    historyBox.replaceChildren();

    tutorHistory.forEach((item, index) => {
        const entry = document.createElement("div");
        const question = document.createElement("h3");
        const answer = document.createElement("p");

        question.textContent = `${index + 1}. ${item.question}`;
        answer.textContent = item.answer;

        entry.append(question, answer);
        historyBox.appendChild(entry);
    });
}

async function saveTutorHistory(user) {
    if (!user || auth.currentUser?.uid !== user.uid) {
        return;
    }

    try {
        const tutorRef = doc(
            db, "users", user.uid, "studyData", "tutorHistory"
        );

        await setDoc(tutorRef, {
            history: tutorHistory,
            updatedAt: new Date()
        });

        console.log("AI Tutor history saved to Firebase!");

    } catch (error) {
        console.error("AI Tutor Firebase save error:", error);
    }
}

async function loadTutorHistory(user, loadVersion) {
    try {
        const tutorRef = doc(
            db, "users", user.uid, "studyData", "tutorHistory"
        );

        const snapshot = await getDoc(tutorRef);

        if (
            loadVersion !== authLoadVersion ||
            auth.currentUser?.uid !== user.uid
        ) return;

        tutorHistory = snapshot.exists()
            ? snapshot.data().history || []
            : [];

        displayTutorHistory();

        console.log("AI Tutor history loaded from Firebase!");

    } catch (error) {
        console.error("AI Tutor Firebase load error:", error);
    }
}

tutorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question) return;

    const user = auth.currentUser;

    if (!user) {
        responseBox.textContent =
            "Please log in to use AI Tutor and save your history.";
        return;
    }

    askButton.disabled = true;
    askButton.textContent = "Thinking...";
    responseBox.textContent = "Generating your explanation...";

    try {
        const result = await askHybridAI(`
            You are StudyBuddy AI, a friendly academic tutor.
            Explain this question in simple language with examples:
            ${question}
        `);

        const answer = result.answer;

        if (auth.currentUser?.uid !== user.uid) {
            responseBox.textContent =
                "Your account changed. Please ask the question again.";
            return;
        }

        responseBox.textContent = answer;

        tutorHistory.unshift({
            question,
            answer
        });

        await saveTutorHistory(user);

        if (auth.currentUser?.uid === user.uid) {
            displayTutorHistory();
        }

        const sourceBox = document.getElementById("ai-source");

        if (sourceBox) {
            sourceBox.textContent =
                `AI source: ${result.source || "Unknown"}`;
        }

        questionInput.value = "";

    } catch (error) {
        console.error("AI Tutor Error:", error);

        responseBox.textContent =
            "Sorry, something went wrong. Please try again.";

    } finally {
        askButton.disabled = false;
        askButton.textContent = "Ask AI Tutor";
    }
});


// =====================================
// 5. QUIZ HISTORY - FIREBASE
// =====================================

const quizHistory = document.getElementById("quiz-history");

let savedQuizzes = [];

function displayQuizHistory() {
    quizHistory.replaceChildren();

    savedQuizzes.forEach((quiz, index) => {
        const item = document.createElement("div");
        const heading = document.createElement("h3");
        const details = document.createElement("p");

        heading.textContent = `Quiz ${index + 1}`;

        details.textContent =
            `${quiz.material} — ${quiz.date} — ${quiz.questions.length} questions`;

        item.append(heading, details);
        quizHistory.appendChild(item);
    });
}

async function saveQuizHistory(user) {
    if (!user || auth.currentUser?.uid !== user.uid) {
        return;
    }

    try {
        const quizRef = doc(
            db, "users", user.uid, "studyData", "quizHistory"
        );

        const historyToSave = [...savedQuizzes];

        await setDoc(quizRef, {
            quizzes: historyToSave,
            updatedAt: new Date()
        });

        console.log("Quiz history saved to Firebase!");

    } catch (error) {
        console.error("Quiz history save error:", error);
        throw error;
    }
}

async function loadQuizHistory(user, loadVersion) {
    try {
        const quizRef = doc(
            db, "users", user.uid, "studyData", "quizHistory"
        );

        const snapshot = await getDoc(quizRef);

        if (
            loadVersion !== authLoadVersion ||
            auth.currentUser?.uid !== user.uid
        ) return;

        savedQuizzes = snapshot.exists()
            ? snapshot.data().quizzes || []
            : [];

        displayQuizHistory();

        console.log("Quiz history loaded from Firebase!");

    } catch (error) {
        console.error("Quiz history load error:", error);
    }
}


// =====================================
// 6. QUIZ GENERATOR
// =====================================

const quizButton = document.getElementById("generate-quiz");
const quizMaterial = document.getElementById("quiz-material");
const quizResult = document.getElementById("quiz-result");

quizButton.addEventListener("click", async () => {
    const material = quizMaterial.value.trim();

    if (!material) {
        quizResult.textContent =
            "Please enter your study material.";
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        quizResult.textContent =
            "Please log in before generating and saving quizzes.";
        return;
    }

    quizButton.disabled = true;
    quizButton.textContent = "Generating...";
    quizResult.textContent = "Preparing your quiz...";

    try {
        const result = await model.generateContent(`
            Create exactly 5 multiple-choice questions from:
            ${material}

            Return ONLY valid JSON in this format:
            {
                "questions": [
                    {
                        "question": "Question text",
                        "options": [
                            "Option A",
                            "Option B",
                            "Option C",
                            "Option D"
                        ],
                        "answer": 0,
                        "explanation": "Short explanation"
                    }
                ]
            }

            The answer must be the correct option index (0 to 3).
        `);

        const text = result.response.text()
            .replace(/```json|```/g, "").trim();

        const quiz = JSON.parse(text);

        if (
            !Array.isArray(quiz.questions) ||
            quiz.questions.length !== 5 ||
            quiz.questions.some(q =>
                typeof q.question !== "string" ||
                !Array.isArray(q.options) ||
                q.options.length !== 4 ||
                !Number.isInteger(q.answer) ||
                q.answer < 0 ||
                q.answer > 3
            )
        ) {
            throw new Error("Invalid quiz format");
        }

        // Prevent saving to the wrong account.
        if (auth.currentUser?.uid !== user.uid) {
            quizResult.textContent =
                "Your account changed. Please generate the quiz again.";
            return;
        }

        const newQuiz = {
            material,
            questions: quiz.questions,
            date: new Date().toLocaleDateString()
        };

        savedQuizzes.unshift(newQuiz);

        await saveQuizHistory(user);

        if (auth.currentUser?.uid !== user.uid) {
            quizResult.textContent =
                "Your account changed. Please check your quiz history after logging in again.";
            return;
        }

        displayQuizHistory();

        // Display quiz questions.

        quizResult.replaceChildren();

        const form = document.createElement("form");

        quiz.questions.forEach((q, index) => {
            const section = document.createElement("div");
            const heading = document.createElement("h3");

            heading.textContent = `${index + 1}. ${q.question}`;
            section.appendChild(heading);

            q.options.forEach((option, optionIndex) => {
                const label = document.createElement("label");
                const radio = document.createElement("input");

                radio.type = "radio";
                radio.name = `question-${index}`;
                radio.value = optionIndex;
                radio.required = true;

                label.appendChild(radio);
                label.appendChild(
                    document.createTextNode(" " + option)
                );

                section.appendChild(label);
                section.appendChild(document.createElement("br"));
            });

            form.appendChild(section);
        });

        const submit = document.createElement("button");
        submit.type = "submit";
        submit.textContent = "Submit Quiz";
        form.appendChild(submit);

        const scoreBox = document.createElement("p");

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            let score = 0;

            quiz.questions.forEach((q, index) => {
                const selected = form.querySelector(
                    `input[name="question-${index}"]:checked`
                );

                if (
                    selected &&
                    Number(selected.value) === q.answer
                ) {
                    score++;
                }
            });

            scoreBox.textContent =
                `Your Score: ${score} / ${quiz.questions.length}`;
        });

        quizResult.appendChild(form);
        quizResult.appendChild(scoreBox);

    } catch (error) {
        console.error("Quiz Error:", error);

        quizResult.textContent =
            "Quiz generation or saving failed. Please try again.";

    } finally {
        quizButton.disabled = false;
        quizButton.textContent = "Generate Quiz";
    }
});


// =====================================
// 7. FLASHCARDS - FIREBASE
// =====================================

const flashQuestion = document.getElementById("flash-question");
const flashAnswer = document.getElementById("flash-answer");
const addFlashcard = document.getElementById("add-flashcard");
const flashcardList = document.getElementById("flashcard-list");

let flashcards = [];

async function saveFlashcards() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const flashcardsRef = doc(
            db, "users", user.uid, "studyData", "flashcards"
        );

        await setDoc(flashcardsRef, {
            flashcards,
            updatedAt: new Date()
        });

        console.log("Flashcards saved to Firebase!");

    } catch (error) {
        console.error("Firebase flashcards save error:", error);
    }
}

async function loadFlashcardsFromFirebase(user, loadVersion) {
    try {
        const flashcardsRef = doc(
            db, "users", user.uid, "studyData", "flashcards"
        );

        const snapshot = await getDoc(flashcardsRef);

        if (
            loadVersion !== authLoadVersion ||
            auth.currentUser?.uid !== user.uid
        ) return;

        flashcards = snapshot.exists()
            ? snapshot.data().flashcards || []
            : [];

        displayFlashcards();

        console.log("Flashcards loaded from Firebase!");

    } catch (error) {
        console.error("Firebase flashcards load error:", error);
    }
}

function displayFlashcards() {
    flashcardList.replaceChildren();

    flashcards.forEach((flashcard, index) => {
        const card = document.createElement("div");
        const question = document.createElement("h3");
        const answer = document.createElement("p");
        const showButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        question.textContent = flashcard.question;
        answer.textContent = flashcard.answer;
        answer.hidden = true;

        showButton.textContent = "Show Answer";
        deleteButton.textContent = "Delete";

        showButton.addEventListener("click", () => {
            answer.hidden = !answer.hidden;

            showButton.textContent = answer.hidden
                ? "Show Answer"
                : "Hide Answer";
        });

        deleteButton.addEventListener("click", async () => {
            flashcards.splice(index, 1);

            await saveFlashcards();
            displayFlashcards();
        });

        card.append(question, answer, showButton, deleteButton);
        flashcardList.appendChild(card);
    });
}

addFlashcard.addEventListener("click", async () => {
    const question = flashQuestion.value.trim();
    const answer = flashAnswer.value.trim();

    if (!question || !answer) {
        alert("Please enter both question and answer.");
        return;
    }

    if (!auth.currentUser) {
        alert("Please log in before saving flashcards.");
        return;
    }

    flashcards.push({ question, answer });

    await saveFlashcards();
    displayFlashcards();

    flashQuestion.value = "";
    flashAnswer.value = "";
});


// =====================================
// 8. ACCOUNT DATA RESET
// =====================================

function clearAccountData() {
    studyTasks = [];
    savedNotes = [];
    flashcards = [];
    tutorHistory = [];
    savedQuizzes = [];

    displayTasks();
    displayNotesHistory();
    displayFlashcards();
    displayTutorHistory();
    displayQuizHistory();

    notesResult.textContent = "";
    responseBox.textContent = "";
}


// =====================================
// 9. INITIALIZATION AND ACCOUNT LOADING
// =====================================

displayTasks();
displayNotesHistory();
displayFlashcards();
displayTutorHistory();
displayQuizHistory();

onAuthStateChanged(auth, async (user) => {
    const loadVersion = ++authLoadVersion;

    clearAccountData();

    logoutButton.hidden = !user;

    if (user) {
        authMessage.textContent = "Loading your account data...";

        await loadTasks(user, loadVersion);

        if (loadVersion !== authLoadVersion) return;

        await loadNotesFromFirebase(user, loadVersion);

        if (loadVersion !== authLoadVersion) return;

        await loadFlashcardsFromFirebase(user, loadVersion);

        if (loadVersion !== authLoadVersion) return;

        await loadTutorHistory(user, loadVersion);

        if (loadVersion !== authLoadVersion) return;

        await loadQuizHistory(user, loadVersion);

        if (loadVersion !== authLoadVersion) return;

        authMessage.textContent = "Logged in successfully!";

    } else {
        authMessage.textContent =
            "Please log in to access your account data.";
    }
});


// =====================================
// 10. FIREBASE AUTHENTICATION EVENTS
// =====================================

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    try {
        await createUserWithEmailAndPassword(
            auth, email, password
        );

        authMessage.textContent =
            "Account created successfully!";

    } catch (error) {
        console.error("Signup Error:", error);
        authMessage.textContent = error.message;
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        await signInWithEmailAndPassword(
            auth, email, password
        );

        authMessage.textContent = "Login successful!";

    } catch (error) {
        console.error("Login Error:", error);
        authMessage.textContent = error.message;
    }
});

logoutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);

        authMessage.textContent =
            "Logged out successfully!";

    } catch (error) {
        console.error("Logout Error:", error);
        authMessage.textContent = error.message;
    }
});
