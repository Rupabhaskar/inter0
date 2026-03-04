"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";
import ProtectedRoute from "@/components/ProtectedRoute";

/* ================= CLOUDINARY IMAGE COMPONENT (next/image optimized) ================= */
function CloudinaryImage({ src, alt, type = "question", priority = false }) {
  const [error, setError] = useState(false);
  const width = type === "option" ? 300 : 500;
  const height = type === "option" ? 200 : 300;
  const optimizedSrc = useMemo(() => {
    if (src?.includes("cloudinary.com"))
      return src.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    return src;
  }, [src, width]);

  if (!src || error) return null;

  const isCloudinary = src.includes("cloudinary.com");
  const sizeClasses =
    type === "option"
      ? "max-w-[200px] max-h-[120px]"
      : "max-w-[400px] max-h-[250px]";

  if (isCloudinary) {
    return (
      <div className={`relative inline-block ${sizeClasses}`}>
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`rounded border object-contain w-auto h-auto ${sizeClasses}`}
          priority={priority}
          unoptimized={false}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${sizeClasses}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic/error state image */}
      <img
        src={src}
        alt={alt}
        className={`rounded border object-contain w-auto h-auto ${sizeClasses}`}
        loading={priority ? "eager" : "lazy"}
        onError={() => setError(true)}
      />
    </div>
  );
}

/* ================= INSTRUCTION TRANSLATIONS (English, Hindi, Telugu) ================= */
const INSTRUCTION_TRANSLATIONS = {
  en: {
    viewIn: "View In:",
    pleaseRead: "Please read the following instructions carefully",
    generalInstructions: "General Instructions:",
    durationLine: (mins) => `Total of ${mins} minutes duration will be given to attempt all the questions.`,
    timerLine: "The countdown timer is displayed at the top right corner. The exam will end automatically when the time runs out.",
    questionPalette: "Question Palette:",
    notVisited: "You have not visited the question yet.",
    answered: "You have answered the question.",
    notAnswered: "You have not answered the question.",
    markedNotAnswered: "You have NOT answered the question but have marked the question for review.",
    markedAnswered: "You have answered the question but marked it for review.",
    markedNote: "Note:",
    markedReminder: "Marked for Review is a reminder.",
    markedWarning: "If an answer is selected for a question that is Marked for Review, the answer will be considered in the final evaluation.",
    navigatingTo: "Navigating to a question :",
    nav1: "Click on a question number in the palette to go to that question (this does not save your answer).",
    nav2: "Click Save and Next to save your answer and move to the next question.",
    nav3: "Click Mark for Review and Next to save your answer (if any), mark the question for review, and move to the next question.",
    nav4: "You can view the entire paper using the Question Paper / palette.",
    answering: "Answering questions :",
    ans1: "To select an answer, click on the option button.",
    ans2: "To change an answer, click another option button.",
    ans3: "To save your answer you must click Save & Next or move to another question.",
    next: "Next >>",
    photo: "Photo",
    otherWarnings: "Other Important Instructions / Warnings",
    warn1: "The Question paper displayed is for practice purposes only. Under no circumstances should this be presumed as a main paper.",
    warn2: "This site has been optimized for the latest version of Google Chrome. Other browsers may not work properly.",
    warn3: "While writing the exam, do not move the mouse outside of the window. If you do, a countdown may appear. If you fail to click within the time, your exam may be submitted automatically.",
    warn4: "While writing the exam, if you close the exam window intentionally, your exam will be submitted without any further confirmation.",
    notice: "NOTICE",
    noticeText: "If the system is left idle for 5 minutes while attempting the exam, it will be submitted automatically.",
    previous: "<< Previous",
    checkboxText: "I have read and understood the instructions. All computer hardware allotted to me is in proper working condition. I agree that in case of not adhering to the instructions, I will be disqualified from giving the exam.",
    readyToBegin: "I am ready to begin",
  },
  hi: {
    viewIn: "भाषा देखें:",
    pleaseRead: "कृपया निम्नलिखित निर्देशों को ध्यान से पढ़ें",
    generalInstructions: "सामान्य निर्देश:",
    durationLine: (mins) => `सभी प्रश्नों के लिए कुल ${mins} मिनट का समय दिया जाएगा।`,
    timerLine: "उलटी गिनती टाइमर ऊपर दाएं कोने में दिखाया जाता है। समय समाप्त होने पर परीक्षा स्वचालित रूप से समाप्त हो जाएगी।",
    questionPalette: "प्रश्न पैलेट:",
    notVisited: "आपने अभी तक इस प्रश्न पर जाए नहीं है।",
    answered: "आपने इस प्रश्न का उत्तर दे दिया है।",
    notAnswered: "आपने इस प्रश्न का उत्तर नहीं दिया है।",
    markedNotAnswered: "आपने प्रश्न का उत्तर नहीं दिया है लेकिन समीक्षा के लिए चिह्नित किया है।",
    markedAnswered: "आपने प्रश्न का उत्तर दिया है और समीक्षा के लिए चिह्नित किया है।",
    markedNote: "नोट:",
    markedReminder: "समीक्षा के लिए चिह्नित एक अनुस्मारक है।",
    markedWarning: "यदि समीक्षा के लिए चिह्नित प्रश्न के लिए कोई उत्तर चुना जाता है, तो उस उत्तर को अंतिम मूल्यांकन में माना जाएगा।",
    navigatingTo: "प्रश्न पर जाना :",
    nav1: "उस प्रश्न पर जाने के लिए पैलेट में प्रश्न संख्या पर क्लिक करें (यह आपका उत्तर सहेजता नहीं है)।",
    nav2: "अपना उत्तर सहेजने और अगले प्रश्न पर जाने के लिए सहेजें और अगला पर क्लिक करें।",
    nav3: "उत्तर सहेजने, समीक्षा के लिए चिह्नित करने और अगले पर जाने के लिए समीक्षा के लिए चिह्नित करें और अगला पर क्लिक करें।",
    nav4: "आप प्रश्न पत्र / पैलेट का उपयोग करके पूरा पेपर देख सकते हैं।",
    answering: "प्रश्नों का उत्तर देना :",
    ans1: "उत्तर चुनने के लिए विकल्प बटन पर क्लिक करें।",
    ans2: "उत्तर बदलने के लिए दूसरे विकल्प बटन पर क्लिक करें।",
    ans3: "अपना उत्तर सहेजने के लिए आपको सहेजें और अगला पर क्लिक करना होगा या किसी अन्य प्रश्न पर जाना होगा।",
    next: "अगला >>",
    photo: "फोटो",
    otherWarnings: "अन्य महत्वपूर्ण निर्देश / चेतावनियाँ",
    warn1: "दिखाया गया प्रश्न पत्र केवल अभ्यास के उद्देश्य के लिए है। किसी भी परिस्थिति में इसे मुख्य पेपर नहीं माना जाना चाहिए।",
    warn2: "यह साइट Google Chrome के नवीनतम संस्करण के लिए अनुकूलित है। अन्य ब्राउज़र ठीक से काम नहीं कर सकते।",
    warn3: "परीक्षा लिखते समय माउस को विंडो से बाहर न ले जाएं। ऐसा करने पर उलटी गिनती दिख सकती है। समय के भीतर क्लिक न करने पर आपकी परीक्षा स्वचालित रूप से जमा हो सकती है।",
    warn4: "परीक्षा लिखते समय यदि आप जानबूझकर परीक्षा विंडो बंद करते हैं, तो आपकी परीक्षा बिना किसी और पुष्टि के जमा हो जाएगी।",
    notice: "सूचना",
    noticeText: "यदि परीक्षा देते समय सिस्टम 5 मिनट के लिए निष्क्रिय रहता है, तो यह स्वचालित रूप से जमा हो जाएगा।",
    previous: "<< पिछला",
    checkboxText: "मैंने निर्देश पढ़ और समझ लिए हैं। मुझे आवंटित सभी कंप्यूटर हार्डवेयर ठीक से काम कर रहे हैं। मैं सहमत हूं कि निर्देशों का पालन न करने की स्थिति में मुझे परीक्षा देने से अयोग्य ठहराया जाएगा।",
    readyToBegin: "मैं शुरू करने के लिए तैयार हूं",
  },
  te: {
    viewIn: "భాషలో వీక్షించండి:",
    pleaseRead: "దయచేసి క్రింది సూచనలను జాగ్రత్తగా చదవండి",
    generalInstructions: "సాధారణ సూచనలు:",
    durationLine: (mins) => `అన్ని ప్రశ్నలకు ప్రయత్నించడానికి మొత్తం ${mins} నిమిషాల సమయం ఇవ్వబడుతుంది.`,
    timerLine: "కౌంట్డౌన్ టైమర్ ఎగువ కుడి మూలలో ప్రదర్శించబడుతుంది. సమయం ముగిసినప్పుడు పరీక్ష స్వయంచాలకంగా ముగుస్తుంది.",
    questionPalette: "ప్రశ్న ప్యాలెట్:",
    notVisited: "మీరు ఇంకా ఈ ప్రశ్నను సందర్శించలేదు.",
    answered: "మీరు ఈ ప్రశ్నకు సమాధానం ఇచ్చారు.",
    notAnswered: "మీరు ఈ ప్రశ్నకు సమాధానం ఇవ్వలేదు.",
    markedNotAnswered: "మీరు ప్రశ్నకు సమాధానం ఇవ్వలేదు కానీ సమీక్ష కోసం గుర్తించారు.",
    markedAnswered: "మీరు ప్రశ్నకు సమాధానం ఇచ్చారు మరియు సమీక్ష కోసం గుర్తించారు.",
    markedNote: "గమనిక:",
    markedReminder: "సమీక్ష కోసం గుర్తించబడింది ఒక రిమైండర్.",
    markedWarning: "సమీక్ష కోసం గుర్తించబడిన ప్రశ్నకు సమాధానం ఎంచుకుంటే, ఆ సమాధానం చివరి మూల్యాంకనంలో పరిగణించబడుతుంది.",
    navigatingTo: "ప్రశ్నకు నావిగేట్ చేయడం :",
    nav1: "ఆ ప్రశ్నకు వెళ్లడానికి ప్యాలెట్లో ప్రశ్న నంబర్పై క్లిక్ చేయండి (ఇది మీ సమాధానాన్ని సేవ్ చేయదు).",
    nav2: "మీ సమాధానాన్ని సేవ్ చేయడానికి మరియు తర్వాతి ప్రశ్నకు వెళ్లడానికి సేవ్ అండ్ నెక్స్ట్ పై క్లిక్ చేయండి.",
    nav3: "సమాధానం సేవ్ చేయడానికి, సమీక్ష కోసం గుర్తించడానికి మరియు తర్వాతి ప్రశ్నకు వెళ్లడానికి మార్క్ ఫర్ రివ్యూ అండ్ నెక్స్ట్ పై క్లిక్ చేయండి.",
    nav4: "ప్రశ్న పేపర్ / ప్యాలెట్ ఉపయోగించి మీరు మొత్తం పేపర్ను వీక్షించవచ్చు.",
    answering: "ప్రశ్నలకు సమాధానం ఇవ్వడం :",
    ans1: "సమాధానం ఎంచుకోవడానికి ఐచ్ఛిక బటన్పై క్లిక్ చేయండి.",
    ans2: "సమాధానం మార్చడానికి మరొక ఐచ్ఛిక బటన్పై క్లిక్ చేయండి.",
    ans3: "మీ సమాధానాన్ని సేవ్ చేయడానికి మీరు సేవ్ అండ్ నెక్స్ట్ పై క్లిక్ చేయాలి లేదా మరొక ప్రశ్నకు వెళ్లాలి.",
    next: "తర్వాత >>",
    photo: "ఫోటో",
    otherWarnings: "ఇతర ముఖ్యమైన సూచనలు / హెచ్చరికలు",
    warn1: "ప్రదర్శించిన ప్రశ్న పేపర్ అభ్యాస ప్రయోజనాల కోసం మాత్రమే. ఏ పరిస్థితిలోనూ ఇది ప్రధాన పేపర్గా భావించబడకూడదు.",
    warn2: "ఈ సైట్ Google Chrome యొక్క తాజా వెర్షన్ కోసం ఆప్టిమైజ్ చేయబడింది. ఇతర బ్రౌజర్లు సరిగా పనిచేయకపోవచ్చు.",
    warn3: "పరీక్ష రాసేటప్పుడు మౌస్ను విండో బయటకు తరలించవద్దు. అలా చేస్తే కౌంట్డౌన్ కనిపించవచ్చు. సమయంలో క్లిక్ చేయకపోతే మీ పరీక్ష స్వయంచాలకంగా సమర్పించబడవచ్చు.",
    warn4: "పరీక్ష రాసేటప్పుడు మీరు ఉద్దేశపూర్వకంగా పరీక్ష విండోను మూసివేస్తే, మీ పరీక్ష మరింత నిర్ధారణ లేకుండా సమర్పించబడుతుంది.",
    notice: "నోటీసు",
    noticeText: "పరీక్ష ప్రయత్నిస్తున్నప్పుడు సిస్టమ్ 5 నిమిషాలు నిష్క్రియంగా ఉంటే, అది స్వయంచాలకంగా సమర్పించబడుతుంది.",
    previous: "<< మునుపటి",
    checkboxText: "నేను సూచనలను చదివాను మరియు అర్థం చేసుకున్నాను. నాకు కేటాయించిన అన్ని కంప్యూటర్ హార్డ్వేర్ సరిగా పనిచేస్తున్నాయి. సూచనలను పాటించనట్లయితే నన్ను పరీక్ష నివ్వడం నుండి అనర్హుడిగా ప్రకటిస్తానని అంగీకరిస్తాను.",
    readyToBegin: "నేను ప్రారంభించడానికి సిద్ధంగా ఉన్నాను",
  },
};

export default function CollegeTestPage() {
  const { testId } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(""); // Filter by subject
  const [markedForReview, setMarkedForReview] = useState(new Set()); // Questions marked for review
  const [visited, setVisited] = useState(new Set()); // Questions that have been visited
  const [collegeCode, setCollegeCode] = useState(null); // For saving result under results/{collegeCode}
  const [studentName, setStudentName] = useState(""); // From student doc (students/{collegeCode}/ids)
  const [studentClass, setStudentClass] = useState(""); // course/class from student doc
  const [instructionsStep, setInstructionsStep] = useState(0); // 0 = page 1, 1 = page 2, 2 = fullscreen gate
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);
  const [instructionLang, setInstructionLang] = useState("en"); // "en" | "hi" | "te"
  const [collegeLogoUrl, setCollegeLogoUrl] = useState(null);
  const [collegeName, setCollegeName] = useState(null);

  /* ================= LOAD TEST (API with Firestore fallback when Question DB not configured) ================= */
  /* Wait for auth on refresh so we show Loading then Start button instead of blank */
  useEffect(() => {
    if (!testId) {
      setLoading(false);
      router.push("/select-test/college");
      return;
    }

    const applyTestData = (questionsData, testData, collegeCodeVal, name, cls) => {
      setTest(testData);
      setQuestions(questionsData);
      setCollegeCode(collegeCodeVal ?? null);
      setStudentName(name ?? "");
      setStudentClass(cls ?? "");
      if (questionsData.length > 0) {
        const firstQ = questionsData[0];
        const imagesToPreload = [];
        if (firstQ.imageUrl) imagesToPreload.push(firstQ.imageUrl);
        if (firstQ.optionImages) {
          firstQ.optionImages.forEach((img) => {
            if (img) imagesToPreload.push(img);
          });
        }
        imagesToPreload.forEach((src) => {
          if (src?.includes("cloudinary.com")) {
            const optimized = src.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
            const img = new window.Image();
            img.src = optimized;
          }
        });
      }
      const questionsWithImages = questionsData.filter(
        (q) => q.imageUrl || (q.optionImages && q.optionImages.some((img) => img))
      );
      if (questionsWithImages.length > 0) {
        fetch("/college/api/image-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: questionsWithImages }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) console.log(`Cache: ${d.cacheHits} hits, ${d.stored} stored`);
          })
          .catch((e) => console.error("Image cache error:", e));
      }
    };

    const loadFromFirestore = async (uid) => {
      if (!uid) return;
      const idsGroup = collectionGroup(db, "ids");
      const studentSnap = await getDocs(query(idsGroup, where("uid", "==", uid), limit(1)));
      if (studentSnap.empty) return;
      const studentDoc = studentSnap.docs[0];
      const studentData = studentDoc.data();
      const collegeCodeVal =
        (studentData.college != null && String(studentData.college).trim() !== "")
          ? String(studentData.college).trim()
          : studentDoc.ref.parent.parent.id;
      const [testSnap, qSnap] = await Promise.all([
        getDoc(doc(questionDb, collegeCodeVal, testId)),
        getDocs(collection(questionDb, collegeCodeVal, testId, "questions")),
      ]);
      if (!testSnap.exists()) return;
      const questionsData = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const name = studentData.name != null ? String(studentData.name).trim() : "";
      const cls =
        (studentData.course != null && String(studentData.course).trim() !== "")
          ? String(studentData.course).trim()
          : (studentData.class != null ? String(studentData.class).trim() : "");
      applyTestData(questionsData, testSnap.data(), collegeCodeVal, name, cls);
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setLoading(false);
        router.push("/select-test/college");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/college/api/questions?testId=${encodeURIComponent(testId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.test || !data.questions) {
            setTest(null);
            setQuestions([]);
            setLoading(false);
            return;
          }
          applyTestData(
            data.questions,
            data.test,
            data.collegeCode,
            data.studentName,
            data.studentClass
          );
          return;
        }
        const err = await res.json().catch(() => ({}));
        if (res.status === 503 && (err.error || "").toLowerCase().includes("question db")) {
          try {
            await loadFromFirestore(user.uid);
          } catch (e) {
            console.error(e);
            setTest(null);
            setQuestions([]);
          }
          return;
        }
        throw new Error(err.error || `API ${res.status}`);
      } catch (err) {
        console.error(err);
        setTest(null);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [testId, router]);

  /* ================= FETCH COLLEGE LOGO + NAME ================= */
  useEffect(() => {
    const code = collegeCode != null && String(collegeCode).trim() !== "" ? String(collegeCode).trim() : null;
    if (!code) {
      setCollegeLogoUrl(null);
      setCollegeName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "collegeAdmin"),
          where("collegeShort", "==", code),
          limit(1)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (!snap.empty) {
          const d = snap.docs[0].data();
          setCollegeLogoUrl(d.logoUrl || null);
          setCollegeName(d.collegeName || d.name || d.email || code);
        } else {
          setCollegeLogoUrl(null);
          setCollegeName(code);
        }
      } catch {
        if (!cancelled) {
          setCollegeLogoUrl(null);
          setCollegeName(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [collegeCode]);

  /* ================= TIMER ================= */
  useEffect(() => {
    // Don't run timer if paused, not started, submitted, or time is up
    if (!started || submitted || timeLeft <= 0 || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, submitted, isPaused]);

  /* ================= AUTO SUBMIT ================= */
  useEffect(() => {
    if (started && timeLeft === 0 && !submitted) {
      submitTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submitTest intentionally excluded
  }, [timeLeft, started, submitted]);

  /* ================= FULLSCREEN DETECT ================= */
  useEffect(() => {
    const onFull = () => {
      const active = Boolean(document.fullscreenElement);

      if (!active && isFullscreen && started && !submitted) {
        // Pause the test when fullscreen is exited
        setIsPaused(true);
      }

      setIsFullscreen(active);
    };

    document.addEventListener("fullscreenchange", onFull);
    return () =>
      document.removeEventListener("fullscreenchange", onFull);
  }, [isFullscreen, started, submitted]);

  /* ================= BLOCK KEYS ================= */
  useEffect(() => {
    const block = (e) => {
      if (
        e.key === "Escape" ||
        e.key === "F11" ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey &&
          ["t", "w", "n", "c", "v", "x"].includes(
            e.key.toLowerCase()
          ))
      ) {
        e.preventDefault();
        alert("⚠️ Test environment locked.");
      }
    };

    const disable = (e) => e.preventDefault();

    window.addEventListener("keydown", block);
    document.addEventListener("contextmenu", disable);
    document.addEventListener("selectstart", disable);

    return () => {
      window.removeEventListener("keydown", block);
      document.removeEventListener("contextmenu", disable);
      document.removeEventListener("selectstart", disable);
    };
  }, []);

  /* ================= ENTER FULLSCREEN TO VIEW INSTRUCTIONS ================= */
  const enterFullscreenForInstructions = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      alert("Fullscreen permission required to view instructions.");
    }
  };

  /* ================= START TEST ================= */
  const startTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setTimeLeft(test.duration * 60);
      setStarted(true);
    } catch {
      alert("Fullscreen permission required");
    }
  };

  /* ================= RESUME TEST ================= */
  const resumeTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setIsPaused(false);
    } catch {
      alert("Fullscreen permission required to resume the test");
    }
  };

  /* ================= SUBMIT ================= */
  const submitTest = async () => {
    if (submitted) return;
    setSubmitted(true);

    // Exit fullscreen when submitting
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    let score = 0;
    const correctCount = [];
    const wrongCount = [];
    const unattempted = [];

    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      const correctAnswers = q.correctAnswers || [q.answer];

      if (userAnswer === undefined || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
        unattempted.push(i + 1);
        return;
      }

      if (q.isMultiple) {
        // Multiple answer: check if arrays match
        const userArr = Array.isArray(userAnswer) ? userAnswer.sort() : [];
        const correctArr = correctAnswers.sort();
        if (
          userArr.length === correctArr.length &&
          userArr.every((v, idx) => v === correctArr[idx])
        ) {
          score++;
          correctCount.push(i + 1);
        } else {
          wrongCount.push(i + 1);
        }
      } else {
        // Single answer
        if (userAnswer === correctAnswers[0] || userAnswer === q.answer) {
          score++;
          correctCount.push(i + 1);
        } else {
          wrongCount.push(i + 1);
        }
      }
    });

    // JEE Mains: +4 per correct, -1 per wrong, 0 for unattempted (no negative total)
    const isJeeMains = (test.testType || "").toLowerCase().includes("jee mains");
    const numCorrect = correctCount.length;
    const numWrong = wrongCount.length;
    const displayScore = isJeeMains
      ? Math.max(0, numCorrect * 4 - numWrong * 1)
      : score;
    const maxMarks = isJeeMains ? questions.length * 4 : questions.length;
    const percentage = maxMarks > 0 ? Math.round((displayScore / maxMarks) * 100) : 0;

    // Convert answers to Firebase-compatible format (no nested arrays, no undefined)
    // For multiple-answer questions, convert array to comma-separated string
    const formattedAnswers = [];
    for (let i = 0; i < questions.length; i++) {
      const ans = answers[i];
      if (ans === undefined || ans === null) {
        formattedAnswers.push(null);
      } else if (Array.isArray(ans)) {
        // Multiple answer: store as comma-separated string
        formattedAnswers.push(ans.length > 0 ? ans.join(",") : null);
      } else {
        formattedAnswers.push(ans);
      }
    }

    // Use student name/class from load (students/{collegeCode}/ids); fallback to auth displayName or email, never "Unknown"
    const resultStudentName =
      studentName ||
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "Student";
    const resultStudentClass = studentClass || "";

    // Subject-wise result (based on question.subject)
    const subjectWise = {};
    questions.forEach((q, i) => {
      const subject = (q.subject && String(q.subject).trim()) || "General";
      if (!subjectWise[subject]) {
        subjectWise[subject] = {
          score: 0,
          total: 0,
          answered: 0,
          unanswered: 0,
          correct: 0,
          wrong: 0,
          marked: 0,
        };
      }

      const entry = subjectWise[subject];
      entry.total += 1;

      const isMarked = markedForReview.has(i);
      if (isMarked) entry.marked += 1;

      const userAnswer = answers[i];
      const isUnanswered =
        userAnswer === undefined || (Array.isArray(userAnswer) && userAnswer.length === 0);
      if (isUnanswered) {
        entry.unanswered += 1;
        return;
      }
      entry.answered += 1;

      const correctAnswers = q.correctAnswers || [q.answer];
      let isCorrect = false;

      if (q.isMultiple) {
        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const correctArr = [...correctAnswers].sort();
        isCorrect =
          userArr.length === correctArr.length &&
          userArr.every((v, idx) => v === correctArr[idx]);
      } else {
        isCorrect = userAnswer === correctAnswers[0] || userAnswer === q.answer;
      }

      if (isCorrect) {
        entry.score += 1;
        entry.correct += 1;
      } else {
        entry.wrong += 1;
      }
    });

    const notVisitedCount = questions.length - visited.size;
    // Schema: results (collection) → byCollege (doc) → collegeCode (subcollection) → resultId (doc) → information
    const resultData = {
      uid: auth.currentUser.uid,
      studentName: resultStudentName,
      class: resultStudentClass,
      testId,
      testName: test?.name ?? "",
      score: displayScore,
      total: questions.length,
      correct: numCorrect,
      wrong: numWrong,
      skipped: notVisitedCount,
      answers: formattedAnswers,
      testType: test.testType || "",
      subjectWise,
      submittedAt: new Date(),
      ...(isJeeMains && { marks: displayScore, maxMarks }),
    };
    if (collegeCode && String(collegeCode).trim()) {
      const code = String(collegeCode).trim();
      await addDoc(collection(db, "results", "byCollege", code), resultData);
    } else {
      await addDoc(collection(db, "results"), resultData);
    }

    setFinalScore({
      score: displayScore,
      total: questions.length,
      correct: numCorrect,
      wrong: numWrong,
      unattempted: unattempted.length,
      percentage,
      timeTaken: test.duration * 60 - timeLeft,
      isJeeMains,
    });
  };

  /* ================= PRELOAD NEXT QUESTION IMAGES ================= */
  useEffect(() => {
    if (!questions.length || !started) return;

    // Preload next 2 questions' images
    const preloadImages = [];
    for (let i = 1; i <= 2; i++) {
      const nextIdx = current + i;
      if (nextIdx < questions.length) {
        const nextQ = questions[nextIdx];
        if (nextQ.imageUrl) preloadImages.push(nextQ.imageUrl);
        if (nextQ.optionImages) {
          nextQ.optionImages.forEach((img) => {
            if (img) preloadImages.push(img);
          });
        }
      }
    }

    // Preload using Image objects
    preloadImages.forEach((src) => {
      if (src.includes("cloudinary.com")) {
        const optimized = src.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
        const img = new window.Image();
        img.src = optimized;
      }
    });
  }, [current, questions, started]);

  /* ================= SUBJECT FILTER ================= */
  
  // Get unique subjects from questions
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter(s => s && s !== ""))];
    return uniqueSubjects.sort();
  }, [questions]);

  // Filter questions based on selected subject
  const filteredQuestions = useMemo(() => {
    if (!selectedSubject) return questions;
    return questions.filter(q => q.subject === selectedSubject);
  }, [questions, selectedSubject]);

  // Get the current question's original index
  const getOriginalIndex = (filteredIndex) => {
    if (filteredIndex < 0 || filteredIndex >= filteredQuestions.length) return 0;
    const filteredQ = filteredQuestions[filteredIndex];
    return questions.findIndex(q => q.id === filteredQ.id);
  };

  // Reset current to 0 when subject filter changes
  useEffect(() => {
    if (selectedSubject && filteredQuestions.length > 0) {
      setCurrent(0);
    } else if (!selectedSubject) {
      setCurrent(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset current on subject change only
  }, [selectedSubject]);

  // Track visited questions
  useEffect(() => {
    if (filteredQuestions.length > 0 && current >= 0 && current < filteredQuestions.length) {
      const originalIndex = getOriginalIndex(current);
      setVisited(prev => new Set([...prev, originalIndex]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track visited on current change only
  }, [current]);

  // Navigate to a specific subject
  const navigateToSubject = (subject) => {
    setSelectedSubject(subject);
    setCurrent(0);
  };

  // Mark/Unmark question for review
  const toggleMarkForReview = () => {
    const originalIndex = getOriginalIndex(current);
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(originalIndex)) {
        newSet.delete(originalIndex);
      } else {
        newSet.add(originalIndex);
      }
      return newSet;
    });
  };

  // Unanswer current question
  const unanswerQuestion = () => {
    const originalIndex = getOriginalIndex(current);
    const a = [...answers];
    a[originalIndex] = undefined;
    setAnswers(a);
  };

  // Get question state for palette
  const getQuestionState = (originalIndex) => {
    const isAnswered = answers[originalIndex] !== undefined;
    const isMarked = markedForReview.has(originalIndex);
    const isVisited = visited.has(originalIndex);
    
    if (isAnswered && isMarked) return "answered-marked"; // Purple
    if (isMarked) return "marked"; // Red/Pink
    if (isAnswered) return "answered"; // Green
    if (isVisited && !isAnswered) return "unanswered"; // Red - visited but not answered
    return "not-visited"; // White/Grey - not visited yet
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!test) return <div className="p-10 text-center text-gray-500">Test not found.</div>;

  /* ================= SCORE CARD ================= */
  if (submitted && finalScore) {
    const getGrade = (percentage) => {
      if (percentage >= 90) return { grade: "A+", color: "text-green-600", bg: "bg-green-100" };
      if (percentage >= 80) return { grade: "A", color: "text-green-500", bg: "bg-green-50" };
      if (percentage >= 70) return { grade: "B+", color: "text-blue-600", bg: "bg-blue-100" };
      if (percentage >= 60) return { grade: "B", color: "text-blue-500", bg: "bg-blue-50" };
      if (percentage >= 50) return { grade: "C", color: "text-yellow-600", bg: "bg-yellow-100" };
      if (percentage >= 40) return { grade: "D", color: "text-orange-500", bg: "bg-orange-50" };
      return { grade: "F", color: "text-red-600", bg: "bg-red-100" };
    };

    const gradeInfo = getGrade(finalScore.percentage);
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className={`${gradeInfo.bg} p-6 text-center`}>
            {(collegeLogoUrl || collegeName) && (
              <div className="flex justify-center mb-3">
                {collegeLogoUrl ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow bg-white flex items-center justify-center">
                    {collegeLogoUrl.includes("cloudinary.com") ? (
                      <Image src={collegeLogoUrl} alt="" width={56} height={56} className="w-full h-full object-contain p-1" unoptimized={false} />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={collegeLogoUrl} alt="" className="w-full h-full object-contain p-1" />
                    )}
                  </div>
                ) : (
                  <span className="text-gray-700 font-semibold text-sm">{collegeName}</span>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Test Completed!</h1>
            <p className="text-gray-600">{test?.name ?? "Test"}</p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center -mt-8">
            <div className={`w-32 h-32 rounded-full ${gradeInfo.bg} border-4 border-white shadow-lg flex flex-col items-center justify-center`}>
              <span className={`text-4xl font-bold ${gradeInfo.color}`}>{finalScore.percentage}%</span>
              <span className={`text-lg font-semibold ${gradeInfo.color}`}>Grade {gradeInfo.grade}</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-800">
                {finalScore.score} <span className="text-gray-400 text-xl">/ {finalScore.isJeeMains ? finalScore.total * 4 : finalScore.total}</span>
              </p>
              <p className="text-gray-500">{finalScore.isJeeMains ? "Marks (Correct +4, Wrong -1)" : "Questions Correct"}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{finalScore.correct}</div>
                <div className="text-sm text-green-700">Correct</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{finalScore.wrong}</div>
                <div className="text-sm text-red-700">Wrong</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{finalScore.unattempted}</div>
                <div className="text-sm text-gray-700">Skipped</div>
              </div>
            </div>

            {/* Time Taken */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-blue-700 font-medium">Time Taken</span>
              <span className="text-blue-600 font-bold">{formatTime(finalScore.timeTaken)}</span>
            </div>

            {/* Action Button */}
            <button
              onClick={() => router.push("/select-test/college")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= INSTRUCTIONS & FULLSCREEN GATE ================= */
  if (!isFullscreen) {
    if (isPaused && started && !submitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded shadow text-center max-w-md">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-xl font-bold mb-2 text-orange-600">Test Paused</h2>
            <p className="text-gray-600 mb-4">
              You exited fullscreen mode. Your test has been paused.
              <br />
              Time remaining: <span className="font-bold text-red-600">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </p>
            <button
              onClick={resumeTest}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Resume Test
            </button>
          </div>
        </div>
      );
    }

    if (instructionsStep === 0 || instructionsStep === 1) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-bold text-black mb-2">Fullscreen Required</h2>
            <p className="text-black mb-6">Please enter fullscreen to view the instructions and begin the test.</p>
            <button
              onClick={enterFullscreenForInstructions}
              className="text-blue-600 hover:text-blue-800 font-semibold underline text-lg"
            >
              Enter Fullscreen to View Instructions
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-bold text-black mb-4">Fullscreen Required</h2>
          <p className="text-black mb-4">{test?.name ?? "Test"}</p>
          <button
            onClick={startTest}
            className="text-blue-600 hover:text-blue-800 font-semibold underline text-lg"
          >
            Enter Fullscreen & Start Test
          </button>
        </div>
      </div>
    );
  }

  /* ================= INSTRUCTIONS IN FULLSCREEN (JEE-style layout) ================= */
  if (isFullscreen && !started && !submitted) {
    const durationMins = test?.duration ?? 60;
    const displayId = studentName || auth.currentUser?.email || auth.currentUser?.uid?.slice(-10) || "—";

    if (instructionsStep === 0) {
      const t = INSTRUCTION_TRANSLATIONS[instructionLang] || INSTRUCTION_TRANSLATIONS.en;
      return (
        <div className="min-h-screen h-screen flex bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="flex justify-between items-start gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-black">{t.pleaseRead}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-black text-sm">{t.viewIn}</span>
                  <select
                    value={instructionLang}
                    onChange={(e) => setInstructionLang(e.target.value)}
                    className="border border-gray-300 rounded text-black text-sm px-2 py-1 bg-white min-w-[100px]"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="te">తెలుగు</option>
                  </select>
                </div>
              </div>
              <section className="mb-5">
                <h2 className="font-bold text-black mb-2">{t.generalInstructions}</h2>
                <ol className="list-decimal list-inside space-y-2 text-black text-sm sm:text-base">
                  <li>{t.durationLine(durationMins)}</li>
                  <li>{t.timerLine}</li>
                  <li className="mt-3">
                    <span className="font-bold text-black">{t.questionPalette}</span>
                    <ul className="mt-2 space-y-1.5 ml-2">
                      <li className="flex items-center gap-2 text-black">
                        <span className="w-7 h-7 rounded-full bg-gray-200 border border-gray-400 flex items-center justify-center text-xs font-medium flex-shrink-0 text-black">0</span>
                        {t.notVisited}
                      </li>
                      <li className="flex items-center gap-2 text-black">
                        <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">0</span>
                        {t.answered}
                      </li>
                      <li className="flex items-center gap-2 text-black">
                        <span className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">0</span>
                        {t.notAnswered}
                      </li>
                      <li className="flex items-center gap-2 text-black">
                        <span className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">0</span>
                        {t.markedNotAnswered}
                      </li>
                      <li className="flex items-center gap-2 text-black">
                        <span className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">0</span>
                        {t.markedAnswered}
                      </li>
                    </ul>
                    <p className="mt-2 text-black text-sm">
                      <strong>{t.markedNote}</strong> {t.markedReminder}{" "}
                      <span className="text-red-600 font-medium">{t.markedWarning}</span>
                    </p>
                  </li>
                </ol>
              </section>
              <section className="mb-5">
                <h2 className="font-bold text-black mb-2">{t.navigatingTo}</h2>
                <ol className="list-decimal list-inside space-y-1 text-black text-sm sm:text-base ml-0" start={4}>
                  <li>{t.nav1}</li>
                  <li>{t.nav2}</li>
                  <li>{t.nav3}</li>
                  <li>{t.nav4}</li>
                </ol>
              </section>
              <section className="mb-6">
                <h2 className="font-bold text-black mb-2">{t.answering}</h2>
                <ol className="list-decimal list-inside space-y-1 text-black text-sm sm:text-base ml-0" start={6}>
                  <li>{t.ans1}</li>
                  <li>{t.ans2}</li>
                  <li>{t.ans3}</li>
                </ol>
              </section>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setInstructionsStep(1)} className="text-blue-600 hover:text-blue-800 font-semibold px-4 py-2">
                  {t.next}
                </button>
              </div>
            </div>
          </div>
          <div className="w-48 sm:w-56 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col items-center pt-6 pb-4 px-4">
            {collegeLogoUrl && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shrink-0 mb-4">
                {collegeLogoUrl.includes("cloudinary.com") ? (
                  <Image src={collegeLogoUrl} alt={collegeName || "College"} width={96} height={96} className="w-full h-full object-contain p-1" unoptimized={false} />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={collegeLogoUrl} alt={collegeName || "College"} className="w-full h-full object-contain p-1" />
                )}
              </div>
            )}
            {collegeName && !collegeLogoUrl && <p className="text-black font-semibold text-sm text-center mb-2">{collegeName}</p>}
            <div className="w-24 h-28 sm:w-28 sm:h-32 bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">{t.photo}</div>
            <p className="mt-4 text-black font-medium text-sm break-all text-center">{displayId}</p>
          </div>
        </div>
      );
    }

    if (instructionsStep === 1) {
      const t = INSTRUCTION_TRANSLATIONS[instructionLang] || INSTRUCTION_TRANSLATIONS.en;
      return (
        <div className="min-h-screen h-screen flex bg-white overflow-y-auto">
          <div className="flex-1 max-w-2xl mx-auto p-6 sm:p-8">
            {(collegeLogoUrl || collegeName) && (
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {collegeLogoUrl && (
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shrink-0">
                      {collegeLogoUrl.includes("cloudinary.com") ? (
                        <Image src={collegeLogoUrl} alt="" width={48} height={48} className="w-full h-full object-contain p-0.5" unoptimized={false} />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={collegeLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                      )}
                    </div>
                  )}
                  {collegeName && <span className="text-black font-semibold text-sm">{collegeName}</span>}
                </div>
              </div>
            )}
            <div className="flex justify-end items-center gap-2 mb-3">
              <span className="text-black text-sm">{t.viewIn}</span>
              <select
                value={instructionLang}
                onChange={(e) => setInstructionLang(e.target.value)}
                className="border border-gray-300 rounded text-black text-sm px-2 py-1 bg-white min-w-[100px]"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="te">తెలుగు</option>
              </select>
            </div>
            <div className="bg-red-600 text-white text-center font-bold py-2 px-4 rounded mb-6">{t.otherWarnings}</div>
            <ol className="list-decimal list-inside space-y-3 text-blue-700 text-sm sm:text-base mb-6">
              <li>{t.warn1}</li>
              <li>{t.warn2}</li>
              <li>{t.warn3}</li>
              <li>{t.warn4}</li>
            </ol>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg font-bold text-blue-800 mb-2">{t.notice}</p>
              <p className="text-blue-700 text-sm sm:text-base">{t.noticeText}</p>
            </div>
            <div className="flex justify-center mb-6">
              <button type="button" onClick={() => setInstructionsStep(0)} className="text-blue-600 hover:text-blue-800 font-medium">{t.previous}</button>
            </div>
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instructionsAcknowledged}
                  onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-black text-sm sm:text-base">{t.checkboxText}</span>
              </label>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => { if (!instructionsAcknowledged) return; startTest(); }}
                disabled={!instructionsAcknowledged}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded transition-colors"
              >
                {t.readyToBegin}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  /* ================= TEST UI ================= */
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* College logo + name + test name - above All/categories section */}
        <div className="bg-white border rounded-lg mb-4 p-3 sm:p-4 flex items-center gap-3 flex-wrap">
          {(collegeLogoUrl || collegeName) && (
            <>
              {collegeLogoUrl && (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shrink-0">
                  {collegeLogoUrl.includes("cloudinary.com") ? (
                    <Image src={collegeLogoUrl} alt="" width={48} height={48} className="w-full h-full object-contain p-0.5" unoptimized={false} />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={collegeLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                  )}
                </div>
              )}
              {collegeName && <span className="text-gray-700 font-medium text-sm sm:text-base">{collegeName}</span>}
            </>
          )}
          <span className="font-bold text-gray-800 text-base sm:text-lg">{test?.name ?? "Test"}</span>
        </div>

        {/* Section Tabs - All / Categories + Timer */}
        {subjects.length > 0 && (
          <div className="bg-white border rounded-lg mb-4 p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
              <div className="flex flex-wrap gap-2">
                {/* All Tab */}
                <div className="relative group">
                  <button
                    onClick={() => navigateToSubject("")}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded font-medium transition-colors text-sm sm:text-base ${
                      !selectedSubject
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>All</span>
                      <span className="text-xs font-semibold">{questions.length}</span>
                    </div>
                  </button>
                  {/* Hover Stats Tooltip */}
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-3 z-50 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold">{questions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Answered:</span>
                        <span className="font-bold text-green-700">
                          {questions.filter((q, i) => answers[i] !== undefined).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Unanswered:</span>
                        <span className="font-bold text-red-700">
                          {questions.filter((q, i) => answers[i] === undefined).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pink-600">Marked:</span>
                        <span className="font-bold text-pink-700">{markedForReview.size}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Subject Tabs */}
                {subjects.map((subj) => {
                  const subjectQuestions = questions.filter(q => q.subject === subj);
                  const subjectCount = subjectQuestions.length;
                  const subjectAnswered = subjectQuestions.filter((q, i) => {
                    const origIdx = questions.findIndex(origQ => origQ.id === q.id);
                    return answers[origIdx] !== undefined;
                  }).length;
                  const subjectMarked = subjectQuestions.filter((q) => {
                    const origIdx = questions.findIndex(origQ => origQ.id === q.id);
                    return markedForReview.has(origIdx);
                  }).length;
                  const subjectUnanswered = subjectCount - subjectAnswered;
                  const isActive = selectedSubject === subj;
                  
                  return (
                    <div key={subj} className="relative group">
                      <button
                        onClick={() => navigateToSubject(subj)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded font-medium transition-all text-sm sm:text-base ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
                          <span className="font-semibold">{subj}</span>
                          <span className="text-xs font-bold">{subjectCount}</span>
                        </div>
                      </button>
                      {/* Hover Stats Tooltip */}
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-3 z-50 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-bold">{subjectCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Answered:</span>
                            <span className="font-bold text-green-700">{subjectAnswered}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Unanswered:</span>
                            <span className="font-bold text-red-700">{subjectUnanswered}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-pink-600">Marked:</span>
                            <span className="font-bold text-pink-700">{subjectMarked}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Timer */}
              <div className="flex items-center gap-2 lg:gap-3">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Time:</span>
                <span className="text-red-600 font-bold text-lg sm:text-xl">
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3 bg-white p-4 sm:p-6 border rounded">
            <div className="mb-4">
              <h2 className="font-bold text-lg text-gray-800">{test?.name ?? "Test"}</h2>
            </div>

          {/* Question Text */}
          {filteredQuestions.length > 0 && (
            <>
              <p className="font-medium text-lg whitespace-pre-wrap">
                {current + 1}. {filteredQuestions[current].text || filteredQuestions[current].question}
                {filteredQuestions[current].subject && (
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    ({filteredQuestions[current].subject})
                  </span>
                )}
              </p>

              {/* Question Image */}
              {filteredQuestions[current].imageUrl && (
                <div className="my-4">
                  <CloudinaryImage
                    src={filteredQuestions[current].imageUrl}
                    alt={`Question ${current + 1}`}
                    type="question"
                    priority={true}
                  />
                </div>
              )}

              {/* Options */}
              <div className="mt-4 space-y-3">
                {filteredQuestions[current].options.map((opt, i) => {
                  const originalIndex = getOriginalIndex(current);
                  return (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[originalIndex] === i
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type={filteredQuestions[current].isMultiple ? "checkbox" : "radio"}
                        name={`question-${current}`}
                        checked={
                          filteredQuestions[current].isMultiple
                            ? (answers[originalIndex] || []).includes(i)
                            : answers[originalIndex] === i
                        }
                        onChange={() => {
                          const a = [...answers];
                          if (filteredQuestions[current].isMultiple) {
                            // Multiple answer handling
                            const currentAnswers = a[originalIndex] || [];
                            if (currentAnswers.includes(i)) {
                              a[originalIndex] = currentAnswers.filter((x) => x !== i);
                            } else {
                              a[originalIndex] = [...currentAnswers, i];
                            }
                          } else {
                            a[originalIndex] = i;
                          }
                          setAnswers(a);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">
                          {String.fromCharCode(65 + i)}.
                        </span>{" "}
                        {opt}
                        {/* Option Image */}
                        {filteredQuestions[current].optionImages?.[i] && (
                          <div className="mt-2">
                            <CloudinaryImage
                              src={filteredQuestions[current].optionImages[i]}
                              alt={`Option ${String.fromCharCode(65 + i)}`}
                              type="option"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Action Buttons - JEE Mains Style */}
              <div className="flex flex-wrap gap-2 mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                <button
                  onClick={toggleMarkForReview}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium transition-colors text-sm sm:text-base ${
                    markedForReview.has(getOriginalIndex(current))
                      ? "bg-pink-600 text-white"
                      : "bg-white border border-pink-300 text-pink-600 hover:bg-pink-50"
                  }`}
                >
                  <span className="hidden sm:inline">
                    {markedForReview.has(getOriginalIndex(current)) ? "✓ Marked" : "Mark for Review"}
                  </span>
                  <span className="sm:hidden">
                    {markedForReview.has(getOriginalIndex(current)) ? "✓" : "Mark"}
                  </span>
                </button>
                <button
                  onClick={unanswerQuestion}
                  disabled={answers[getOriginalIndex(current)] === undefined}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Unanswer
                </button>
              </div>

              <div className="flex justify-between mt-4 sm:mt-6 gap-2">
                <button
                  disabled={current === 0}
                  onClick={() => setCurrent(current - 1)}
                  className="px-3 py-2 sm:px-4 sm:py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">← Prev</span>
                  <span className="sm:hidden">←</span>
                </button>
                {current === filteredQuestions.length - 1 ? (
                  <button
                    onClick={submitTest}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded font-medium text-sm sm:text-base"
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrent(current + 1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded font-medium text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Next →</span>
                    <span className="sm:hidden">→</span>
                  </button>
                )}
              </div>
            </>
          )}

          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No questions found for the selected subject.
            </div>
          )}
        </div>

        <div className="bg-white p-3 sm:p-4 border rounded shadow-sm sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3">
            Question Palette
            {selectedSubject && (
              <span className="text-xs text-gray-500 block mt-1 font-normal">
                ({filteredQuestions.length} of {questions.length})
              </span>
            )}
          </h3>
          
          {/* Legend - Responsive Grid */}
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-600 border border-blue-800 flex-shrink-0"></div>
              <span className="truncate">Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0"></div>
              <span className="truncate">Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-pink-500 flex-shrink-0"></div>
              <span className="truncate">Marked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500 flex-shrink-0"></div>
              <span className="truncate">Both</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500 flex-shrink-0"></div>
              <span className="truncate">Unanswered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300 flex-shrink-0"></div>
              <span className="truncate">Not Visited</span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
            {filteredQuestions.map((q, i) => {
              const originalIndex = questions.findIndex(origQ => origQ.id === q.id);
              const state = getQuestionState(originalIndex);
              const isCurrent = current === i;
              
              // JEE Mains color scheme
              let buttonClass = "p-1.5 sm:p-2 rounded text-xs sm:text-sm font-medium border-2 transition-all ";
              if (isCurrent) {
                buttonClass += "bg-blue-600 text-white border-blue-800 shadow-lg scale-105";
              } else {
                switch (state) {
                  case "answered-marked":
                    buttonClass += "bg-purple-500 text-white border-purple-700";
                    break;
                  case "marked":
                    buttonClass += "bg-pink-500 text-white border-pink-700";
                    break;
                  case "answered":
                    buttonClass += "bg-green-500 text-white border-green-700";
                    break;
                  case "unanswered":
                    buttonClass += "bg-red-500 text-white border-red-700";
                    break;
                  default:
                    buttonClass += "bg-gray-200 text-gray-700 border-gray-300";
                }
              }
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrent(i)}
                  className={buttonClass}
                  title={`Q${i + 1}${q.subject ? ` - ${q.subject}` : ""} - ${state.replace("-", " ")}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          
          {filteredQuestions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No questions to display
            </p>
          )}

          {/* Summary Stats - Responsive Grid */}
          <div className="mt-3 sm:mt-4 pt-3 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="font-bold text-blue-700 text-sm sm:text-base">{filteredQuestions.length}</div>
                <div className="text-blue-600">Total</div>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="font-bold text-green-700 text-sm sm:text-base">
                  {filteredQuestions.filter((q) => {
                    const origIdx = questions.findIndex(origQ => origQ.id === q.id);
                    return answers[origIdx] !== undefined;
                  }).length}
                </div>
                <div className="text-green-600">Answered</div>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="font-bold text-red-700 text-sm sm:text-base">
                  {filteredQuestions.filter((q) => {
                    const origIdx = questions.findIndex(origQ => origQ.id === q.id);
                    return answers[origIdx] === undefined;
                  }).length}
                </div>
                <div className="text-red-600">Unanswered</div>
              </div>
              <div className="bg-pink-50 p-2 rounded text-center">
                <div className="font-bold text-pink-700 text-sm sm:text-base">
                  {filteredQuestions.filter((q) => {
                    const origIdx = questions.findIndex(origQ => origQ.id === q.id);
                    return markedForReview.has(origIdx);
                  }).length}
                </div>
                <div className="text-pink-600">Marked</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
