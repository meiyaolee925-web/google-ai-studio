import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Upload, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Clock, Lock, Download, XCircle } from 'lucide-react';
import { translations, correctAnswers } from './translations';

type Language = 'zh' | 'en';
type Step = 'intro' | 'info' | 'test-mcq' | 'test-app' | 'success' | 'admin';
type Role = 'overseas_ads_optimizer_brand' | 'overseas_media_planner_brand' | 'overseas_ads_optimizer_perf' | 'overseas_game_am' | 'brand_planner' | 'overseas_media_ops' | 'overseas_ads_product' | 'cross_border_ecommerce' | 'ads_design' | 'tts_store_ops' | 'community_ops' | 'graphic_design' | 'settlement' | 'sales_bd' | 'game_brand_planner' | 'other' | '';

const Timer = ({ minutes, onExpire, label }: { minutes: number, onExpire: () => void, label: string }) => {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  
  return (
    <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium border border-red-100">
      <Clock className="w-4 h-4" />
      <span>{label}:</span>
      <span className="font-mono text-lg">{m}:{s.toString().padStart(2, '0')}</span>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('');
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({});
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Admin state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const t = translations[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (step === 'admin' && isAdminLoggedIn) {
      fetch('/api/records')
        .then(res => res.json())
        .then(data => setRecords(data))
        .catch(err => console.error(err));
    }
  }, [step, isAdminLoggedIn]);

  const handleAdminLogin = () => {
    if (adminUsername === 'admin' && adminPassword === 'admin') {
      setIsAdminLoggedIn(true);
    } else {
      alert('Incorrect username or password');
    }
  };

  const handleRetake = () => {
    setName('');
    setRole('');
    setAnswers({});
    setFile(null);
    setScore(0);
    setStep('intro');
  };

  const handleNextInfo = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t.requiredField;
    if (!role) newErrors.role = t.requiredField;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch(`/api/check?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.submitted) {
        setErrors({ name: t.duplicateCandidate });
        return;
      }
    } catch (err) {
      console.error('Failed to check duplicate candidate', err);
    }

    setErrors({});
    setStep('test-mcq');
  };

  const handleNextMcq = () => {
    const newErrors: Record<string, string> = {};
    for (let i = 1; i <= 5; i++) {
      if (answers[i] === undefined || (Array.isArray(answers[i]) && (answers[i] as number[]).length === 0)) {
        newErrors.answers = t.requiredAnswers;
        break;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep('test-app');
  };

  const correctAnswersIndices = {
    1: 1, // B
    2: [0, 1, 3], // A, B, D
    3: 1, // B
    4: 1, // B
    5: [0, 2, 3] // A, C, D
  };

  const calculateScore = () => {
    let currentScore = 0;
    for (let i = 1; i <= 5; i++) {
      const userAns = answers[i];
      const correctAns = correctAnswersIndices[i as keyof typeof correctAnswersIndices];
      
      if (Array.isArray(correctAns)) {
        if (Array.isArray(userAns) && userAns.length === correctAns.length && userAns.every(v => correctAns.includes(v))) {
          currentScore += 20;
        }
      } else {
        if (userAns === correctAns) {
          currentScore += 20;
        }
      }
    }
    return currentScore;
  };

  const handleSubmitTest = async () => {
    const newErrors: Record<string, string> = {};
    if (!file) {
      newErrors.file = t.requiredUpload;
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    
    const finalScore = calculateScore();
    setScore(finalScore);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('score', finalScore.toString());
    formData.append('answers', JSON.stringify(answers));
    if (file) {
      formData.append('file', file);
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setStep('success');
      } else if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'Duplicate submission within 24 hours') {
          alert(t.duplicateCandidate);
        } else {
          alert('Submission failed. Please try again.');
        }
      } else {
        alert('Submission failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionToggle = (qNum: number, optionIdx: number, isMultiple: boolean) => {
    setAnswers(prev => {
      if (!isMultiple) {
        return { ...prev, [qNum]: optionIdx };
      }
      const current = (prev[qNum] as number[]) || [];
      if (current.includes(optionIdx)) {
        return { ...prev, [qNum]: current.filter(o => o !== optionIdx) };
      } else {
        return { ...prev, [qNum]: [...current, optionIdx].sort() };
      }
    });
  };

  const questions = [
    { num: 1, text: t.q1, options: t.q1Options, isMultiple: false },
    { num: 2, text: t.q2, options: t.q2Options, isMultiple: true },
    { num: 3, text: t.q3, options: t.q3Options, isMultiple: false },
    { num: 4, text: t.q4, options: t.q4Options, isMultiple: false },
    { num: 5, text: t.q5, options: t.q5Options, isMultiple: true },
  ];

  const Logo = ({ className = "text-3xl" }: { className?: string }) => (
    <div 
      className={`flex items-center font-black tracking-tighter cursor-pointer ${className}`} 
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <span style={{ color: '#4285F4' }}>B</span>
      <span style={{ color: '#FBBC05' }}>l</span>
      <span style={{ color: '#EA4335' }}>u</span>
      <span style={{ color: '#34A853' }}>e</span>
      <span style={{ color: '#3354D4', marginLeft: '0.02em' }}>Focus</span>
      <span style={{ color: '#4285F4' }}>AI</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#3354D4] selection:text-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <Logo className="text-2xl" />
              <span className="ml-3 text-xs font-medium bg-[#3354D4]/10 text-[#3354D4] px-2 py-0.5 rounded-full">
                蓝色光标
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('admin')}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#3354D4] transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full"
            >
              <Lock className="w-4 h-4" />
              {t.adminLogin}
            </button>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#3354D4] transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full"
            >
              <Globe className="w-4 h-4" />
              {lang === 'zh' ? 'English' : '中文'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 print:py-0 print:max-w-none">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 text-center"
            >
              <div className="flex justify-center mb-8">
                <Logo className="text-5xl" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-8">{t.introTitle}</h1>
              <div className="space-y-5 text-slate-600 text-[15px] text-left leading-relaxed max-w-2xl mx-auto mb-10 bg-slate-50/80 p-6 md:p-8 rounded-2xl border border-slate-100">
                <p>{t.introText1} {t.introText2}</p>
                <p>{t.introText3}</p>
              </div>
              <button
                onClick={() => setStep('info')}
                className="inline-flex items-center justify-center gap-2 bg-[#3354D4] hover:bg-[#2843AA] text-white px-8 py-4 rounded-xl font-medium text-lg transition-all active:scale-95 shadow-md shadow-[#3354D4]/20"
              >
                {t.startBtn}
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-8">{t.infoTitle}</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.nameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#3354D4] focus:ring-[#3354D4]'} focus:ring-2 focus:outline-none transition-all`}
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.roleLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.role ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#3354D4] focus:ring-[#3354D4]'} focus:ring-2 focus:outline-none transition-all appearance-none bg-white`}
                  >
                    <option value="" disabled>{t.rolePlaceholder}</option>
                    <option value="overseas_ads_optimizer_brand">{t.roles.overseas_ads_optimizer_brand}</option>
                    <option value="overseas_media_planner_brand">{t.roles.overseas_media_planner_brand}</option>
                    <option value="overseas_ads_optimizer_perf">{t.roles.overseas_ads_optimizer_perf}</option>
                    <option value="overseas_game_am">{t.roles.overseas_game_am}</option>
                    <option value="brand_planner">{t.roles.brand_planner}</option>
                    <option value="overseas_media_ops">{t.roles.overseas_media_ops}</option>
                    <option value="overseas_ads_product">{t.roles.overseas_ads_product}</option>
                    <option value="cross_border_ecommerce">{t.roles.cross_border_ecommerce}</option>
                    <option value="ads_design">{t.roles.ads_design}</option>
                    <option value="tts_store_ops">{t.roles.tts_store_ops}</option>
                    <option value="community_ops">{t.roles.community_ops}</option>
                    <option value="graphic_design">{t.roles.graphic_design}</option>
                    <option value="settlement">{t.roles.settlement}</option>
                    <option value="sales_bd">{t.roles.sales_bd}</option>
                    <option value="game_brand_planner">{t.roles.game_brand_planner}</option>
                    <option value="other">{t.roles.other}</option>
                  </select>
                  {errors.role && <p className="mt-2 text-sm text-red-500">{errors.role}</p>}
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={() => setStep('intro')}
                  className="text-slate-500 hover:text-slate-800 font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t.backBtn}
                </button>
                <button
                  onClick={handleNextInfo}
                  className="inline-flex items-center justify-center gap-2 bg-[#3354D4] hover:bg-[#2843AA] text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-md shadow-[#3354D4]/20"
                >
                  {t.nextBtn}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'test-mcq' && (
            <motion.div
              key="test-mcq"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {t.section1Title}
                  </h2>
                  <Timer minutes={5} label={t.timeLeft} onExpire={() => setStep('test-app')} />
                </div>
                
                {errors.answers && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{errors.answers}</p>
                  </div>
                )}

                <div className="space-y-10">
                  {questions.map((q) => (
                    <div key={q.num} className="space-y-4">
                      <h3 className="text-lg font-medium text-slate-900 leading-relaxed">
                        {q.text}
                      </h3>
                      <div className="space-y-3">
                        {q.options.map((opt, idx) => {
                          const isSelected = q.isMultiple 
                            ? (answers[q.num] as number[] || []).includes(idx)
                            : answers[q.num] === idx;
                          
                          return (
                            <label
                              key={idx}
                              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-[#3354D4] bg-[#3354D4]/5' 
                                  : 'border-slate-200 hover:border-[#3354D4]/30 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center h-5">
                                <input
                                  type={q.isMultiple ? "checkbox" : "radio"}
                                  name={`question-${q.num}`}
                                  checked={isSelected}
                                  onChange={() => handleOptionToggle(q.num, idx, q.isMultiple)}
                                  className={`w-5 h-5 text-[#3354D4] border-slate-300 focus:ring-[#3354D4] ${q.isMultiple ? 'rounded' : 'rounded-full'}`}
                                />
                              </div>
                              <div className="ml-3 text-slate-700 font-medium">
                                {opt}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  onClick={handleNextMcq}
                  className="inline-flex items-center justify-center gap-2 bg-[#3354D4] hover:bg-[#2843AA] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-[#3354D4]/30"
                >
                  {t.nextPartBtn}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'test-app' && (
            <motion.div
              key="test-app"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {t.section2Title}
                  </h2>
                  <Timer minutes={30} label={t.timeLeft} onExpire={handleSubmitTest} />
                </div>
                
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {t.roles[role as keyof typeof t.roles]}
                  </h3>
                  <p className="text-lg text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {t.appQ[role as keyof typeof t.appQ]}
                  </p>
                  {t.appQImages && t.appQImages[role as keyof typeof t.appQImages] && (
                    <div className="mt-6">
                      <img 
                        src={t.appQImages[role as keyof typeof t.appQImages]} 
                        alt="Task Reference" 
                        className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 max-h-[400px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#3354D4]/5 rounded-xl p-6 border border-[#3354D4]/20 mb-8">
                  <p className="text-[#3354D4] font-medium leading-relaxed">
                    {t.appQInstruction}
                  </p>
                </div>

                <div>
                  <label className="block text-base font-medium text-slate-900 mb-4">
                    {t.uploadLabel} <span className="text-red-500">*</span>
                  </label>
                  
                  {errors.file && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <p className="font-medium">{errors.file}</p>
                    </div>
                  )}

                  <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 hover:border-[#3354D4] hover:bg-slate-50 transition-colors relative">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-[#3354D4] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#3354D4] focus-within:ring-offset-2 hover:text-[#2843AA]"
                        >
                          <span>{t.chooseFile}</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            accept=".pdf"
                            className="sr-only" 
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500 mt-2">PDF up to 10MB</p>
                    </div>
                  </div>
                  
                  {file && (
                    <div className="mt-4 flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium">{t.fileUploaded} {file.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  onClick={handleSubmitTest}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-[#3354D4] hover:bg-[#2843AA] disabled:bg-slate-400 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-[#3354D4]/30"
                >
                  {isSubmitting ? '...' : t.submitBtn}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t.successTitle}</h2>
              <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed mb-8">
                {t.successText}
              </p>
              <button
                onClick={handleRetake}
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-8 py-3 rounded-xl font-medium transition-colors"
              >
                {t.retakeBtn}
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-none print:p-0"
            >
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4 print:hidden">
                <div className="flex items-center gap-3">
                  <Lock className="w-6 h-6 text-slate-400" />
                  <h2 className="text-2xl font-bold text-slate-900">{selectedRecord ? t.candidateDetails : t.adminTitle}</h2>
                </div>
                <div className="flex items-center gap-6">
                  {selectedRecord && selectedRecord.file_path && (
                    <a 
                      href={selectedRecord.file_path} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-[#3354D4] hover:bg-[#2843AA] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      {t.downloadFile}
                    </a>
                  )}
                  <button 
                    onClick={() => { 
                      if (selectedRecord) {
                        setSelectedRecord(null);
                      } else {
                        setStep('intro'); 
                        setIsAdminLoggedIn(false); 
                        setAdminUsername(''); 
                        setAdminPassword(''); 
                      }
                    }} 
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> {selectedRecord ? t.backToRecords : t.backBtn}
                  </button>
                </div>
              </div>

              {!isAdminLoggedIn ? (
                <div className="max-w-sm mx-auto py-8 space-y-4">
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder={t.usernamePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#3354D4] focus:ring-[#3354D4] focus:ring-2 focus:outline-none transition-all"
                  />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#3354D4] focus:ring-[#3354D4] focus:ring-2 focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleAdminLogin}
                    className="w-full bg-[#3354D4] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#2843AA] transition-colors"
                  >
                    {t.loginBtn}
                  </button>
                </div>
              ) : selectedRecord ? (
                <div className="space-y-8">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedRecord.name}</h3>
                      <div className="flex items-center gap-4 text-slate-500 font-medium">
                        <span>{t.roles[selectedRecord.role as keyof typeof t.roles]}</span>
                        <span>•</span>
                        <span className="text-sm">{t.submittedAt}: {new Date(selectedRecord.submitted_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <button 
                        onClick={() => window.print()}
                        className="print:hidden inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        {t.downloadPdf}
                      </button>
                      <div className="text-4xl font-black text-[#3354D4] ml-2">{selectedRecord.score} <span className="text-lg text-slate-400 font-medium">/ 100</span></div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    {questions.map((q) => {
                      const parsedAnswers = typeof selectedRecord.answers === 'string' ? JSON.parse(selectedRecord.answers) : (selectedRecord.answers || {});
                      const userAns = parsedAnswers[q.num];
                      const correctAns = correctAnswersIndices[q.num as keyof typeof correctAnswersIndices];
                      
                      let isCorrect = false;
                      if (Array.isArray(correctAns)) {
                        isCorrect = Array.isArray(userAns) && userAns.length === correctAns.length && userAns.every((v: number) => correctAns.includes(v));
                      } else {
                        isCorrect = userAns === correctAns;
                      }

                      const formatAnswer = (ans: number | number[] | undefined) => {
                        if (ans === undefined) return '未作答';
                        if (Array.isArray(ans)) {
                          return ans.map(idx => q.options[idx]).join(', ');
                        }
                        return q.options[ans];
                      };

                      return (
                        <div key={q.num} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                          <h3 className="text-lg font-medium text-slate-900 mb-4">{q.text}</h3>
                          
                          <div className="space-y-3">
                            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {isCorrect ? t.correct : t.incorrect}
                                </span>
                              </div>
                              <div className="text-sm text-slate-700">
                                <span className="font-semibold">{t.yourAnswer}</span> {formatAnswer(userAns)}
                              </div>
                            </div>
                            
                            {!isCorrect && (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="text-sm text-slate-700">
                                  <span className="font-semibold text-[#3354D4]">{t.correctAnswer}</span> {formatAnswer(correctAns)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 text-slate-500">{t.noRecords}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">{t.nameLabel}</th>
                        <th className="pb-3 font-medium">{t.roleLabel}</th>
                        <th className="pb-3 font-medium">{t.score}</th>
                        <th className="pb-3 font-medium">{t.submittedAt}</th>
                        <th className="pb-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {records.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 text-slate-500">#{r.id}</td>
                          <td className="py-4 font-medium text-slate-900">{r.name}</td>
                          <td className="py-4 text-slate-600">{r.role}</td>
                          <td className="py-4 font-bold text-[#3354D4]">{r.score}</td>
                          <td className="py-4 text-slate-500">{new Date(r.submitted_at).toLocaleString()}</td>
                          <td className="py-4 text-right space-x-4">
                            <button
                              onClick={() => setSelectedRecord(r)}
                              className="inline-flex items-center gap-1 text-[#3354D4] hover:underline font-medium transition-colors"
                            >
                              {t.viewDetails}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
