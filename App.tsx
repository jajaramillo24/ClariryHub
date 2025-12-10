import React, { useState, useRef } from 'react';
import { Stage, Idea, NFR, ProjectCard, CsvColumn, Subtask, Attachment } from './types';
import { STAGES } from './constants';
import * as GeminiService from './services/geminiService';
import { parse } from 'marked';

// --- Markdown Renderer ---
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const html = parse(content) as string;
  return (
    <div 
      className="markdown-content" 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

// --- Modern Icons ---
const Icons = {
  Brain: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.97-3.284"/><path d="M17.97 14.716A4 4 0 0 1 18 18"/></svg>,
  Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
  Kanban: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M16 7v7"/><path d="M12 7v7"/></svg>,
  Database: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Paperclip: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  File: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Cloud: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  ToggleOn: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="16" cy="12" r="3"/></svg>,
  ToggleOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// --- Modern Components ---

const LoadingOverlay = ({ text }: { text: string }) => (
  <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-2xl">
    <div className="flex flex-col items-center gap-4">
       <div className="relative">
         <div className="w-12 h-12 rounded-full border-2 border-clarity-500/30 border-t-clarity-400 animate-spin"></div>
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-clarity-400 rounded-full shadow-glow"></div>
         </div>
       </div>
       <p className="text-gray-200 font-medium tracking-wide text-sm animate-pulse">{text}</p>
    </div>
  </div>
);

// --- VIEW: Free Jam Session ---
const FreeJamView = ({ 
  ideas, setIdeas, attachments, setAttachments
}: { 
  ideas: Idea[], setIdeas: (i: Idea[]) => void, 
  attachments: Attachment[], setAttachments: (a: Attachment[]) => void
}) => {
  const [newIdea, setNewIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addIdea = () => {
    if (!newIdea.trim()) return;
    setIdeas([...ideas, { id: Date.now().toString(), content: newIdea }]);
    setNewIdea('');
  };

  const generateSummary = async () => {
    setLoading(true);
    try {
      // Pass both text ideas and attachments to the service
      const result = await GeminiService.summarizeIdeas(ideas, attachments);
      setSummary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             const result = reader.result as string;
             // Remove data URL prefix (e.g., "data:image/png;base64,")
             resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          mimeType: file.type,
          base64: base64
        };

        setAttachments([...attachments, newAttachment]);
      } catch (err) {
        console.error("File upload failed", err);
      } finally {
        // Reset input so same file can be selected again if needed
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="h-full flex flex-col p-8 relative">
      {loading && <LoadingOverlay text="Analyzing Context & Files..." />}
      
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">Brainstorming</h2>
          <p className="text-gray-500 mt-2 font-light">Capture raw concepts, upload docs & meeting audios.</p>
        </div>
        <button onClick={generateSummary} className="flex items-center gap-2 bg-clarity hover:bg-clarity-600 text-white px-5 py-2.5 rounded-xl shadow-glow transition-all hover:scale-105 active:scale-95 font-medium">
          <Icons.Zap /> Analyze Context
        </button>
      </div>

      <div className="flex gap-8 h-full overflow-hidden">
        {/* Input & List */}
        <div className="w-1/2 flex flex-col gap-6">
           
           {/* File Upload & Input Area */}
           <div className="flex flex-col gap-3">
              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-clarity-900/40 border border-clarity-500/30 rounded-full px-3 py-1 text-xs text-clarity-200">
                       <Icons.File />
                       <span className="max-w-[150px] truncate">{att.name}</span>
                       <button onClick={() => removeAttachment(att.id)} className="hover:text-white transition-colors"><Icons.X /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-2 flex gap-2 items-center shadow-lg relative">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="audio/*,application/pdf,text/plain,image/*" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                    title="Attach Audio, PDF, or Images"
                  >
                    <Icons.Paperclip />
                  </button>
                  <input 
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') addIdea(); }}
                    placeholder="Type idea or upload context..."
                    className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none px-2 py-2 font-light"
                  />
                  <button onClick={addIdea} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors"><Icons.Plus /></button>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
             {ideas.map(idea => (
               <div key={idea.id} className="group bg-gray-900/60 border border-white/5 p-4 rounded-2xl hover:bg-gray-800/60 hover:border-clarity-500/30 transition-all flex justify-between items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <p className="text-gray-200 leading-relaxed font-light">{idea.content}</p>
                 <button onClick={() => setIdeas(ideas.filter(i => i.id !== idea.id))} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                   <Icons.X />
                 </button>
               </div>
             ))}
             {ideas.length === 0 && attachments.length === 0 && (
                <div className="text-center text-gray-600 py-10 text-sm font-light">No ideas or files recorded.</div>
             )}
           </div>
        </div>

        {/* AI Output */}
        <div className="w-1/2 bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-8 overflow-y-auto shadow-inner">
          <h3 className="text-xs font-bold text-clarity-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
            AI Executive Summary
          </h3>
          {summary ? (
             <MarkdownRenderer content={summary} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
               <div className="scale-150 mb-4 text-gray-700"><Icons.Brain /></div>
               <p className="text-sm font-light">Run analysis to generate summary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- VIEW: NFR Analysis (NEW DESIGN) ---
const NfrView = ({ 
  nfrs, setNfrs 
}: { nfrs: NFR[], setNfrs: (n: NFR[]) => void }) => {
  const [loading, setLoading] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('Security');
  const [selectedPriority, setSelectedPriority] = useState<'Low'|'Medium'|'High'>('Medium');
  const [requirementText, setRequirementText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');

  const categories = [
    { id: 'Security', label: 'Security', icon: <Icons.Shield /> },
    { id: 'Performance', label: 'Performance', icon: <Icons.Zap /> },
    { id: 'Scalability', label: 'Scalability', icon: <Icons.TrendingUp /> },
    { id: 'Accessibility', label: 'Accessibility', icon: <Icons.Eye /> },
    { id: 'Privacy', label: 'Privacy', icon: <Icons.Lock /> },
    { id: 'Reliability', label: 'Reliability', icon: <Icons.Activity /> },
    { id: 'Storage', label: 'Storage', icon: <Icons.Database /> },
    { id: 'Infrastructure', label: 'Infrastructure', icon: <Icons.Cloud /> },
  ];

  const addNfr = () => {
    if (!requirementText.trim()) return;

    const newNfr: NFR = {
      id: Date.now().toString(),
      category: selectedCategory,
      title: requirementText,
      description: descriptionText,
      impactLevel: selectedPriority
    };
    
    setNfrs([...nfrs, newNfr]);
    setRequirementText('');
    setDescriptionText('');
  };

  const removeNfr = (id: string) => {
    setNfrs(nfrs.filter(n => n.id !== id));
  };

  const runAnalysis = async () => {
    setLoading(true);
    setShowAnalysis(true);
    try {
      const result = await GeminiService.analyzeRisks(nfrs);
      setRiskAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'bg-red-500 text-white border-red-400';
      case 'Medium': return 'bg-yellow-600 text-white border-yellow-500';
      case 'Low': return 'bg-blue-500 text-white border-blue-400';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col p-8 relative">
       {loading && <LoadingOverlay text="Analyzing Compliance & Risks..." />}
       
       <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Non-Functional Requirements</h2>
            <p className="text-gray-500 mt-1 font-light">Define constraints. AI uses this to refine estimation.</p>
          </div>
          <button 
            onClick={runAnalysis} 
            disabled={nfrs.length === 0}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
             <Icons.Shield /> Verify Risks
          </button>
       </div>

       {/* Analysis Modal/Overlay if needed, or just split view. Let's use split view if analysis is present, otherwise full width form/list */}
       <div className="flex gap-8 h-full overflow-hidden">
          
          {/* Main Content Area: Form & List */}
          <div className={`flex flex-1 gap-8 overflow-hidden transition-all duration-500 ${showAnalysis ? 'w-2/3' : 'w-full'}`}>
             
             {/* LEFT: Add Form */}
             <div className="w-1/2 flex flex-col gap-6 bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm overflow-y-auto">
                <div>
                   <h3 className="text-lg font-bold text-white mb-1">Add Requirements</h3>
                   <p className="text-xs text-gray-500">Define the constraint parameters below.</p>
                </div>

                {/* Category Grid */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                          selectedCategory === cat.id 
                          ? 'bg-clarity-600 border-clarity-500 text-white shadow-lg shadow-clarity-900/50' 
                          : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                         <span className="scale-75">{cat.icon}</span>
                         {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Priority</label>
                  <div className="flex gap-2">
                    {['High', 'Medium', 'Low'].map((p: any) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPriority(p)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                          selectedPriority === p 
                          ? getPriorityColor(p) 
                          : 'bg-black/20 border-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                   <div>
                     <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wider">Requirement</label>
                     <input 
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-clarity-500 transition-colors placeholder-gray-600"
                        placeholder="e.g. System must support 10k concurrent users"
                        value={requirementText}
                        onChange={(e) => setRequirementText(e.target.value)}
                     />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wider">Description (Optional)</label>
                     <textarea 
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-clarity-500 transition-colors placeholder-gray-600 resize-none h-24"
                        placeholder="Additional context about this constraint..."
                        value={descriptionText}
                        onChange={(e) => setDescriptionText(e.target.value)}
                     />
                   </div>
                </div>

                <button 
                  onClick={addNfr}
                  disabled={!requirementText.trim()}
                  className="mt-auto w-full bg-clarity-600 hover:bg-clarity-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-clarity-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icons.Plus /> Add Requirement
                </button>
             </div>

             {/* RIGHT: List */}
             <div className="w-1/2 flex flex-col bg-black/20 border border-white/5 rounded-3xl p-6 backdrop-blur-md overflow-hidden">
                <div className="mb-4">
                   <h3 className="text-lg font-bold text-white mb-1">Defined Requirements ({nfrs.length})</h3>
                   <p className="text-xs text-gray-500">Project constraints list.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                   {nfrs.map(nfr => {
                      const catInfo = categories.find(c => c.id === nfr.category) || categories[0];
                      return (
                        <div key={nfr.id} className="group bg-gray-900/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all relative">
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                 <span className="text-gray-400 scale-75 bg-white/5 p-1 rounded">{catInfo.icon}</span>
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityColor(nfr.impactLevel)} bg-opacity-20 border-opacity-20`}>{nfr.impactLevel}</span>
                              </div>
                              <button onClick={() => removeNfr(nfr.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icons.X />
                              </button>
                           </div>
                           <h4 className="text-sm font-medium text-white mb-1">{nfr.title}</h4>
                           {nfr.description && <p className="text-xs text-gray-400 leading-relaxed font-light">{nfr.description}</p>}
                        </div>
                      )
                   })}
                   
                   {nfrs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40">
                         <div className="scale-[2.5] mb-6 opacity-30"><Icons.Info /></div>
                         <p className="text-sm">No requirements defined yet.</p>
                         <p className="text-xs mt-1">Use the form to add constraints.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Analysis Panel (Conditional) */}
          {showAnalysis && (
            <div className="w-1/3 bg-black/40 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col animate-in slide-in-from-right duration-300 relative z-30">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                   <Icons.Shield /> Risk Report
                 </h3>
                 <button onClick={() => setShowAnalysis(false)} className="text-gray-500 hover:text-white">
                   <Icons.X />
                 </button>
               </div>
               <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                 {riskAnalysis ? (
                   <MarkdownRenderer content={riskAnalysis} />
                 ) : (
                   <div className="flex items-center justify-center h-40">
                     <p className="text-gray-500 text-xs italic">Analyzing...</p>
                   </div>
                 )}
               </div>
            </div>
          )}

       </div>
    </div>
  );
};

// --- VIEW: Card Creation (EDITABLE) ---
const CardCreationView = ({ 
  cards, setCards, ideas, nfrs 
}: { cards: ProjectCard[], setCards: (c: ProjectCard[]) => void, ideas: Idea[], nfrs: NFR[] }) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Generation Settings State
  const [genSettings, setGenSettings] = useState({
    includeBackend: true,
    includeFrontend: true,
    includeTesting: true,
    includeDocs: true
  });

  const toggleSetting = (key: keyof typeof genSettings) => {
    setGenSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // -- Update Logic --
  const updateCard = (id: string, updates: Partial<ProjectCard>) => {
    setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const createDraft = () => {
    if(!newTitle.trim()) return;
    const newCard: ProjectCard = {
      id: Date.now().toString(),
      title: newTitle,
      description: '',
      acceptanceCriteria: [],
      subtasks: [],
      totalStoryPoints: 0,
      justification: '',
      labels: [],
      risks: [],
      status: 'Draft'
    };
    setCards([...cards, newCard]);
    setActiveCardId(newCard.id);
    setNewTitle('');
  };

  const generateDetails = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setLoading(true);
    try {
      const generated = await GeminiService.generateSmartCard(
        card.title, 
        ideas, 
        nfrs,
        genSettings // Pass settings here
      );
      updateCard(cardId, { ...generated, status: 'Ready' });
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  // -- Helper Handlers for Nested Arrays --
  const handleCriteriaChange = (cardId: string, index: number, value: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newCriteria = [...card.acceptanceCriteria];
    newCriteria[index] = value;
    updateCard(cardId, { acceptanceCriteria: newCriteria });
  };

  const addCriteria = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { acceptanceCriteria: [...card.acceptanceCriteria, "New criteria..."] });
  };

  const removeCriteria = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { acceptanceCriteria: card.acceptanceCriteria.filter((_, i) => i !== index) });
  };

  const updateSubtask = (cardId: string, index: number, field: keyof Subtask, value: any) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newSubtasks = [...card.subtasks];
    newSubtasks[index] = { ...newSubtasks[index], [field]: value };
    updateCard(cardId, { subtasks: newSubtasks });
  };

  const addSubtask = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newTask: Subtask = { title: "New Subtask", type: "Backend", storyPoints: 1, completed: false };
    updateCard(cardId, { subtasks: [...card.subtasks, newTask] });
  };

  const removeSubtask = (cardId: string, index: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { subtasks: card.subtasks.filter((_, i) => i !== index) });
  };

  const activeCard = cards.find(c => c.id === activeCardId);

  // Helper for subtask visual tag colors
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Backend': return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'Frontend': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'Testing': return 'bg-green-500/10 text-green-300 border-green-500/20';
      case 'DevOps': return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="h-full flex flex-row relative">
      {loading && <LoadingOverlay text="Generating Specifications..." />}
      
      {/* Sidebar List */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-gray-900/30 backdrop-blur-sm flex-shrink-0">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Product Backlog</h2>
          <div className="flex gap-2">
            <input 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add item..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-clarity-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && createDraft()}
            />
            <button onClick={createDraft} className="bg-clarity hover:bg-clarity-600 px-3 rounded-xl text-white flex items-center justify-center shadow-lg shadow-clarity/20 transition-all hover:scale-105 active:scale-95">
              <Icons.Plus />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {cards.map(card => (
            <div 
              key={card.id}
              onClick={() => setActiveCardId(card.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                activeCardId === card.id 
                ? 'bg-gradient-to-r from-clarity-900/40 to-transparent border-clarity-500/30' 
                : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-1 relative z-10">
                 <h4 className={`text-sm font-medium truncate ${activeCardId === card.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{card.title}</h4>
              </div>
              <div className="flex items-center gap-2 mt-2 relative z-10">
                 <span className={`w-1.5 h-1.5 rounded-full ${card.status === 'Ready' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-gray-600'}`}></span>
                 {card.totalStoryPoints > 0 && (
                   <span className="text-[10px] font-mono text-gray-400 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{card.totalStoryPoints} pts</span>
                 )}
              </div>
              {activeCardId === card.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-clarity-500"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Main View - Editable Form */}
      <div className="flex-1 overflow-y-auto">
        {activeCard ? (
          <div className="max-w-6xl mx-auto p-8 lg:p-12">
            {/* Header / Title */}
            <div className="flex justify-between items-start mb-10 pb-6 border-b border-white/5">
               <div className="flex-1 mr-8">
                 <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 block">Epic / Story Title</label>
                 <input 
                    className="w-full bg-transparent text-4xl font-bold text-white focus:outline-none placeholder-gray-700 transition-colors pb-1 tracking-tight"
                    value={activeCard.title}
                    onChange={(e) => updateCard(activeCard.id, { title: e.target.value })}
                 />
                 <div className="flex gap-2 mt-4 items-center">
                   <span className="text-[10px] font-mono text-gray-500 px-2 py-1 bg-white/5 rounded-md">ID: {activeCard.id.slice(-6)}</span>
                   <div className="flex gap-2">
                      {activeCard.labels.map((l, idx) => (
                        <span key={idx} className="text-[10px] font-medium text-clarity-200 bg-clarity-900/30 border border-clarity-500/20 px-2.5 py-1 rounded-full">{l}</span>
                      ))}
                      <button className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded-full transition-colors flex items-center">+</button>
                   </div>
                 </div>
               </div>
               
               <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5">
                     <button onClick={() => toggleSetting('includeBackend')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${genSettings.includeBackend ? 'bg-blue-900/40 border-blue-500/40 text-blue-300' : 'border-transparent text-gray-600'}`}>Backend</button>
                     <button onClick={() => toggleSetting('includeFrontend')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${genSettings.includeFrontend ? 'bg-purple-900/40 border-purple-500/40 text-purple-300' : 'border-transparent text-gray-600'}`}>Frontend</button>
                     <button onClick={() => toggleSetting('includeTesting')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${genSettings.includeTesting ? 'bg-green-900/40 border-green-500/40 text-green-300' : 'border-transparent text-gray-600'}`}>QA</button>
                     <button onClick={() => toggleSetting('includeDocs')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${genSettings.includeDocs ? 'bg-orange-900/40 border-orange-500/40 text-orange-300' : 'border-transparent text-gray-600'}`}>Docs</button>
                  </div>
                  <button 
                    onClick={() => generateDetails(activeCard.id)}
                    className="bg-clarity hover:bg-clarity-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-glow hover:scale-105 active:scale-95"
                  >
                    <Icons.Zap /> {activeCard.status === 'Draft' ? 'Generate Specs' : 'Regenerate'}
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
               
               {/* LEFT COLUMN: Description & Criteria */}
               <div className="col-span-7 space-y-10">
                  {/* Description */}
                  <section className="bg-gray-900/20 rounded-3xl p-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">Description</h3>
                    <textarea 
                      className="w-full h-48 bg-transparent rounded-2xl p-4 text-sm text-gray-300 leading-relaxed focus:bg-white/5 focus:outline-none transition-all resize-y border border-transparent focus:border-white/10"
                      value={activeCard.description}
                      placeholder="Enter technical description..."
                      onChange={(e) => updateCard(activeCard.id, { description: e.target.value })}
                    />
                  </section>

                  {/* Acceptance Criteria */}
                  <section>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Acceptance Criteria</h3>
                        <button onClick={() => addCriteria(activeCard.id)} className="text-xs text-clarity-400 hover:text-clarity-300 font-medium bg-clarity-900/20 px-3 py-1 rounded-full transition-colors">+ Add Criteria</button>
                     </div>
                     <div className="space-y-3">
                       {activeCard.acceptanceCriteria.map((ac, i) => (
                         <div key={i} className="flex gap-3 items-start group bg-gray-900/30 p-3 rounded-2xl border border-transparent hover:border-white/5 transition-all">
                           <div className="mt-1.5 text-clarity-500"><Icons.Check /></div>
                           <textarea 
                              rows={1}
                              className="flex-1 bg-transparent text-sm text-gray-300 focus:outline-none resize-none overflow-hidden font-light"
                              value={ac}
                              onChange={(e) => handleCriteriaChange(activeCard.id, i, e.target.value)}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                           />
                           <button 
                              onClick={() => removeCriteria(activeCard.id, i)}
                              className="mt-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <Icons.Trash />
                           </button>
                         </div>
                       ))}
                       {activeCard.acceptanceCriteria.length === 0 && (
                         <p className="text-sm text-gray-600 italic pl-6">No criteria defined yet.</p>
                       )}
                     </div>
                  </section>
               </div>

               {/* RIGHT COLUMN: Estimation & Subtasks */}
               <div className="col-span-5 space-y-8">
                  
                  {/* Total Estimate */}
                  <section className="bg-gradient-to-br from-gray-900/80 to-black/80 p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-clarity-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-clarity-500/20 transition-all duration-700"></div>
                      
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 relative z-10">Total Estimation</h3>
                      <div className="flex items-center justify-between mb-6 relative z-10">
                         <div className="flex items-center gap-4">
                           <div className="relative">
                             <input 
                               type="number" 
                               className="w-24 bg-transparent border-b-2 border-white/10 p-2 text-4xl font-bold text-white text-center focus:border-clarity-500 focus:outline-none font-mono"
                               value={activeCard.totalStoryPoints}
                               onChange={(e) => updateCard(activeCard.id, { totalStoryPoints: parseInt(e.target.value) || 0 })}
                             />
                           </div>
                           <span className="text-sm text-gray-400 font-light">Story Points</span>
                         </div>
                      </div>
                      <textarea
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs text-gray-400 italic focus:outline-none focus:border-white/10 focus:bg-black/40 transition-colors relative z-10"
                        rows={2}
                        value={activeCard.justification}
                        onChange={(e) => updateCard(activeCard.id, { justification: e.target.value })}
                        placeholder="Justification for estimate..."
                      />
                  </section>

                  {/* Subtasks - VISUAL CARDS */}
                  <section>
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Implementation Tasks</h3>
                       <button onClick={() => addSubtask(activeCard.id)} className="text-xs text-clarity-400 hover:text-clarity-300 font-medium">+ Add Task</button>
                    </div>
                    <div className="space-y-3">
                      {activeCard.subtasks.map((task, i) => (
                        <div key={i} className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all shadow-sm group backdrop-blur-sm">
                           {/* Row 1: Type and Actions */}
                           <div className="flex justify-between items-center mb-3">
                              <select 
                                className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer appearance-none tracking-wider ${getTypeColor(task.type)}`}
                                value={task.type}
                                onChange={(e) => updateSubtask(activeCard.id, i, 'type', e.target.value)}
                              >
                                <option value="Backend">Backend</option>
                                <option value="Frontend">Frontend</option>
                                <option value="Testing">Testing</option>
                                <option value="DevOps">DevOps</option>
                                <option value="Docs">Docs</option>
                              </select>
                              <button onClick={() => removeSubtask(activeCard.id, i)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icons.X />
                              </button>
                           </div>
                           
                           {/* Row 2: Title */}
                           <input 
                              className="w-full bg-transparent text-sm text-gray-200 font-medium mb-3 focus:outline-none border-b border-transparent focus:border-gray-700 placeholder-gray-600"
                              value={task.title}
                              placeholder="Task title..."
                              onChange={(e) => updateSubtask(activeCard.id, i, 'title', e.target.value)}
                           />

                           {/* Row 3: Points */}
                           <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Est.</span>
                              <input 
                                type="number"
                                className="w-12 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-right text-gray-300 focus:border-clarity-500 focus:outline-none font-mono"
                                value={task.storyPoints}
                                onChange={(e) => updateSubtask(activeCard.id, i, 'storyPoints', parseInt(e.target.value) || 0)}
                              />
                              <span className="text-[10px] text-gray-500">SP</span>
                           </div>
                        </div>
                      ))}
                      {activeCard.subtasks.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-800/50 rounded-2xl">
                           <p className="text-xs text-gray-600">No implementation tasks yet.</p>
                        </div>
                      )}
                    </div>
                  </section>
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
             <div className="scale-150 mb-4 opacity-50"><Icons.Kanban /></div>
             <p className="text-sm font-light">Select an item from the backlog.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- VIEW: Export Manager (CSV) ---
const ExportManagerView = ({ cards }: { cards: ProjectCard[] }) => {
  const [delimiter, setDelimiter] = useState<',' | ';'>(';');
  const [columns, setColumns] = useState<CsvColumn[]>([
    { id: '1', header: 'Summary', field: 'title', enabled: true },
    { id: '2', header: 'Description', field: 'description', enabled: true },
    { id: '3', header: 'Story Points', field: 'totalStoryPoints', enabled: true },
    { id: '4', header: 'Issue Type', field: 'issue_type', enabled: true },
    { id: '5', header: 'Subtasks Count', field: 'subtasks_count', enabled: true },
  ]);

  const readyCards = cards.filter(c => c.status === 'Ready');

  const toggleColumn = (id: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const downloadCsv = () => {
    const enabledCols = columns.filter(c => c.enabled);
    const headerRow = enabledCols.map(c => `"${c.header}"`).join(delimiter);
    
    const bodyRows = readyCards.map(card => {
      return enabledCols.map(col => {
        let val = '';
        if (col.field === 'issue_type') val = 'Story';
        else if (col.field === 'subtasks_count') val = card.subtasks.length.toString();
        else val = String(card[col.field as keyof ProjectCard] || '');
        
        // Escape quotes
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(delimiter);
    }).join('\n');

    const csvContent = `${headerRow}\n${bodyRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clarity_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full p-8 flex flex-col">
       <div className="flex justify-between items-end mb-8">
         <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Export Manager</h2>
            <p className="text-gray-500 mt-2 font-light">{readyCards.length} items queued for export.</p>
         </div>
         <button 
            onClick={downloadCsv}
            disabled={readyCards.length === 0}
            className="bg-clarity hover:bg-clarity-600 text-white px-6 py-3 rounded-xl shadow-glow transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
         >
            <Icons.Download /> Download CSV
         </button>
       </div>

       <div className="flex gap-8 h-full overflow-hidden">
          {/* Configuration Panel */}
          <div className="w-72 flex flex-col gap-6">
             <div className="bg-gray-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Icons.Settings /> Configuration
                </h3>
                
                <div className="mb-6">
                  <label className="block text-xs text-gray-400 mb-3 font-medium">Delimiter</label>
                  <div className="flex bg-black/40 rounded-xl border border-white/5 p-1">
                    <button 
                      onClick={() => setDelimiter(',')}
                      className={`flex-1 text-xs py-2 rounded-lg transition-colors ${delimiter === ',' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >Comma (,)</button>
                    <button 
                      onClick={() => setDelimiter(';')}
                      className={`flex-1 text-xs py-2 rounded-lg transition-colors ${delimiter === ';' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >Semicolon (;)</button>
                  </div>
                </div>

                <div>
                   <label className="block text-xs text-gray-400 mb-3 font-medium">Included Columns</label>
                   <div className="space-y-2">
                     {columns.map(col => (
                       <label key={col.id} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors group">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${col.enabled ? 'bg-clarity-500 border-clarity-500' : 'border-gray-600 bg-transparent'}`}>
                             {col.enabled && <Icons.Check />}
                         </div>
                         <input 
                            type="checkbox" 
                            checked={col.enabled} 
                            onChange={() => toggleColumn(col.id)}
                            className="hidden"
                         />
                         <span className="font-light group-hover:text-white transition-colors">{col.header}</span>
                       </label>
                     ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Preview Table */}
          <div className="flex-1 bg-gray-900/40 border border-white/5 rounded-3xl flex flex-col overflow-hidden backdrop-blur-md shadow-2xl">
             <div className="p-4 border-b border-white/5 bg-black/20">
               <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Data Preview</span>
             </div>
             <div className="overflow-auto flex-1 scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/40 sticky top-0 backdrop-blur-md">
                    <tr>
                      {columns.filter(c => c.enabled).map(col => (
                        <th key={col.id} className="px-6 py-4 text-xs font-semibold text-gray-400 border-b border-white/5 whitespace-nowrap tracking-wider">
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {readyCards.map(card => (
                      <tr key={card.id} className="hover:bg-white/5 transition-colors">
                        {columns.filter(c => c.enabled).map(col => {
                           let val = '';
                           if (col.field === 'issue_type') val = 'Story';
                           else if (col.field === 'subtasks_count') val = card.subtasks.length.toString();
                           else val = String(card[col.field as keyof ProjectCard] || '');
                           
                           return (
                             <td key={col.id} className="px-6 py-4 text-xs text-gray-300 max-w-xs truncate border-r border-white/5 last:border-0 font-light">
                               {val}
                             </td>
                           );
                        })}
                      </tr>
                    ))}
                    {readyCards.length === 0 && (
                      <tr>
                        <td colSpan={columns.filter(c => c.enabled).length} className="px-6 py-12 text-center text-gray-600 text-sm font-light">
                          No data ready for export.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  );
}

export default function App() {
  const [activeStage, setActiveStage] = useState<Stage>(Stage.FREE_JAM);
  
  // --- Central Application State ---
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [nfrs, setNfrs] = useState<NFR[]>([]);
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]); // New state

  const renderContent = () => {
    switch (activeStage) {
      case Stage.FREE_JAM:
        return <FreeJamView 
          ideas={ideas} setIdeas={setIdeas} 
          attachments={attachments} setAttachments={setAttachments}
        />;
      case Stage.NON_FUNCTIONAL:
        return <NfrView nfrs={nfrs} setNfrs={setNfrs} />;
      case Stage.CARD_CREATION:
        return <CardCreationView cards={cards} setCards={setCards} ideas={ideas} nfrs={nfrs} />;
      case Stage.JIRA_EXPORT:
        return <ExportManagerView cards={cards} />;
      default:
        return null;
    }
  };

  const getIconForStage = (stageId: Stage) => {
      switch(stageId) {
          case Stage.FREE_JAM: return <Icons.Brain />;
          case Stage.NON_FUNCTIONAL: return <Icons.Shield />;
          case Stage.CARD_CREATION: return <Icons.Kanban />;
          case Stage.JIRA_EXPORT: return <Icons.Database />;
          default: return <Icons.Brain />;
      }
  }

  return (
    <div className="flex h-screen bg-[#030712] text-gray-100 overflow-hidden font-sans selection:bg-clarity-500/30 p-3 gap-3">
      
      {/* Floating Sidebar */}
      <aside className="w-20 lg:w-72 flex-shrink-0 bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col z-20 shadow-2xl transition-all duration-300">
        <div className="h-24 flex items-center gap-4 px-6 lg:px-8 border-b border-white/5">
           <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden group">
             <img src="/clarity_logo.png" alt="ClarityHub Logo" className="w-full h-full object-contain" />
           </div>
           <div className="hidden lg:flex flex-col">
              <span className="font-bold text-base tracking-wide text-white leading-none">CLARITY<span className="text-gray-500 font-light">HUB</span></span>
              <span className="text-[10px] text-clarity-400 font-medium tracking-widest mt-1">ENGINEERING AI</span>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-clarity-600 text-white shadow-lg shadow-clarity-900/50' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }
                `}
              >
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>}
                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{getIconForStage(stage.id)}</span>
                <div className="hidden lg:flex flex-col items-start text-left">
                  <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {stage.label}
                  </span>
                </div>
                {isActive && <div className="hidden lg:block ml-auto"><Icons.ChevronRight /></div>}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 hidden lg:block">
           <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                 <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">System Online</span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono mt-1">v2.5.0-ent</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-gray-900/30 backdrop-blur-md rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-clarity-500/50 to-transparent opacity-50"></div>
        <div className="flex-1 overflow-hidden relative z-10">
           {renderContent()}
        </div>
      </main>
    </div>
  );
}