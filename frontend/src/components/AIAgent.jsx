import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// ============================================================
// KNOWLEDGE BASE WITH ONE-CLICK ACTION LINKS
// ============================================================
const KNOWLEDGE_BASE = [
  // ============ SYSTEM GUIDE ============
  {
    keywords: ['system guide', 'app guide', 'complete info', 'show all features', 'overview', 'how does this work', 'documentation'],
    answer: `### 🏫 Gurukul System Overview\n\nHere is the complete structured guide to your application:\n\n### 1. Attendance & Visualizations\n• **Mark & Edit:** Admins can mark daily attendance or edit past logs.\n• **Monthly Grid Matrix:** Complete class attendance on a calendar grid.\n• **Student Analytics:** Month-by-month graphical trend charts per student.\n\n### 2. Student Directory\n• **Manage:** Register, search, filter, edit, or delete student profiles.\n• **Profiles:** Stores ID, Roll No, Phone, Parent Contact, DOB, and Address.\n\n### 3. Payment Sheet\n• **Excel-like Grid:** Live fee records, custom columns (e.g. Exam Fee).\n• **Keyboard Shortcut:** Press **Ctrl + S** to instantly save payment changes.\n\n### 4. Reports & Data Exports\n• Export monthly class summaries or the entire institute database to Excel.\n\n### 5. Database Backup & Security\n• **Manual & Auto Backups:** Secure snapshot downloads to prevent data loss.\n• **Faculty App Access:** Grant or revoke Android app attendance access.`,
    action: { label: '📊 Go to Dashboard', path: '/' },
  },

  // ============ DATABASE BACKUP ============
  {
    keywords: ['backup', 'database backup', 'data backup', 'restore', 'save database', 'download backup', 'backup settings', 'export db'],
    answer: `### 💾 Database Backup & Data Protection\n\nKeep your institute's data safe from accidental loss:\n\n1. Go to **Settings -> Database Backup**.\n2. **Manual Snapshot:** Click **"Download Backup"** to export an encrypted snapshot of all students, attendance, and fee history.\n3. **Automated Reminders:** Admin prompts remind you periodically to take fresh backups.\n4. **Safe Storage:** Store backup files safely on an external drive or cloud storage.\n\n🛡️ *Best Practice: Download a backup once every week!*`,
    action: { label: '💾 Open Backup Settings', path: '/settings/backup' },
  },

  // ============ VISUALIZATIONS & CHARTS ============
  {
    keywords: ['visualization', 'graph', 'analytics', 'chart', 'monthly grid', 'attendance graph', 'visualize', 'trends'],
    answer: `### 📊 Visualizations & Analytics\n\nGurukul provides two interactive visual analytical tools:\n\n### 1. Monthly Grid View\n• View the full month's attendance matrix for any class and board.\n• Color-coded indicators: 🟢 Present, 🔴 Absent, 🟡 Late.\n\n### 2. Student Monthly Graphs\n• Track individual student attendance percentage trends over time.\n• Spot chronic absenteeism patterns early.`,
    action: { label: '📊 Open Monthly Grid View', path: '/attendance/monthly' },
  },
  {
    keywords: ['student graph', 'student monthly', 'student chart', 'individual graph', 'student trend'],
    answer: `### 📈 Student-Wise Attendance Analytics\n\n1. Open **Student Monthly Analytics**.\n2. Select a Student and the Academic Year.\n3. View a clean visual trend graph of their month-by-month attendance rate.`,
    action: { label: '📈 View Student Analytics', path: '/attendance/student' },
  },

  // ============ STUDENT DIRECTORY ============
  {
    keywords: ['student list', 'view students', 'find student', 'search student', 'student directory', 'filter students', 'all students'],
    answer: `### 👨‍🎓 Student Directory & Management\n\n1. Go to **Students** section.\n2. **Search & Filter:** Instantly filter students by Name, Roll No, Class, or Board.\n3. **Actions:**\n   • ✏️ **Edit:** Update phone numbers, parent contacts, or addresses.\n   • 📈 **Analytics:** Check the student's individual attendance history.\n   • 🗑️ **Delete:** Remove student records permanently.`,
    action: { label: '👨‍🎓 Open Student Directory', path: '/students' },
  },
  {
    keywords: ['add student', 'register student', 'new student', 'create student'],
    answer: `### ➕ Register a New Student\n\n1. Go to the **Students** section.\n2. Click **"Add Student"**.\n3. Fill in ID, Full Name, Class, Board, Phone, and Parent details.\n4. Click **Save** to automatically enroll them in the class register.`,
    action: { label: '➕ Register Student Now', path: '/students/register' },
  },

  // ============ ATTENDANCE ============
  {
    keywords: ['mark attendance', 'how to mark', 'take attendance', 'daily attendance'],
    answer: `### 📋 How to Mark Daily Attendance\n\n1. Go to the **Attendance** section.\n2. Select **Class** and **Board**.\n3. Choose the **date** (defaults to today).\n4. Click **Load**.\n5. Mark students as Present / Absent / Late.\n6. Click **Save Attendance**.`,
    action: { label: '📋 Open Attendance View', path: '/attendance' },
  },
  {
    keywords: ['edit attendance', 'wrong attendance', 'update attendance'],
    answer: `### ✏️ Editing Historical Attendance\n\n1. Open **Attendance** section.\n2. Select the Class, Board, and target past date.\n3. Click **Load**, modify statuses, and click Save.\n\n⚠️ *Only Admins have permission to edit past dates.*`,
    action: { label: '📋 Go to Attendance', path: '/attendance' },
  },

  // ============ REPORTS & EXPORT ============
  {
    keywords: ['export report', 'download excel', 'monthly report', 'export data', 'excel sheet'],
    answer: `### 📥 Exporting Reports & Excel\n\n**1. Monthly Summary:**\n• Go to Reports -> "📅 Monthly Summary"\n• Select Class, Month, Year -> Click **Export Excel**.\n\n**2. Complete School Master Sheet:**\n• Go to "🏫 Export All Data" tab.\n• Downloads full school profiles, attendance totals, and student registries.`,
    action: { label: '📥 Open Reports Section', path: '/reports' },
  },

  // ============ PAYMENT SHEET ============
  {
    keywords: ['payment', 'fees', 'payment sheet', 'fee status'],
    answer: `### 💰 Payment & Fee Management\n\n1. Go to **Payment** section.\n2. Click **"Edit Sheet"** to make updates.\n3. Add fee payments, switch between sessions, or add custom fee columns.\n\n⌨️ **Press Ctrl + S** to instantly save all fee changes!`,
    action: { label: '💰 Open Payment Sheet', path: '/payments' },
  },
  {
    keywords: ['ctrl+s', 'ctrl s', 'save shortcut'],
    answer: `### ⌨️ Quick Save Shortcut\n\nPress **Ctrl + S** (Windows) or **Cmd + S** (Mac) while editing the Payment Sheet to instantly commit changes to the database securely. 🚀`,
    action: { label: '💰 Go to Payment Sheet', path: '/payments' },
  },

  // ============ ADMIN SETTINGS & FACULTY ============
  {
    keywords: ['add admin', 'create admin', 'new admin', 'trust', 'multiple admins'],
    answer: `### 🛡️ Admin Management & Security\n\n1. Go to **Settings**.\n2. Under **Admin Management**, click **"Add Admin"**.\n3. Fill in Name, Email/ID, and Temporary Password.\n\n🚨 **SECURITY NOTICE:** Admins hold full privileges over Institute Data and Fee Sheets. Only grant Admin access to verified, trusted staff.`,
    action: { label: '⚙️ Open Settings', path: '/settings' },
  },
  {
    keywords: ['change password', 'update id', 'change email', 'update credentials'],
    answer: `### ⚙️ Update Admin Password / Login ID\n\n1. Go to **Settings** from the sidebar.\n2. **Change ID:** Update your Login ID under Profile.\n3. **Change Password:** Scroll to "Security & Password", verify current password, and set your new password.`,
    action: { label: '⚙️ Change Password Now', path: '/settings' },
  },
  {
    keywords: ['add faculty', 'teacher access', 'android app', 'deny access', 'revoke access', 'faculty'],
    answer: `### 👨‍🏫 Faculty App Management\n\nControl which teachers can take attendance using the Android Mobile App:\n\n1. Go to **Faculty Access**.\n2. Toggle switches On/Off to grant or revoke app access instantly.`,
    action: { label: '👨‍🏫 Manage Faculty Access', path: '/faculty-access' },
  },

  // ============ GENERAL HELP ============
  {
    keywords: ['hi', 'hello', 'hey', 'help', 'start'],
    answer: `### 👋 Hello!\n\nI am your Gurukul Assistant. Ask me about **Backups**, **Visual Analytics**, **Student Directory**, **Attendance**, or click one of the quick shortcuts below!`,
  },
];

// ============================================================
// SMART MATCHING ENGINE
// ============================================================
const findBestAnswer = (query) => {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let bestMatch = null;
  let highestScore = 0;

  KNOWLEDGE_BASE.forEach((item) => {
    let score = 0;
    item.keywords.forEach((keyword) => {
      const kw = keyword.toLowerCase();
      if (q.includes(kw)) score += kw.length;
      else {
        const words = kw.split(' ');
        words.forEach((word) => {
          if (word.length > 3 && q.includes(word)) score += word.length / 2;
        });
      }
    });
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  });

  if (highestScore < 3) {
    return {
      answer: `🤔 I didn't quite catch that. Try asking about:\n\n• "💾 Database Backup"\n• "📊 Visualizations & Charts"\n• "👨‍🎓 Student Directory"\n• "📋 Mark Attendance"\n• "💰 Payment Sheet Help"`,
    };
  }
  return bestMatch;
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const AIAgent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Welcome Greeting
  useEffect(() => {
    const greetingText = `### 👋 Welcome back, ${user?.name || 'Admin'}!\n\nI am your smart assistant for Gurukul Academy. How can I help you today?`;
    setMessages([
      {
        from: 'bot',
        text: greetingText,
        time: new Date(),
      },
    ]);
  }, [user]);

  // Dynamic contextual suggestions based on current active route
  const getPageSuggestions = () => {
    const path = location.pathname;

    if (path.includes('/settings')) {
      return ['💾 Database Backup', '🛡️ Add New Admin', '⚙️ Change Password', '👨‍🏫 Faculty Access'];
    }
    if (path.includes('/payments')) {
      return ['💰 Payment Help', '⌨️ Save Shortcut (Ctrl+S)', '📥 Export Reports'];
    }
    if (path.includes('/attendance')) {
      return ['📊 Monthly Grid View', '📈 Student Chart', '📋 Mark Attendance', '✏️ Edit Attendance'];
    }
    if (path.includes('/students')) {
      return ['👨‍🎓 Student Directory', '➕ Register Student', '📈 Student Analytics'];
    }
    return [
      '📖 System Guide',
      '💾 Database Backup',
      '📊 Visualizations',
      '👨‍🎓 Student List',
      '💰 Payment Help',
    ];
  };

  const currentSuggestions = getPageSuggestions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, isOpen]);

  const sendMessage = (text) => {
    const query = text || input.trim();
    if (!query) return;

    const userMsg = { from: 'user', text: query, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const result = findBestAnswer(query);
      const botMsg = {
        from: 'bot',
        text: result?.answer || "Sorry, I couldn't understand. Can you rephrase?",
        action: result?.action || null,
        time: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, 400 + Math.random() * 250);
  };

  const triggerGuide = () => {
    if (!isOpen) setIsOpen(true);
    sendMessage("System Guide");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Structured Text Formatter
  const formatText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />;
      
      if (line.startsWith('### ')) {
        return <div key={i} style={styles.chatHeader}>{line.substring(4)}</div>;
      }
      
      if (line.startsWith('---')) {
        return <hr key={i} style={styles.chatDivider} />;
      }

      if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.substring(2);
        return (
          <div key={i} style={styles.chatBullet}>
            <span style={styles.bulletDot}>•</span>
            <span>{parseBold(content)}</span>
          </div>
        );
      }

      return <div key={i} style={styles.chatNormal}>{parseBold(line)}</div>;
    });
  };

  const parseBold = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} style={{ fontWeight: 700, color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  const styles = {
    chatHeader: {
      fontSize: '14px', fontWeight: 800, color: '#1e293b', 
      marginTop: '10px', marginBottom: '6px', letterSpacing: '-0.2px'
    },
    chatNormal: { fontSize: '13px', lineHeight: 1.6, color: '#334155' },
    chatBullet: { 
      display: 'flex', alignItems: 'flex-start', gap: '6px', 
      fontSize: '13px', lineHeight: 1.6, color: '#334155', marginBottom: '4px' 
    },
    bulletDot: { color: '#4f46e5', fontWeight: 900 },
    chatDivider: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' },

    floatBtn: {
      position: 'fixed', bottom: '90px', right: '24px',
      width: '60px', height: '60px', borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
      color: '#fff', border: 'none', cursor: 'pointer',
      boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, transition: 'all 0.3s ease',
      animation: isOpen ? 'none' : 'floatBounce 3s infinite ease-in-out',
    },
    botIconWrapper: {
      width: '30px', height: '30px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },

    chatWindow: {
      position: 'fixed', bottom: '94px', right: '24px',
      width: '420px', maxWidth: 'calc(100vw - 32px)',
      height: '640px', maxHeight: 'calc(100vh - 120px)',
      backgroundColor: '#ffffff', borderRadius: '24px',
      boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      zIndex: 9999, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    },

    header: {
      padding: '16px 20px',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
    },
    avatar: {
      width: '40px', height: '40px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.1)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '22px',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: '15px', fontWeight: 800, letterSpacing: '-0.2px' },
    headerSub: { fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' },
    onlineDot: { width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)' },
    
    headerActions: { display: 'flex', gap: '8px', alignItems: 'center' },
    guideBtn: {
      background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
      padding: '5px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
      transition: 'background 0.2s',
    },
    closeBtn: {
      width: '30px', height: '30px', borderRadius: '8px',
      background: 'transparent', border: 'none', color: '#94a3b8',
      cursor: 'pointer', fontSize: '18px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s',
    },

    messagesWrap: {
      flex: 1, overflowY: 'auto', padding: '20px 18px',
      backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px',
    },
    msgRow: (isUser) => ({
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: '10px',
    }),
    msgAvatar: {
      width: '28px', height: '28px', borderRadius: '8px',
      background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', flexShrink: 0, marginTop: '2px',
    },
    bubble: (isUser) => ({
      maxWidth: '85%', padding: isUser ? '10px 15px' : '14px 16px',
      borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
      backgroundColor: isUser ? '#4f46e5' : '#ffffff',
      color: isUser ? '#ffffff' : '#1e293b',
      boxShadow: isUser ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 10px rgba(0,0,0,0.03)',
      border: isUser ? 'none' : '1px solid #e2e8f0',
      wordBreak: 'break-word',
    }),

    actionBtn: {
      marginTop: '10px',
      width: '100%',
      padding: '9px 12px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      color: '#ffffff',
      border: 'none',
      fontSize: '12.5px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      boxShadow: '0 3px 10px rgba(79, 70, 229, 0.25)',
      transition: 'transform 0.15s ease',
    },

    typingBubble: {
      padding: '14px', backgroundColor: '#ffffff', borderRadius: '4px 16px 16px 16px',
      border: '1px solid #e2e8f0', display: 'flex', gap: '5px', alignItems: 'center',
    },
    typingDot: (delay) => ({
      width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#94a3b8',
      animation: `typingPulse 1.4s infinite ease-in-out`, animationDelay: `${delay}s`,
    }),

    suggestions: {
      padding: '10px 16px', backgroundColor: '#ffffff', display: 'flex',
      gap: '6px', overflowX: 'auto', flexShrink: 0, borderTop: '1px solid #e2e8f0',
    },
    suggestionChip: {
      padding: '6px 12px', borderRadius: '16px', background: '#f8fafc',
      color: '#334155', border: '1px solid #e2e8f0', fontSize: '11.5px',
      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
    },

    inputArea: {
      padding: '12px 16px', backgroundColor: '#ffffff', display: 'flex',
      alignItems: 'center', flexShrink: 0, borderTop: '1px solid #e2e8f0',
    },
    inputWrapper: {
      flex: 1, display: 'flex', alignItems: 'center',
      backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
      borderRadius: '20px', padding: '4px 4px 4px 14px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    input: {
      flex: 1, border: 'none', outline: 'none', background: 'transparent',
      fontSize: '13.5px', color: '#1e293b', fontFamily: 'inherit',
    },
    sendBtn: (disabled) => ({
      width: '32px', height: '32px', borderRadius: '50%',
      background: disabled ? '#cbd5e1' : '#4f46e5',
      color: '#fff', border: 'none', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'all 0.2s',
      boxShadow: disabled ? 'none' : '0 3px 8px rgba(79, 70, 229, 0.3)',
    }),
  };

  return (
    <>
      <style>{`
        @keyframes floatBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.96) translateY(16px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes typingPulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .ai-btn-hover:hover { transform: scale(1.06); }
        .ai-close-hover:hover { color: #fff !important; }
        .ai-guide-btn:hover { background: rgba(255,255,255,0.25) !important; }
        .ai-chip-hover:hover { background: #4f46e5 !important; color: #fff !important; border-color: #4f46e5 !important; }
        .ai-input-focus:focus-within { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important; }
        .ai-action-btn:hover { transform: translateY(-1.5px); }
        
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Floating Button */}
      {!isOpen && (
        <button
          style={styles.floatBtn}
          className="ai-btn-hover"
          onClick={() => setIsOpen(true)}
        >
          <div style={styles.botIconWrapper}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" />
              <rect x="4" y="8" width="16" height="12" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.chatWindow}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.avatar}>🤖</div>
            <div style={styles.headerText}>
              <div style={styles.headerTitle}>Gurukul AI Support</div>
              <div style={styles.headerSub}>
                <span style={styles.onlineDot}></span> Online
              </div>
            </div>
            <div style={styles.headerActions}>
              <button 
                style={styles.guideBtn} 
                className="ai-guide-btn"
                onClick={triggerGuide}
                title="View Complete System Guide"
              >
                📖 App Guide
              </button>
              <button style={styles.closeBtn} className="ai-close-hover" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messagesWrap} className="custom-scroll">
            {messages.map((m, i) => (
              <div key={i} style={styles.msgRow(m.from === 'user')}>
                {m.from === 'bot' && <div style={styles.msgAvatar}>🤖</div>}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={styles.bubble(m.from === 'user')}>
                    {m.from === 'user' ? m.text : formatText(m.text)}

                    {/* Action Button inside Chat Bubble */}
                    {m.action && (
                      <button
                        style={styles.actionBtn}
                        className="ai-action-btn"
                        onClick={() => {
                          navigate(m.action.path);
                          setIsOpen(false);
                        }}
                      >
                        {m.action.label}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                    {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div style={styles.msgRow(false)}>
                <div style={styles.msgAvatar}>🤖</div>
                <div style={styles.typingBubble}>
                  <div style={styles.typingDot(0)}></div>
                  <div style={styles.typingDot(0.2)}></div>
                  <div style={styles.typingDot(0.4)}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Page-Aware Dynamic Suggestions */}
          <div style={styles.suggestions} className="custom-scroll">
            {currentSuggestions.map((s, i) => (
              <button
                key={i}
                className="ai-chip-hover"
                style={styles.suggestionChip}
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <div style={styles.inputWrapper} className="ai-input-focus">
              <input
                type="text"
                style={styles.input}
                placeholder="Ask about backups, charts, students..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <button
                style={styles.sendBtn(!input.trim())}
                onClick={() => sendMessage()}
                disabled={!input.trim()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAgent;