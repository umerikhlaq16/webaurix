import React, { useState, useEffect, useMemo, useRef } from "react";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Helmet } from "react-helmet-async";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from "firebase/firestore";

/* ── Cloudinary config (set in .env) ── */
const CLD_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const uploadToCloudinary = async (file) => {
  const fd = new FormData();
  fd.append("file",           file);
  fd.append("upload_preset",  CLD_PRESET);
  fd.append("folder",         "webaurix-blog");
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method:"POST", body:fd });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
};
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import logoLight from "../assets/logo-light.png";
import logoDark  from "../assets/logo-dark.png";
import logoIcon  from "../assets/logo-icon.png";
import {
  LayoutDashboard, Briefcase, CalendarCheck, UserCheck, Mail, MessageSquare,
  LogOut, Search, X, Menu, RefreshCw, ChevronRight, ArrowUpRight,
  TrendingUp, Eye, EyeOff, ShieldX, Activity, Clock, FileText,
  Plus, Trash2, Edit3, Globe, EyeOff as EyeOffIcon, Image, MoveUp,
  MoveDown, AlignLeft, List, Heading, ToggleLeft, ToggleRight,
  Save, Upload, CheckCircle2, AlertTriangle, Sun, Moon, Layers,
  Palette, Tag, Calendar, Zap, ClipboardList, Bot, Send,
  Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";

/* ── ONLY this email can access ── */
const ADMIN_EMAIL = "umerikhlaq160@gmail.com";

/* ── Palettes ── */
const DARK_C = {
  bg:"#0b0b0d", sidebar:"#080809", card:"#111113", card2:"#17171a",
  border:"rgba(255,255,255,0.055)", hover:"rgba(255,255,255,0.04)",
  P:"#f0eeec", M:"rgba(240,238,236,0.42)",
  A:"#68b5cc", Adim:"rgba(104,181,204,0.11)", Aglow:"rgba(104,181,204,0.22)",
  amber:"#fbbf24", red:"#f87171", blue:"#60a5fa", purple:"#c084fc", teal:"#2dd4bf",
};
const LIGHT_C = {
  bg:"#f1f5f9", sidebar:"#ffffff", card:"#ffffff", card2:"#f0f4f8",
  border:"rgba(0,0,0,0.09)", hover:"rgba(0,0,0,0.035)",
  P:"#0f172a", M:"rgba(15,23,42,0.5)",
  A:"#0e7490", Adim:"rgba(14,116,144,0.1)", Aglow:"rgba(14,116,144,0.18)",
  amber:"#d97706", red:"#dc2626", blue:"#2563eb", purple:"#7c3aed", teal:"#0d9488",
};
/* mutable - updated by AdminPanel before each render so all sub-components get current theme */
let C = { ...DARK_C };

/* ── helpers ── */
const fmt = (ts) => {
  if (!ts) return "-";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})
    + " · " + d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
};
const isToday  = (ts) => { if (!ts) return false; const d=ts?.toDate?ts.toDate():new Date(ts); return d.toDateString()===new Date().toDateString(); };
const getTs    = (item) => item.timestamp || item.createdAt;
const thisWeek = (ts)  => { if (!ts) return false; const d=ts?.toDate?ts.toDate():new Date(ts); return (Date.now()-d)<7*86400000; };

const getDailyCounts = (items, n = 14) => {
  const counts = new Array(n).fill(0);
  items.forEach(item => {
    const ts = getTs(item);
    if (!ts) return;
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const daysAgo = Math.floor((Date.now() - d) / 86400000);
    if (daysAgo >= 0 && daysAgo < n) counts[n - 1 - daysAgo]++;
  });
  return counts;
};

/* ════════════════════════════════════
   DONUT CHART (SVG)
════════════════════════════════════ */
const DonutChart = ({ segments, size = 190, thickness = 30 }) => {
  const r    = size / 2 - thickness / 2 - 4;
  const cx   = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, g) => s + (g.value || 0), 0);
  let cumLen = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {total > 0 && (
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {segments.map((seg, i) => {
            const full = (seg.value / total) * circ;
            const vis  = full * 0.95;
            const doff = -cumLen;
            cumLen += full;
            return (
              <motion.circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.color} strokeWidth={thickness}
                strokeDasharray={`${vis} ${circ}`}
                strokeDashoffset={doff} strokeLinecap="butt"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + i * 0.14, duration: 0.45 }}
              />
            );
          })}
        </g>
      )}
      <motion.text x={cx} y={cy - 11} textAnchor="middle"
        fill={C.P} fontSize="30" fontWeight="800" fontFamily="inherit"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        {total}
      </motion.text>
      <motion.text x={cx} y={cy + 13} textAnchor="middle"
        fill={C.M} fontSize="11" fontFamily="inherit"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
        total
      </motion.text>
    </svg>
  );
};

/* ════════════════════════════════════
   AREA CHART (SVG)
════════════════════════════════════ */
const AreaChart = ({ data, color = C.A, h = 90 }) => {
  const W = 400;
  if (!data?.length) return <div style={{ height: h }} />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * W,
    h - 4 - (v / max) * (h - 12),
  ]);
  const line = `M ${pts.map(([x, y]) => `${x},${y}`).join(" L ")}`;
  const area = `M 0,${h} L ${pts.map(([x, y]) => `${x},${y}`).join(" L ")} L ${W},${h} Z`;
  const gid  = `ag${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${gid})`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinejoin="round" strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4"
        fill={color} stroke={C.card} strokeWidth="2" />
    </svg>
  );
};

/* ════════════════════════════════════
   SPARKLINE
════════════════════════════════════ */
const Sparkline = ({ data, color = C.A, h = 38, w = 90 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * w,
    h - 2 - (v / max) * (h - 4),
  ]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={`M ${pts.map(([x, y]) => `${x},${y}`).join(" L ")}`}
        fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
};

/* ════════════════════════════════════
   BADGE
════════════════════════════════════ */
const Badge = ({ label, color }) => (
  <span className="px-2 py-[2px] rounded-full text-[10px] font-bold tracking-wide flex-shrink-0"
    style={{ background:`${color}18`, color, border:`1px solid ${color}28` }}>
    {label}
  </span>
);

/* ════════════════════════════════════
   COUNT UP
════════════════════════════════════ */
const CountUp = ({ target, duration = 1.4 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let f = 0; const steps = 36; const inc = target / steps;
    const iv = setInterval(() => {
      f += inc;
      if (f >= target) { setVal(target); clearInterval(iv); }
      else setVal(Math.floor(f));
    }, (duration * 1000) / steps);
    return () => clearInterval(iv);
  }, [target]);
  return <>{val}</>;
};

/* ════════════════════════════════════
   LOGIN SCREEN
════════════════════════════════════ */
const LoginScreen = () => {
  const [email, setEmail]       = useState("");
  const [pass,  setPass]        = useState("");
  const [show,  setShow]        = useState(false);
  const [err,   setErr]         = useState("");
  const [denied,setDenied]      = useState(false);
  const [loading,setLoading]    = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setDenied(false); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        await signOut(auth); setDenied(true);
      }
    } catch { setErr("Invalid email or password."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden"
      style={{ background: C.bg }}>
      {/* bg glow */}
      <div className="absolute inset-x-0 top-0 h-96 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(104,181,204,0.1), transparent)" }} />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] relative z-10">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <img src={logoIcon} alt="" className="h-10 w-auto" />
          <img src={logoLight} alt="Webaurix" className="h-7 w-auto" style={{ filter: "none" }} />
        </div>

        <div className="rounded-3xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: C.Adim }}>
            <ShieldX size={20} style={{ color: C.A }} />
          </div>
          <h1 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Admin Access</h1>
          <p className="text-[13px] mb-7" style={{ color: C.M }}>Restricted - authorized personnel only.</p>

          <form onSubmit={submit} className="space-y-4">
            {/* email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold" style={{ color: C.M }}>Email</label>
              <input type="email" value={email} placeholder="your@gmail.com"
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-[13px] outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: C.P, transition: "border-color 0.15s" }}
                onFocus={e => { e.target.style.borderColor = C.A; }}
                onBlur={e  => { e.target.style.borderColor = C.border; }} />
            </div>
            {/* password + eye */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold" style={{ color: C.M }}>Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={pass} placeholder="••••••••"
                  onChange={e => setPass(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: C.P, transition: "border-color 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = C.A; }}
                  onBlur={e  => { e.target.style.borderColor = C.border; }} />
                <button type="button" onClick={() => setShow(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: C.M, transition: "color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.P; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.M; }}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {(err || denied) && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: `${C.red}10`, border: `1px solid ${C.red}22` }}>
                  <ShieldX size={13} style={{ color: C.red, flexShrink: 0 }} />
                  <p className="text-[12px]" style={{ color: C.red }}>
                    {denied ? "Access denied. This account is not authorized." : err}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl text-[13.5px] font-bold mt-2 flex items-center justify-center gap-2"
              style={{ background: C.A, color: "#060d10", boxShadow: `0 6px 28px ${C.Aglow}` }}>
              {loading
                ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 rounded-full border-current border-t-transparent" />Signing in…</>
                : "Sign In"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

/* ════════════════════════════════════
   DETAIL MODAL
════════════════════════════════════ */
const DetailModal = ({ item, fields, title, extra, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
    onClick={onClose}>
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-[540px] max-h-[82vh] overflow-y-auto rounded-3xl [&::-webkit-scrollbar]:hidden"
      style={{ background: C.card, border: `1px solid ${C.border}`, scrollbarWidth:"none" }}>
      <div className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: `1px solid ${C.border}` }}>
        <h3 className="text-[15px] font-bold" style={{ color: C.P }}>{title}</h3>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: C.hover, color: C.M }}><X size={13} /></motion.button>
      </div>
      <div className="px-6 py-5 space-y-3.5">
        {fields.map(({ label, value, accent }) => value ? (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: C.M }}>{label}</span>
            <span className="text-[13px] leading-[1.7]" style={{ color: accent ? C.A : C.P }}>{value}</span>
          </div>
        ) : null)}
        {extra}
      </div>
    </motion.div>
  </motion.div>
);

/* ════════════════════════════════════
   STAT CARD
════════════════════════════════════ */
const StatCard = ({ icon, label, value, weekVal, color, sparkData, delay }) => {
  const pct = weekVal > 0 ? Math.round((weekVal / Math.max(value, 1)) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = C.card2; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}>
      {/* subtle corner glow */}
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 20%, ${color}10, transparent 70%)` }} />
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
          style={{ background: `${color}12`, color }}>
          <TrendingUp size={10} />
          +{weekVal} this week
        </div>
      </div>
      <div>
        <p className="text-[34px] font-black leading-none tracking-tight" style={{ color: C.P }}>
          <CountUp target={value} />
        </p>
        <p className="text-[12px] font-semibold mt-1" style={{ color: C.M }}>{label}</p>
      </div>
      {sparkData && (
        <div className="mt-auto">
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </motion.div>
  );
};

/* ════════════════════════════════════
   DATA TABLE
════════════════════════════════════ */
const DataTable = ({ columns, rows, emptyMsg, renderDetail }) => {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [rows, search]);

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-[340px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.M }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.P }}
            onFocus={e => { e.target.style.borderColor = C.A; }}
            onBlur={e  => { e.target.style.borderColor = C.border; }} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.M }}><X size={13} /></button>}
        </div>
        <span className="text-[12px] font-semibold" style={{ color: C.M }}>{filtered.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-2xl [&::-webkit-scrollbar]:hidden" style={{ border: `1px solid ${C.border}`, scrollbarWidth:"none" }}>
        <div style={{ minWidth: "520px" }}>
          <div className="grid text-[10px] font-bold tracking-[0.14em] uppercase px-5 py-3"
            style={{ gridTemplateColumns:`${columns.map(c=>c.width||"1fr").join(" ")} 40px`,
              background: C.card2, borderBottom:`1px solid ${C.border}`, color:C.M }}>
            {columns.map(c => <span key={c.key}>{c.label}</span>)}
            <span />
          </div>
          {filtered.length === 0
            ? <div className="px-5 py-12 text-center text-[13px]" style={{ color: C.M }}>{emptyMsg}</div>
            : filtered.map((row, i) => (
              <motion.div key={row.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid items-center px-5 py-3.5 cursor-pointer"
                style={{ gridTemplateColumns:`${columns.map(c=>c.width||"1fr").join(" ")} 40px`,
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  transition: "background 0.12s ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => setSelected(row)}>
                {columns.map(c => (
                  <div key={c.key} className="min-w-0 pr-3">
                    {c.render ? c.render(row[c.key], row)
                      : <span className="text-[12.5px] truncate block" style={{ color: c.accent ? C.A : C.P }}>{row[c.key] || "-"}</span>}
                  </div>
                ))}
                <div className="flex items-center justify-center">
                  <ChevronRight size={12} style={{ color: C.M }} />
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && renderDetail && (
          <DetailModal {...renderDetail(selected)} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

/* ════════════════════════════════════
   RIGHT PANEL
════════════════════════════════════ */
const RightPanel = ({ inquiries, consultations, applications, waitlist }) => {
  const all = useMemo(() => {
    const tag = (arr, type, color) => arr.map(r => ({ ...r, _type: type, _color: color }));
    return [
      ...tag(inquiries,     "Inquiry",     C.A),
      ...tag(consultations, "Consult",     C.blue),
      ...tag(applications,  "Application", C.purple),
      ...tag(waitlist,      "Waitlist",    C.amber),
    ].sort((a, b) => {
      const ta = getTs(a); const tb = getTs(b);
      const da = ta?.toDate ? ta.toDate() : new Date(ta || 0);
      const db2= tb?.toDate ? tb.toDate() : new Date(tb || 0);
      return db2 - da;
    }).slice(0, 8);
  }, [inquiries, consultations, applications, waitlist]);

  const todayCount = all.filter(r => isToday(getTs(r))).length;

  const name = (r) => {
    if (r.name) return r.name;
    if (r.firstName) return `${r.firstName} ${r.lastName || ""}`.trim();
    return r.email || "-";
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400)return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ borderLeft: `1px solid ${C.border}`, background: C.sidebar, scrollbarWidth:"none" }}>
      {/* header */}
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-bold" style={{ color: C.P }}>Recent Activity</p>
          {todayCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${C.A}18`, color: C.A }}>
              {todayCount} today
            </span>
          )}
        </div>
        <p className="text-[11.5px]" style={{ color: C.M }}>Latest submissions across all forms</p>
      </div>

      {/* activity list */}
      <div className="flex-1 px-4 py-3 space-y-1">
        {all.length === 0 ? (
          <p className="text-[12px] text-center py-8" style={{ color: C.M }}>No submissions yet</p>
        ) : all.map((r, i) => (
          <motion.div key={r.id || i}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.055, duration: 0.35, ease: [0.22,1,0.36,1] }}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ transition: "background 0.12s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.hover; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            {/* avatar */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-black"
              style={{ background: `${r._color}18`, color: r._color }}>
              {(name(r) || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate leading-snug" style={{ color: C.P }}>{name(r)}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold px-1.5 py-[1px] rounded-md"
                  style={{ background: `${r._color}15`, color: r._color }}>{r._type}</span>
                <span className="text-[10.5px]" style={{ color: C.M }}>{timeAgo(getTs(r))}</span>
              </div>
            </div>
            {isToday(getTs(r)) && (
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: C.A }} />
            )}
          </motion.div>
        ))}
      </div>

      {/* quick summary */}
      <div className="px-5 py-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase mb-3" style={{ color: C.M }}>Quick Summary</p>
        {[
          { label: "Inquiries",    val: inquiries.length,     color: C.A      },
          { label: "Consults",     val: consultations.length, color: C.blue   },
          { label: "Applications", val: applications.length,  color: C.purple },
          { label: "Waitlist",     val: waitlist.length,      color: C.amber  },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[12px]" style={{ color: C.M }}>{label}</span>
            </div>
            <span className="text-[12px] font-bold" style={{ color: C.P }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════
   BLOGS TAB
════════════════════════════════════ */
const BlogsTab = ({ posts, onNew, onEdit, onDelete, onTogglePublish }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | published | draft

  const filtered = useMemo(() => {
    let arr = posts;
    if (filter === "published") arr = arr.filter(p => p.published);
    if (filter === "draft")     arr = arr.filter(p => !p.published);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(p => (p.title+p.label+p.author).toLowerCase().includes(q));
    }
    return arr;
  }, [posts, search, filter]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Blog Posts</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Create, edit, and publish blog posts.</p>
        </div>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold"
          style={{ background: C.A, color:"#060d10" }}>
          <Plus size={15} /> New Post
        </motion.button>
      </div>

      {/* filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:C.M }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search posts…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.P }}
            onFocus={e=>{ e.target.style.borderColor=C.A; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }} />
          {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:C.M}}><X size={13}/></button>}
        </div>
        {["all","published","draft"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold capitalize"
            style={{ background: filter===f ? `${C.A}15` : C.card,
              color: filter===f ? C.A : C.M,
              border: `1px solid ${filter===f ? `${C.A}30` : C.border}`,
              transition:"all 0.12s ease" }}>
            {f === "all" ? `All (${posts.length})` : f === "published" ? `Published (${posts.filter(p=>p.published).length})` : `Drafts (${posts.filter(p=>!p.published).length})`}
          </button>
        ))}
      </div>

      {/* posts list */}
      <div className="overflow-x-auto rounded-2xl [&::-webkit-scrollbar]:hidden" style={{ border:`1px solid ${C.border}`, scrollbarWidth:"none" }}>
        <div style={{ minWidth:"640px" }}>
          <div className="grid text-[10px] font-bold tracking-[0.14em] uppercase px-5 py-3"
            style={{ gridTemplateColumns:"60px 1fr 140px 100px 80px 100px",
              background:C.card2, borderBottom:`1px solid ${C.border}`, color:C.M }}>
            <span>Cover</span><span>Title</span><span>Category</span><span>Author</span><span>Status</span><span>Actions</span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-center py-14 text-[13px]" style={{ color:C.M }}>
              {posts.length===0 ? "No posts yet - create your first one!" : "No posts match your search."}
            </p>
          ) : filtered.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.025 }}
              className="grid items-center px-5 py-3"
              style={{ gridTemplateColumns:"60px 1fr 140px 100px 80px 100px",
                borderBottom: i<filtered.length-1 ? `1px solid ${C.border}` : "none",
                transition:"background 0.12s ease" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=C.hover; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
              {/* cover */}
              <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0"
                style={{ background:C.card2, border:`1px solid ${C.border}` }}>
                {post.image
                  ? <img src={post.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Image size={12} style={{color:C.M}} /></div>}
              </div>
              {/* title */}
              <div className="min-w-0 px-3">
                <p className="text-[12.5px] font-semibold truncate" style={{ color:C.P }}>{post.title}</p>
                <p className="text-[11px] truncate" style={{ color:C.M }}>{post.date || "-"}</p>
              </div>
              {/* category */}
              <div className="pr-3">
                {post.label ? <Badge label={post.label} color={C.A} /> : <span style={{color:C.M, fontSize:12}}>-</span>}
              </div>
              {/* author */}
              <p className="text-[12px] truncate pr-3" style={{ color:C.M }}>{post.author || "-"}</p>
              {/* status toggle */}
              <button onClick={() => onTogglePublish(post)}
                className="flex items-center gap-1.5 text-[11.5px] font-semibold"
                style={{ color: post.published ? C.A : C.M, transition:"color 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.color = post.published ? C.M : C.A; }}
                onMouseLeave={e=>{ e.currentTarget.style.color = post.published ? C.A : C.M; }}>
                <div className="w-3 h-3 rounded-full" style={{ background: post.published ? C.A : C.border }} />
                {post.published ? "Live" : "Draft"}
              </button>
              {/* actions */}
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale:0.9 }} onClick={() => onEdit(post)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background:`${C.A}12`, color:C.A, transition:"background 0.12s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=`${C.A}25`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=`${C.A}12`; }}>
                  <Edit3 size={12} />
                </motion.button>
                <motion.button whileTap={{ scale:0.9 }} onClick={() => onDelete(post.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background:`${C.red}12`, color:C.red, transition:"background 0.12s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=`${C.red}25`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=`${C.red}12`; }}>
                  <Trash2 size={12} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════
   BLOG EDITOR - FULL PAGE
════════════════════════════════════ */
const CATEGORIES = ["Web Development","Mobile App Development","UI/UX Design","Generative AI","Digital Marketing","Cyber Security","E-commerce","Custom Software","Other"];
const mkBlock = (type) => type === "bullets" ? { heading:"", points:[""] } : { heading:"", paragraph:"" };

/* small reusable field label */
const FL = ({ children }) => (
  <p className="text-[10.5px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: C.M }}>{children}</p>
);

const BlogEditor = ({ existing, onSave, onClose }) => {
  const isEdit  = existing && existing !== "new";
  const fileRef = useRef();

  const [form, setForm] = useState({
    title:     isEdit ? existing.title     : "",
    slug:      isEdit ? existing.slug      : "",
    label:     isEdit ? existing.label     : "",
    author:    isEdit ? existing.author    : "Webaurix Team",
    date:      isEdit ? existing.date      : new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
    snippet:   isEdit ? existing.snippet   : "",
    image:     isEdit ? existing.image     : "",
    tags:      isEdit ? (existing.tags||[]).join(", ") : "",
    published: isEdit ? (existing.published ?? false) : false,
    markdown:  isEdit ? (existing.markdown || "") : "",
  });

  const [saving,          setSaving]          = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [err,             setErr]             = useState("");
  const [customCat,       setCustomCat]       = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const autoSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const setTitle = (v) => setForm(p => ({ ...p, title:v, slug: isEdit ? p.slug : autoSlug(v) }));
  const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  /* block helpers */
  const addBlock    = (t)    => setForm(p => ({ ...p, content:[...p.content, mkBlock(t)] }));
  const removeBlock = (i)    => setForm(p => ({ ...p, content: p.content.filter((_,j)=>j!==i) }));
  const moveBlock   = (i,d)  => setForm(p => {
    const c=[...p.content]; [c[i],c[i+d]]=[c[i+d],c[i]]; return {...p,content:c};
  });
  const upd  = (i,k,v) => setForm(p => { const c=[...p.content]; c[i]={...c[i],[k]:v}; return {...p,content:c}; });
  const updPt= (bi,pi,v)=> setForm(p => { const c=[...p.content]; const pts=[...c[bi].points]; pts[pi]=v; c[bi]={...c[bi],points:pts}; return {...p,content:c}; });
  const addPt= (bi)     => setForm(p => { const c=[...p.content]; c[bi]={...c[bi],points:[...c[bi].points,""]}; return {...p,content:c}; });
  const rmPt = (bi,pi)  => setForm(p => { const c=[...p.content]; c[bi]={...c[bi],points:c[bi].points.filter((_,j)=>j!==pi)}; return {...p,content:c}; });

  /* image upload */
  const handleFile = async (file) => {
    if (!file) return;
    if (!CLD_CLOUD || !CLD_PRESET) { setErr("Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env"); return; }
    setUploading(true);
    try { const url = await uploadToCloudinary(file); setForm(p=>({...p,image:url})); }
    catch { setErr("Upload failed - check Cloudinary config or paste a URL."); }
    setUploading(false);
  };

  /* save */
  const save = async () => {
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (!form.slug.trim())  { setErr("Slug is required.");  return; }
    setSaving(true); setErr("");
    const payload = {
      title:form.title.trim(), slug:form.slug.trim(), label:form.label,
      author:form.author.trim(), date:form.date.trim(), snippet:form.snippet.trim(),
      image:form.image.trim(),
      tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean),
      published:form.published,
      markdown:form.markdown.trim(),
      updatedAt:serverTimestamp(),
    };
    try {
      if (isEdit) {
        await updateDoc(doc(db,"blogs",existing.id), payload);
        onSave({...existing,...payload});
      } else {
        payload.createdAt = serverTimestamp();
        const d = await addDoc(collection(db,"blogs"), payload);
        onSave({id:d.id,...payload});
      }
      setSaved(true);
      setTimeout(()=>{ setSaved(false); if(!isEdit) onClose(); },1400);
    } catch { setErr("Save failed. Please try again."); }
    setSaving(false);
  };

  /* shared input style */
  const IS = {
    className:"w-full px-4 py-3 rounded-xl text-[13px] outline-none",
    style:{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" },
    onFocus:e=>{ e.target.style.borderColor=C.A; },
    onBlur: e=>{ e.target.style.borderColor=C.border; },
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.18 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background:C.bg }}>

      {/* ── TOP NAV BAR ── */}
      <div className="flex items-center justify-between px-6 sm:px-10 h-[62px] flex-shrink-0"
        style={{ background:`${C.sidebar}ee`, borderBottom:`1px solid ${C.border}`,
          backdropFilter:"blur(12px)" }}>

        {/* left - breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl flex-shrink-0"
            style={{ color:C.M, background:C.hover, transition:"color 0.12s, background 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.color=C.P; e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color=C.M; e.currentTarget.style.background=C.hover; }}>
            <ChevronRight size={13} style={{ transform:"rotate(180deg)" }} /> Back
          </button>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.M }}>Blog Posts</span>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.P }}>
            {form.title || (isEdit ? "Edit Post" : "New Post")}
          </span>
        </div>

        {/* right - actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* slug preview */}
          {form.slug && (
            <span className="hidden md:flex items-center gap-1.5 text-[11.5px] px-3 py-1.5 rounded-lg"
              style={{ background:"rgba(255,255,255,0.04)", color:C.M, border:`1px solid ${C.border}` }}>
              <Globe size={11} /> /blog/{form.slug}
            </span>
          )}

          {/* publish toggle */}
          <button onClick={()=>setForm(p=>({...p,published:!p.published}))}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold"
            style={{ background: form.published?`${C.A}15`:`rgba(255,255,255,0.05)`,
              color: form.published?C.A:C.M,
              border:`1px solid ${form.published?`${C.A}35`:C.border}`,
              transition:"all 0.15s" }}>
            <div className="w-2.5 h-2.5 rounded-full"
              style={{ background: form.published?C.A:"rgba(255,255,255,0.2)",
                boxShadow: form.published?`0 0 6px ${C.A}`:"none",
                transition:"all 0.15s" }} />
            {form.published ? "Published" : "Draft"}
          </button>

          {/* save */}
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.96 }}
            onClick={save} disabled={saving||uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60"
            style={{ background: saved?`${C.A}22`:C.A, color:"#060d10",
              boxShadow: saved?"none":`0 4px 18px ${C.Aglow}`, transition:"all 0.2s" }}>
            {saved
              ? <><CheckCircle2 size={14}/> Saved!</>
              : saving
                ? <><motion.span animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}
                    className="w-4 h-4 border-2 rounded-full border-current border-t-transparent"/>Saving…</>
                : <><Save size={14}/> {isEdit?"Update Post":"Publish Post"}</>}
          </motion.button>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      <AnimatePresence>
        {err && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex items-center gap-2 px-6 py-3 text-[12.5px] flex-shrink-0"
            style={{ background:`${C.red}12`, borderBottom:`1px solid ${C.red}20`, color:C.red }}>
            <AlertTriangle size={13} />{err}
            <button className="ml-auto" onClick={()=>setErr("")}><X size={13}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BODY - 2 columns ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT - main writing area */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
          <div className="max-w-[780px] mx-auto px-6 sm:px-10 py-10 space-y-8">

            {/* cover image hero */}
            <div>
              {form.image ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  className="relative w-full rounded-2xl overflow-hidden mb-5"
                  style={{ aspectRatio:"16/7" }}>
                  <img src={form.image} alt="cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0"
                    style={{ background:"linear-gradient(to top,rgba(7,7,13,0.5),transparent 60%)" }} />
                  <button onClick={()=>setForm(p=>({...p,image:""}))}
                    className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background:"rgba(0,0,0,0.65)", color:"#fff", backdropFilter:"blur(4px)" }}>
                    <X size={13}/>
                  </button>
                  {/* change overlay */}
                  <label className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold cursor-pointer"
                    style={{ background:"rgba(0,0,0,0.65)", color:"#fff", backdropFilter:"blur(4px)" }}>
                    <Upload size={11}/> Change
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e=>handleFile(e.target.files[0])} />
                  </label>
                </motion.div>
              ) : (
                /* upload dropzone */
                <label className="flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer mb-5 gap-3"
                  style={{ aspectRatio:"16/6", background:"rgba(255,255,255,0.03)",
                    border:`2px dashed ${C.border}`, transition:"border-color 0.15s, background 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${C.A}40`; e.currentTarget.style.background="rgba(104,181,204,0.04)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}>
                  <input type="file" accept="image/*" className="hidden" ref={fileRef}
                    onChange={e=>handleFile(e.target.files[0])} />
                  {uploading
                    ? <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}>
                        <RefreshCw size={22} style={{color:C.A}} />
                      </motion.div>
                    : <Image size={28} style={{color:`${C.M}70`}} />}
                  <div className="text-center">
                    <p className="text-[13.5px] font-semibold" style={{color:C.M}}>
                      {uploading ? "Uploading to Cloudinary…" : "Drop cover image or click to upload"}
                    </p>
                    <p className="text-[11.5px] mt-1" style={{color:`${C.M}70`}}>JPG, PNG, WebP - recommended 1600×900</p>
                  </div>
                  {/* OR paste URL */}
                  <div className="flex items-center gap-2 w-full max-w-sm px-4" onClick={e=>e.preventDefault()}>
                    <div className="flex-1 h-px" style={{background:C.border}} />
                    <span className="text-[11px]" style={{color:`${C.M}60`}}>or paste URL</span>
                    <div className="flex-1 h-px" style={{background:C.border}} />
                  </div>
                  <div className="flex gap-2 w-full max-w-sm px-4" onClick={e=>e.preventDefault()}>
                    <input value={form.image} onChange={e=>setForm(p=>({...p,image:e.target.value}))}
                      placeholder="https://…"
                      className="flex-1 px-3 py-2 rounded-xl text-[12.5px] outline-none"
                      style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, color:C.P }}
                      onFocus={e=>{ e.target.style.borderColor=C.A; }}
                      onBlur={e=>{ e.target.style.borderColor=C.border; }} />
                  </div>
                </label>
              )}
            </div>

            {/* category chip row */}
            <div className="flex flex-wrap gap-2 items-center">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={()=>{ setForm(p=>({...p,label:cat})); setShowCustomInput(false); setCustomCat(""); }}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{ background: form.label===cat ? C.A : "rgba(255,255,255,0.05)",
                    color: form.label===cat ? "#060d10" : C.M,
                    border:`1px solid ${form.label===cat ? C.A : C.border}`,
                    transition:"all 0.12s" }}>
                  {cat}
                </button>
              ))}

              {/* active custom category chip (when label isn't in the default list) */}
              {form.label && !CATEGORIES.includes(form.label) && (
                <button
                  onClick={()=>{ setShowCustomInput(true); setCustomCat(form.label); }}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{ background: C.A, color:"#060d10", border:`1px solid ${C.A}` }}>
                  {form.label}
                </button>
              )}

              {/* + Custom button */}
              {!showCustomInput ? (
                <button onClick={()=>setShowCustomInput(true)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1"
                  style={{ background:"rgba(255,255,255,0.04)", color:C.M,
                    border:`2px dashed ${C.border}`, transition:"all 0.12s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${C.A}60`; e.currentTarget.style.color=C.A; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.M; }}>
                  <Plus size={11}/> Custom
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={customCat}
                    onChange={e=>setCustomCat(e.target.value)}
                    onKeyDown={e=>{
                      if (e.key==="Enter" && customCat.trim()) {
                        setForm(p=>({...p,label:customCat.trim()}));
                        setShowCustomInput(false); setCustomCat("");
                      }
                      if (e.key==="Escape") { setShowCustomInput(false); setCustomCat(""); }
                    }}
                    placeholder="Category name…"
                    className="px-3 py-1.5 rounded-full text-[12px] outline-none"
                    style={{ background:"rgba(255,255,255,0.07)", border:`1px solid ${C.A}`,
                      color:C.P, width:"160px" }}
                  />
                  <button
                    onClick={()=>{
                      if (customCat.trim()) setForm(p=>({...p,label:customCat.trim()}));
                      setShowCustomInput(false); setCustomCat("");
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:C.A, color:"#060d10" }}>
                    <CheckCircle2 size={13}/>
                  </button>
                  <button onClick={()=>{ setShowCustomInput(false); setCustomCat(""); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:"rgba(255,255,255,0.06)", color:C.M }}>
                    <X size={12}/>
                  </button>
                </div>
              )}
            </div>

            {/* title - big editorial input */}
            <div>
              <textarea
                value={form.title}
                onChange={e=>setTitle(e.target.value)}
                placeholder="Post title…"
                rows={2}
                className="w-full bg-transparent border-none outline-none resize-none font-black leading-[1.1] tracking-[-0.02em] [&::-webkit-scrollbar]:hidden"
                style={{ fontSize:"clamp(28px, 4vw, 48px)", color:C.P,
                  borderBottom:`1px solid ${C.border}`, paddingBottom:"16px",
                  caretColor:C.A }}
              />
            </div>

            {/* snippet / intro */}
            <div>
              <FL>Excerpt <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>- shown on blog cards</span></FL>
              <textarea value={form.snippet} onChange={sf("snippet")} rows={3}
                placeholder="A short, compelling description of this post…"
                className="w-full px-4 py-3 rounded-xl text-[14px] outline-none resize-none leading-relaxed"
                style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                onFocus={e=>{ e.target.style.borderColor=C.A; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
            </div>

            {/* ── MARKDOWN EDITOR ── */}
            <div>
              <FL>Content <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>— Markdown supported (H1–H3, bold, italic, links, lists, code)</span></FL>
              <div data-color-mode="dark" style={{ borderRadius:"16px", overflow:"hidden", border:`1px solid ${C.border}` }}>
                <MDEditor
                  value={form.markdown}
                  onChange={(v) => setForm(p => ({...p, markdown: v || ""}))}
                  height={560}
                  preview="edit"
                  hideToolbar={false}
                  visibleDragbar={false}
                />
              </div>
              <p className="text-[11px] mt-2" style={{color:`${C.M}60`}}>
                Tip: ## for heading, **bold**, *italic*, [link text](url), - for bullet list, `code`
              </p>
            </div>

            <div className="h-20" />
          </div>
        </div>

        {/* RIGHT - settings sidebar */}
        <div className="w-[300px] flex-shrink-0 overflow-y-auto hidden lg:block [&::-webkit-scrollbar]:hidden"
          style={{ borderLeft:`1px solid ${C.border}`, background:C.sidebar, scrollbarWidth:"none" }}>
          <div className="p-6 space-y-6">

            {/* publish status card */}
            <div className="rounded-2xl p-4" style={{ background:C.card, border:`1px solid ${C.border}` }}>
              <FL>Visibility</FL>
              <button onClick={()=>setForm(p=>({...p,published:!p.published}))}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: form.published?`${C.A}12`:"rgba(255,255,255,0.04)",
                  border:`1px solid ${form.published?`${C.A}30`:C.border}`,
                  transition:"all 0.15s" }}>
                <span className="text-[13px] font-semibold" style={{ color: form.published?C.A:C.M }}>
                  {form.published ? "Published - Live" : "Draft - Hidden"}
                </span>
                <div className="w-10 h-5 rounded-full relative flex-shrink-0"
                  style={{ background: form.published?C.A:"rgba(255,255,255,0.12)", transition:"background 0.2s" }}>
                  <motion.div className="absolute top-0.5 w-4 h-4 rounded-full"
                    animate={{ left: form.published?"22px":"2px" }}
                    transition={{ type:"spring", stiffness:500, damping:36 }}
                    style={{ background:"#fff" }} />
                </div>
              </button>
            </div>

            {/* slug */}
            <div>
              <FL>URL Slug</FL>
              <input value={form.slug} onChange={e=>setForm(p=>({...p,slug:autoSlug(e.target.value)}))}
                placeholder="post-url-slug"
                className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] outline-none font-mono"
                style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                onFocus={e=>{ e.target.style.borderColor=C.A; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
              {form.slug && <p className="text-[10.5px] mt-1.5 truncate" style={{color:`${C.M}70`}}>/blog/{form.slug}</p>}
            </div>

            {/* author */}
            <div>
              <FL>Author</FL>
              <input value={form.author} onChange={sf("author")} placeholder="Webaurix Team"
                className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                onFocus={e=>{ e.target.style.borderColor=C.A; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
            </div>

            {/* date */}
            <div>
              <FL>Publish Date</FL>
              <input value={form.date} onChange={sf("date")} placeholder="June 10, 2026"
                className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                onFocus={e=>{ e.target.style.borderColor=C.A; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
            </div>

            {/* tags */}
            <div>
              <FL>Tags <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(comma separated)</span></FL>
              <input value={form.tags} onChange={sf("tags")} placeholder="React, Design, AI…"
                className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                onFocus={e=>{ e.target.style.borderColor=C.A; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
              {form.tags && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.split(",").map(t=>t.trim()).filter(Boolean).map(t=>(
                    <span key={t} className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                      style={{ background:`${C.A}12`, color:C.A }}>{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* cover image (sidebar) */}
            <div>
              <FL>Cover Image</FL>
              {form.image ? (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio:"16/9" }}>
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                  <button onClick={()=>setForm(p=>({...p,image:""}))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background:"rgba(0,0,0,0.7)", color:"#fff" }}><X size={11}/></button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-[12.5px] font-semibold"
                  style={{ background:"rgba(255,255,255,0.04)", border:`2px dashed ${C.border}`,
                    color:C.M, transition:"all 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${C.A}40`; e.currentTarget.style.color=C.A; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.M; }}>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e=>handleFile(e.target.files[0])} />
                  {uploading
                    ? <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}><RefreshCw size={14}/></motion.div>
                    : <Upload size={14}/>}
                  {uploading ? "Uploading…" : "Upload Image"}
                </label>
              )}
            </div>

            {/* post stats (edit mode) */}
            {isEdit && (
              <div className="rounded-2xl p-4 space-y-2" style={{ background:C.card, border:`1px solid ${C.border}` }}>
                <FL>Post Info</FL>
                {[
                  { label:"Words",    value: form.markdown ? form.markdown.split(/\s+/).filter(Boolean).length : 0 },
                  { label:"Category", value: form.label || "-" },
                  { label:"Status",   value: form.published?"Live":"Draft" },
                ].map(({label,value})=>(
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px]" style={{color:C.M}}>{label}</span>
                    <span className="text-[12px] font-semibold" style={{color:C.P}}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════
   CASE STUDIES TAB
════════════════════════════════════ */
const CaseStudiesTab = ({ studies, onNew, onEdit, onDelete }) => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return studies;
    const q = search.toLowerCase();
    return studies.filter(s => (s.client+s.industry+s.headline).toLowerCase().includes(q));
  }, [studies, search]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-[22px] font-bold mb-1" style={{ color:C.P }}>Case Studies</h2>
          <p className="text-[13px]" style={{ color:C.M }}>Manage client success stories shown on the Case Studies page.</p>
        </div>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold"
          style={{ background:C.A, color:"#060d10" }}>
          <Plus size={15}/> New Case Study
        </motion.button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:C.M }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search case studies…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.P }}
            onFocus={e=>{ e.target.style.borderColor=C.A; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }} />
          {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:C.M}}><X size={13}/></button>}
        </div>
        <span className="text-[12px] font-semibold" style={{ color:C.M }}>{filtered.length} studies</span>
      </div>

      {/* grid cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ border:`1px solid ${C.border}`, background:C.card }}>
          <Layers size={28} className="mx-auto mb-3" style={{ color:C.M }} />
          <p className="text-[13px]" style={{ color:C.M }}>{studies.length===0 ? "No case studies yet - add your first one!" : "No results match your search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.04, duration:0.4, ease:[0.22,1,0.36,1] }}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background:C.card, border:`1px solid ${C.border}` }}>
              {/* accent bar */}
              <div className="h-[3px]" style={{ background: s.accentColor || C.A }} />
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background:`${s.accentColor||C.A}15`, color:s.accentColor||C.A }}>
                        {s.industry || "-"}
                      </span>
                      {s.featured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background:`${C.amber}15`, color:C.amber }}>★ Featured</span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color:C.M }}>{s.client}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <motion.button whileTap={{ scale:0.9 }} onClick={()=>onEdit(s)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:`${C.A}12`, color:C.A }}
                      onMouseEnter={e=>e.currentTarget.style.background=`${C.A}25`}
                      onMouseLeave={e=>e.currentTarget.style.background=`${C.A}12`}>
                      <Edit3 size={12}/>
                    </motion.button>
                    <motion.button whileTap={{ scale:0.9 }} onClick={()=>onDelete(s.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:`${C.red}12`, color:C.red }}
                      onMouseEnter={e=>e.currentTarget.style.background=`${C.red}25`}
                      onMouseLeave={e=>e.currentTarget.style.background=`${C.red}12`}>
                      <Trash2 size={12}/>
                    </motion.button>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color:C.P }}>{s.headline}</p>
                {/* metrics */}
                {s.results?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop:`1px solid ${C.border}` }}>
                    {s.results.slice(0,2).map((r,j)=>(
                      <div key={j}>
                        <p className="text-[14px] font-black leading-none" style={{ color:s.accentColor||C.A }}>{r.metric}</p>
                        <p className="text-[10.5px] mt-0.5" style={{ color:C.M }}>{r.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] mt-auto pt-2" style={{ color:C.M }}>{s.year}{s.duration?` · ${s.duration}`:""}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════
   CASE STUDY EDITOR - FULL PAGE
════════════════════════════════════ */
const INDUSTRIES = ["E-Commerce","Healthcare","SaaS / Fintech","Food & Beverage","Real Estate","Education","Retail","Logistics","Travel","Technology","Finance","Other"];
const ACCENT_COLORS = ["#68b5cc","#f59e0b","#10b981","#8b5cf6","#ef4444","#3b82f6","#ec4899","#06b6d4","#f97316","#14b8a6"];

const CaseStudyEditor = ({ existing, onSave, onClose }) => {
  const isEdit = existing && existing !== "new";
  const blank = { metric:"", label:"" };
  const mkResults = (r) => { const a=[...( r||[])]; while(a.length<4) a.push({...blank}); return a.slice(0,4); };

  const [form, setForm] = useState({
    client:      isEdit ? existing.client      : "",
    industry:    isEdit ? existing.industry    : "",
    headline:    isEdit ? existing.headline    : "",
    year:        isEdit ? existing.year        : new Date().getFullYear().toString(),
    duration:    isEdit ? existing.duration    : "",
    accentColor: isEdit ? existing.accentColor : "#68b5cc",
    services:    isEdit ? (existing.services||[]).join(", ") : "",
    challenge:   isEdit ? existing.challenge   : "",
    solution:    isEdit ? existing.solution    : "",
    results:     mkResults(isEdit ? existing.results : []),
    featured:    isEdit ? (existing.featured??false) : false,
    published:   isEdit ? (existing.published??true) : true,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState("");

  const sf = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}));
  const updResult = (i,k,v) => setForm(p=>{ const r=[...p.results]; r[i]={...r[i],[k]:v}; return {...p,results:r}; });

  const save = async () => {
    if (!form.client.trim())   { setErr("Client name is required."); return; }
    if (!form.headline.trim()) { setErr("Headline is required.");     return; }
    setSaving(true); setErr("");
    const payload = {
      client:      form.client.trim(),
      industry:    form.industry,
      headline:    form.headline.trim(),
      year:        form.year,
      duration:    form.duration.trim(),
      accentColor: form.accentColor,
      services:    form.services.split(",").map(s=>s.trim()).filter(Boolean),
      challenge:   form.challenge.trim(),
      solution:    form.solution.trim(),
      results:     form.results.filter(r=>r.metric||r.label),
      featured:    form.featured,
      published:   form.published,
      updatedAt:   serverTimestamp(),
    };
    try {
      if (isEdit) {
        await updateDoc(doc(db,"case_studies",existing.id), payload);
        onSave({...existing,...payload});
      } else {
        payload.createdAt = serverTimestamp();
        const d = await addDoc(collection(db,"case_studies"), payload);
        onSave({id:d.id,...payload});
      }
      setSaved(true);
      setTimeout(()=>{ setSaved(false); if(!isEdit) onClose(); }, 1400);
    } catch { setErr("Save failed. Please try again."); }
    setSaving(false);
  };

  const IS = {
    className:"w-full px-4 py-3 rounded-xl text-[13px] outline-none",
    style:{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" },
    onFocus:e=>{ e.target.style.borderColor=C.A; },
    onBlur: e=>{ e.target.style.borderColor=C.border; },
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.18 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background:C.bg }}>

      {/* TOP NAV */}
      <div className="flex items-center justify-between px-4 sm:px-8 h-[62px] flex-shrink-0"
        style={{ background:`${C.sidebar}ee`, borderBottom:`1px solid ${C.border}`, backdropFilter:"blur(12px)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl flex-shrink-0"
            style={{ color:C.M, background:C.hover, transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.color=C.P; e.currentTarget.style.background=C.card2; }}
            onMouseLeave={e=>{ e.currentTarget.style.color=C.M; e.currentTarget.style.background=C.hover; }}>
            <ChevronRight size={13} style={{ transform:"rotate(180deg)" }}/> Back
          </button>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.M }}>Case Studies</span>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.P }}>
            {form.client || (isEdit ? "Edit Study" : "New Study")}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* published toggle */}
          <button onClick={()=>setForm(p=>({...p,published:!p.published}))}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold"
            style={{ background:form.published?`${C.A}15`:C.hover,
              color:form.published?C.A:C.M,
              border:`1px solid ${form.published?`${C.A}35`:C.border}`, transition:"all 0.15s" }}>
            <div className="w-2.5 h-2.5 rounded-full"
              style={{ background:form.published?C.A:C.border,
                boxShadow:form.published?`0 0 6px ${C.A}`:"none", transition:"all 0.15s" }}/>
            {form.published ? "Published" : "Draft"}
          </button>
          {/* save */}
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.96 }}
            onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60"
            style={{ background:saved?`${C.A}22`:C.A, color:"#060d10",
              boxShadow:saved?"none":`0 4px 18px ${C.Aglow}`, transition:"all 0.2s" }}>
            {saved ? <><CheckCircle2 size={14}/> Saved!</>
              : saving ? <><motion.span animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}
                  className="w-4 h-4 border-2 rounded-full border-current border-t-transparent"/>Saving…</>
              : <><Save size={14}/> {isEdit?"Update":"Save"}</>}
          </motion.button>
        </div>
      </div>

      {/* ERROR */}
      <AnimatePresence>
        {err && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex items-center gap-2 px-6 py-3 text-[12.5px] flex-shrink-0"
            style={{ background:`${C.red}12`, borderBottom:`1px solid ${C.red}20`, color:C.red }}>
            <AlertTriangle size={13}/>{err}
            <button className="ml-auto" onClick={()=>setErr("")}><X size={13}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
        <div className="max-w-[820px] mx-auto px-4 sm:px-8 py-8 space-y-7">

          {/* Client + Industry row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FL>Client Name *</FL>
              <input value={form.client} onChange={sf("client")} placeholder="e.g. NovaMart" {...IS}/>
            </div>
            <div>
              <FL>Industry</FL>
              <select value={form.industry} onChange={sf("industry")} {...IS}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map(ind=><option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
          </div>

          {/* Headline */}
          <div>
            <FL>Headline * <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>- shown on the card</span></FL>
            <textarea value={form.headline} onChange={sf("headline")} rows={2}
              placeholder="e.g. Rebuilt a sluggish e-commerce store into a conversion machine."
              className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold outline-none resize-none"
              style={{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s", lineHeight:1.55 }}
              onFocus={e=>e.target.style.borderColor=C.A}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Year + Duration + Accent color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <FL>Year</FL>
              <input value={form.year} onChange={sf("year")} placeholder="2025" {...IS}/>
            </div>
            <div>
              <FL>Duration</FL>
              <input value={form.duration} onChange={sf("duration")} placeholder="e.g. 4 months" {...IS}/>
            </div>
            <div>
              <FL>Accent Color</FL>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {ACCENT_COLORS.map(col=>(
                  <button key={col} onClick={()=>setForm(p=>({...p,accentColor:col}))}
                    className="w-7 h-7 rounded-lg transition-transform"
                    style={{ background:col,
                      transform: form.accentColor===col ? "scale(1.25)" : "scale(1)",
                      boxShadow: form.accentColor===col ? `0 0 0 2px ${C.card}, 0 0 0 4px ${col}` : "none",
                      transition:"all 0.15s" }}/>
                ))}
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <FL>Services <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>(comma separated)</span></FL>
            <input value={form.services} onChange={sf("services")} placeholder="UI/UX Design, Web Development, API Integration…" {...IS}/>
            {form.services && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.services.split(",").map(s=>s.trim()).filter(Boolean).map(s=>(
                  <span key={s} className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                    style={{ background:`${C.A}12`, color:C.A }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Results - 4 metrics */}
          <div>
            <FL>Key Results <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>(up to 4)</span></FL>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {form.results.map((r, i) => (
                <div key={i} className="flex gap-3 items-center p-4 rounded-xl"
                  style={{ background:C.card2, border:`1px solid ${C.border}` }}>
                  <span className="text-[10.5px] font-bold w-5 flex-shrink-0" style={{ color:C.M }}>#{i+1}</span>
                  <div className="flex-1 space-y-2">
                    <input value={r.metric} onChange={e=>updResult(i,"metric",e.target.value)}
                      placeholder="Metric (e.g. 3×, 220%)"
                      className="w-full px-3 py-2 rounded-lg text-[13px] font-black outline-none"
                      style={{ background:C.card, border:`1px solid ${C.border}`, color:form.accentColor, transition:"border-color 0.15s" }}
                      onFocus={e=>e.target.style.borderColor=C.A}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                    <input value={r.label} onChange={e=>updResult(i,"label",e.target.value)}
                      placeholder="Label (e.g. Revenue Growth)"
                      className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                      style={{ background:C.card, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
                      onFocus={e=>e.target.style.borderColor=C.A}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Challenge */}
          <div>
            <FL>The Challenge</FL>
            <textarea value={form.challenge} onChange={sf("challenge")} rows={4}
              placeholder="Describe the client's problem and pain points before working with you…"
              className="w-full px-4 py-3 rounded-xl text-[13.5px] outline-none resize-none leading-relaxed"
              style={{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=C.A}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Solution */}
          <div>
            <FL>Our Solution</FL>
            <textarea value={form.solution} onChange={sf("solution")} rows={4}
              placeholder="Describe what you built, designed, or delivered and how it solved the challenge…"
              className="w-full px-4 py-3 rounded-xl text-[13.5px] outline-none resize-none leading-relaxed"
              style={{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=C.A}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background:C.card2, border:`1px solid ${C.border}` }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color:C.P }}>Featured Study</p>
              <p className="text-[11.5px]" style={{ color:C.M }}>Show as the highlighted full-width card at the top of the page</p>
            </div>
            <button onClick={()=>setForm(p=>({...p,featured:!p.featured}))}
              className="w-12 h-6 rounded-full relative flex-shrink-0"
              style={{ background:form.featured?C.A:C.border, transition:"background 0.2s" }}>
              <motion.div className="absolute top-0.5 w-5 h-5 rounded-full"
                animate={{ left:form.featured?"26px":"2px" }}
                transition={{ type:"spring", stiffness:500, damping:36 }}
                style={{ background:"#fff" }}/>
            </button>
          </div>

          <div className="h-16"/>
        </div>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════
   JOBS TAB
════════════════════════════════════ */
const JOB_DEPTS = ["Engineering","Design","Marketing","Sales","Operations","Other"];
const JOB_TYPES = ["Full-time","Part-time","Contract","Internship"];

const JobsTab = ({ jobs, onNew, onEdit, onDelete, onToggleActive }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let arr = jobs;
    if (filter === "active")   arr = arr.filter(j => j.active);
    if (filter === "inactive") arr = arr.filter(j => !j.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(j => (j.title + (j.department||"") + (j.location||"")).toLowerCase().includes(q));
    }
    return arr;
  }, [jobs, search, filter]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Job Postings</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Manage open positions shown on the Careers page.</p>
        </div>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold"
          style={{ background: C.A, color:"#060d10" }}>
          <Plus size={15} /> New Job
        </motion.button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:C.M }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.P }}
            onFocus={e=>{ e.target.style.borderColor=C.A; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }} />
          {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:C.M}}><X size={13}/></button>}
        </div>
        {["all","active","inactive"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold capitalize"
            style={{ background: filter===f?`${C.A}15`:C.card, color: filter===f?C.A:C.M,
              border:`1px solid ${filter===f?`${C.A}30`:C.border}`, transition:"all 0.12s ease" }}>
            {f==="all"?`All (${jobs.length})`:f==="active"?`Active (${jobs.filter(j=>j.active).length})`:`Inactive (${jobs.filter(j=>!j.active).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl [&::-webkit-scrollbar]:hidden" style={{ border:`1px solid ${C.border}`, scrollbarWidth:"none" }}>
        <div style={{ minWidth:"660px" }}>
          <div className="grid text-[10px] font-bold tracking-[0.14em] uppercase px-5 py-3"
            style={{ gridTemplateColumns:"1fr 130px 100px 150px 80px 100px",
              background:C.card2, borderBottom:`1px solid ${C.border}`, color:C.M }}>
            <span>Title</span><span>Department</span><span>Type</span><span>Location</span><span>Status</span><span>Actions</span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-center py-14 text-[13px]" style={{ color:C.M }}>
              {jobs.length===0 ? "No jobs yet - post your first one!" : "No jobs match your search."}
            </p>
          ) : filtered.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.025 }}
              className="grid items-center px-5 py-3.5"
              style={{ gridTemplateColumns:"1fr 130px 100px 150px 80px 100px",
                borderBottom: i<filtered.length-1?`1px solid ${C.border}`:"none",
                transition:"background 0.12s ease" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=C.hover; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
              <div className="min-w-0 pr-3">
                <p className="text-[12.5px] font-semibold truncate" style={{ color:C.P }}>{job.title}</p>
                <p className="text-[11px]" style={{ color:C.M }}>{job.experience||""}</p>
              </div>
              <div className="pr-3">
                {job.department?<Badge label={job.department} color={C.A}/>:<span style={{color:C.M,fontSize:12}}>-</span>}
              </div>
              <p className="text-[12px] pr-3" style={{ color:C.M }}>{job.type||"-"}</p>
              <p className="text-[12px] pr-3 truncate" style={{ color:C.M }}>{job.location||"-"}</p>
              <button onClick={()=>onToggleActive(job)}
                className="flex items-center gap-1.5 text-[11.5px] font-semibold"
                style={{ color: job.active?C.A:C.M, transition:"color 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.color=job.active?C.M:C.A; }}
                onMouseLeave={e=>{ e.currentTarget.style.color=job.active?C.A:C.M; }}>
                <div className="w-3 h-3 rounded-full" style={{ background:job.active?C.A:C.border }}/>
                {job.active?"Active":"Off"}
              </button>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale:0.9 }} onClick={()=>onEdit(job)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background:`${C.A}12`, color:C.A }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${C.A}25`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${C.A}12`}>
                  <Edit3 size={12}/>
                </motion.button>
                <motion.button whileTap={{ scale:0.9 }} onClick={()=>onDelete(job.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background:`${C.red}12`, color:C.red }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${C.red}25`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${C.red}12`}>
                  <Trash2 size={12}/>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════
   JOB EDITOR - FULL PAGE
════════════════════════════════════ */
const JobEditor = ({ existing, onSave, onClose }) => {
  const isEdit = existing && existing !== "new";

  const [form, setForm] = useState({
    title:           isEdit ? existing.title           : "",
    department:      isEdit ? existing.department      : "",
    type:            isEdit ? existing.type            : "Full-time",
    location:        isEdit ? existing.location        : "",
    experience:      isEdit ? existing.experience      : "",
    description:     isEdit ? existing.description     : "",
    responsibilities:isEdit ? (existing.responsibilities?.length ? existing.responsibilities : [""]) : [""],
    requirements:    isEdit ? (existing.requirements?.length    ? existing.requirements    : [""]) : [""],
    active:          isEdit ? (existing.active ?? true) : true,
    order:           isEdit ? (existing.order ?? 0) : 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState("");

  const sf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const updList = (key, i, v) => setForm(p => { const a=[...p[key]]; a[i]=v; return {...p,[key]:a}; });
  const addItem = (key)       => setForm(p => ({ ...p, [key]: [...p[key], ""] }));
  const rmItem  = (key, i)    => setForm(p => ({ ...p, [key]: p[key].filter((_,j)=>j!==i) }));

  const save = async () => {
    if (!form.title.trim()) { setErr("Job title is required."); return; }
    setSaving(true); setErr("");
    const payload = {
      title:           form.title.trim(),
      department:      form.department,
      type:            form.type,
      location:        form.location.trim(),
      experience:      form.experience.trim(),
      description:     form.description.trim(),
      responsibilities:form.responsibilities.filter(s=>s.trim()),
      requirements:    form.requirements.filter(s=>s.trim()),
      active:          form.active,
      order:           Number(form.order)||0,
      updatedAt:       serverTimestamp(),
    };
    try {
      if (isEdit) {
        await updateDoc(doc(db,"job_postings",existing.id), payload);
        onSave({...existing,...payload});
      } else {
        payload.createdAt = serverTimestamp();
        const d = await addDoc(collection(db,"job_postings"), payload);
        onSave({id:d.id,...payload});
      }
      setSaved(true);
      setTimeout(()=>{ setSaved(false); if(!isEdit) onClose(); }, 1400);
    } catch { setErr("Save failed. Please try again."); }
    setSaving(false);
  };

  const IS = {
    className:"w-full px-4 py-3 rounded-xl text-[13px] outline-none",
    style:{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" },
    onFocus:e=>{ e.target.style.borderColor=C.A; },
    onBlur: e=>{ e.target.style.borderColor=C.border; },
  };

  const ListField = ({ label, fieldKey }) => (
    <div>
      <FL>{label}</FL>
      <div className="space-y-2.5">
        {form[fieldKey].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:C.A }}/>
            <input value={item} onChange={e=>updList(fieldKey,i,e.target.value)}
              placeholder={`${label.replace(/s$/,"")} ${i+1}...`}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
              onFocus={e=>{ e.target.style.borderColor=C.A; }}
              onBlur={e=>{ e.target.style.borderColor=C.border; }}/>
            {form[fieldKey].length > 1 && (
              <button onClick={()=>rmItem(fieldKey,i)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background:`${C.red}10`, color:C.red }}>
                <X size={11}/>
              </button>
            )}
          </div>
        ))}
        <button onClick={()=>addItem(fieldKey)}
          className="flex items-center gap-1.5 text-[12px] font-semibold mt-1 px-2 py-1"
          style={{ color:C.A }}>
          <Plus size={11}/> Add item
        </button>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.18 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background:C.bg }}>

      <div className="flex items-center justify-between px-4 sm:px-8 h-[62px] flex-shrink-0"
        style={{ background:`${C.sidebar}ee`, borderBottom:`1px solid ${C.border}`, backdropFilter:"blur(12px)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl flex-shrink-0"
            style={{ color:C.M, background:C.hover, transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.color=C.P; e.currentTarget.style.background=C.card2; }}
            onMouseLeave={e=>{ e.currentTarget.style.color=C.M; e.currentTarget.style.background=C.hover; }}>
            <ChevronRight size={13} style={{ transform:"rotate(180deg)" }}/> Back
          </button>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.M }}>Job Postings</span>
          <span style={{ color:`${C.M}50` }}>/</span>
          <span className="text-[12.5px] font-semibold truncate" style={{ color:C.P }}>
            {form.title||(isEdit?"Edit Job":"New Job")}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={()=>setForm(p=>({...p,active:!p.active}))}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold"
            style={{ background:form.active?`${C.A}15`:C.hover, color:form.active?C.A:C.M,
              border:`1px solid ${form.active?`${C.A}35`:C.border}`, transition:"all 0.15s" }}>
            <div className="w-2.5 h-2.5 rounded-full"
              style={{ background:form.active?C.A:C.border,
                boxShadow:form.active?`0 0 6px ${C.A}`:"none", transition:"all 0.15s" }}/>
            {form.active?"Active":"Inactive"}
          </button>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.96 }}
            onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60"
            style={{ background:saved?`${C.A}22`:C.A, color:"#060d10",
              boxShadow:saved?"none":`0 4px 18px ${C.Aglow}`, transition:"all 0.2s" }}>
            {saved?<><CheckCircle2 size={14}/> Saved!</>
              :saving?<><motion.span animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}
                  className="w-4 h-4 border-2 rounded-full border-current border-t-transparent"/>Saving...</>
              :<><Save size={14}/> {isEdit?"Update Job":"Post Job"}</>}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {err && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex items-center gap-2 px-6 py-3 text-[12.5px] flex-shrink-0"
            style={{ background:`${C.red}12`, borderBottom:`1px solid ${C.red}20`, color:C.red }}>
            <AlertTriangle size={13}/>{err}
            <button className="ml-auto" onClick={()=>setErr("")}><X size={13}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
        <div className="max-w-[820px] mx-auto px-4 sm:px-8 py-8 space-y-7">

          <div>
            <FL>Job Title *</FL>
            <input value={form.title} onChange={sf("title")} placeholder="e.g. Full-Stack Developer" {...IS}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <FL>Department</FL>
              <select value={form.department} onChange={sf("department")} {...IS}>
                <option value="">Select department...</option>
                {JOB_DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <FL>Job Type</FL>
              <select value={form.type} onChange={sf("type")} {...IS}>
                {JOB_TYPES.map(tp=><option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <FL>Display Order <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:`${C.M}70`}}>(lower = first)</span></FL>
              <input type="number" value={form.order} onChange={sf("order")} placeholder="0" min="0" {...IS}/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FL>Location</FL>
              <input value={form.location} onChange={sf("location")} placeholder="e.g. Remote / Lahore" {...IS}/>
            </div>
            <div>
              <FL>Experience</FL>
              <input value={form.experience} onChange={sf("experience")} placeholder="e.g. 2-4 years" {...IS}/>
            </div>
          </div>

          <div>
            <FL>Job Description</FL>
            <textarea value={form.description} onChange={sf("description")} rows={5}
              placeholder="Describe the role, the team, and what the person will be working on..."
              className="w-full px-4 py-3 rounded-xl text-[13.5px] outline-none resize-none leading-relaxed"
              style={{ background:C.card2, border:`1px solid ${C.border}`, color:C.P, transition:"border-color 0.15s" }}
              onFocus={e=>e.target.style.borderColor=C.A}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          <ListField label="Responsibilities" fieldKey="responsibilities"/>
          <ListField label="Requirements"     fieldKey="requirements"/>

          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background:C.card2, border:`1px solid ${C.border}` }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color:C.P }}>Active / Visible</p>
              <p className="text-[11.5px]" style={{ color:C.M }}>Show this position on the Careers page</p>
            </div>
            <button onClick={()=>setForm(p=>({...p,active:!p.active}))}
              className="w-12 h-6 rounded-full relative flex-shrink-0"
              style={{ background:form.active?C.A:C.border, transition:"background 0.2s" }}>
              <motion.div className="absolute top-0.5 w-5 h-5 rounded-full"
                animate={{ left:form.active?"26px":"2px" }}
                transition={{ type:"spring", stiffness:500, damping:36 }}
                style={{ background:"#fff" }}/>
            </button>
          </div>

          <div className="h-16"/>
        </div>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════
   AI MANAGER TAB
════════════════════════════════════ */
const AI_ROLES = [
  { id: "designer",        label: "Designer" },
  { id: "developer",       label: "Developer" },
  { id: "copywriter",      label: "Copywriter" },
  { id: "sales",           label: "Sales" },
  { id: "account_manager", label: "Account Manager" },
];
const STATUS_FLOW    = ["pending", "in_progress", "done"];
const STATUS_LABEL   = { pending: "Pending", in_progress: "In Progress", done: "Done" };
const PRIORITY_COLOR = (p) => p === "high" ? C.red : p === "low" ? C.M : C.amber;
const ROLE_COLOR     = (id) => ({ designer: C.purple, developer: C.blue, copywriter: C.amber, sales: C.teal, account_manager: C.A }[id] || C.M);

/* ════════════════════════════════════
   AI DRAFT REPLY PANEL (Inquiries/Consultations detail)
   Sending now happens server-side via Gmail (worker/index.js) — the AI
   drafts AND sends automatically on submission, no approval required.
   This panel is for audit (what was sent) and manual recovery (if the
   auto-send failed, e.g. Gmail secrets not configured yet).
════════════════════════════════════ */
const AIDraftPanel = ({ row, collectionName, contactName, contactEmail, contactPhone, onUpdated }) => {
  const [draftText, setDraftText] = useState(row.aiDraft || "");
  const [status,    setStatus]    = useState(row.aiDraftStatus || null);
  const [sentAt,    setSentAt]    = useState(row.aiDraftSentAt || null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setDraftText(row.aiDraft || ""); setStatus(row.aiDraftStatus || null); }, [row.id]);

  const generate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai-manager/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: collectionName,
          docId: row.id,
          name: contactName,
          email: contactEmail,
          message: row.projectDetails || row.message || "",
          service: Array.isArray(row.categories) ? row.categories.join(", ") : (row.categories || row.service || ""),
          budget: row.budget,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const { draft } = await res.json();
      await updateDoc(doc(db, collectionName, row.id), { aiDraft: draft, aiDraftStatus: "failed", aiDraftCreatedAt: serverTimestamp() });
      setDraftText(draft);
      setStatus("failed"); // drafted but not sent yet — admin sends below
      onUpdated({ aiDraft: draft, aiDraftStatus: "failed" });
    } catch {
      setErr("Couldn't generate a draft. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const sendNow = async () => {
    if (!contactEmail || !draftText.trim()) return;
    setSending(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/ai-manager/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ to: contactEmail, toName: contactName, body: draftText }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }
      await updateDoc(doc(db, collectionName, row.id), { aiDraft: draftText, aiDraftStatus: "sent", aiDraftSentAt: serverTimestamp() });
      setStatus("sent");
      setSentAt(new Date());
      onUpdated({ aiDraft: draftText, aiDraftStatus: "sent" });
    } catch (e) {
      setErr(e?.message || "Email failed to send.");
    } finally {
      setSending(false);
    }
  };

  const discard = async () => {
    await updateDoc(doc(db, collectionName, row.id), { aiDraft: "", aiDraftStatus: null });
    setDraftText("");
    setStatus(null);
    onUpdated({ aiDraft: "", aiDraftStatus: null });
  };

  const whatsappHref = contactPhone
    ? `https://wa.me/${contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(draftText)}`
    : null;

  if (status === "sent") {
    return (
      <div className="mt-2 p-3.5 rounded-2xl" style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}30` }}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={14} style={{ color: C.teal }} />
          <span className="text-[12px] font-semibold" style={{ color: C.teal }}>AI reply sent automatically{sentAt ? ` on ${fmt(sentAt)}` : ""}</span>
        </div>
        <p className="text-[12px] leading-[1.6] whitespace-pre-wrap" style={{ color: C.M }}>{draftText}</p>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3.5 rounded-2xl" style={{ background: C.card2, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: C.M }}>AI Draft Reply</span>
        {draftText && (
          <button onClick={generate} disabled={generating} className="text-[10.5px] font-semibold flex items-center gap-1" style={{ color: C.A, opacity: generating ? 0.5 : 1 }}>
            <RefreshCw size={11} className={generating ? "animate-spin" : ""} /> Regenerate
          </button>
        )}
      </div>

      {status === "failed" && draftText && (
        <p className="text-[11.5px] mb-2 flex items-center gap-1.5" style={{ color: C.amber }}>
          <AlertTriangle size={11} /> Auto-send failed — review and send manually below.
        </p>
      )}

      {!draftText ? (
        <motion.button whileTap={{ scale: 0.97 }} onClick={generate} disabled={generating}
          className="w-full py-2.5 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2"
          style={{ background: C.A, color: "#060d10", opacity: generating ? 0.6 : 1 }}>
          {generating ? <RefreshCw size={13} className="animate-spin" /> : <Bot size={13} />}
          {generating ? "Generating…" : "Generate AI Draft"}
        </motion.button>
      ) : (
        <>
          <textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={5}
            className="w-full px-3 py-2.5 rounded-xl text-[12.5px] outline-none resize-none mb-2.5"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.P }}
            onFocus={e => { e.target.style.borderColor = C.A; }}
            onBlur={e => { e.target.style.borderColor = C.border; }} />
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button whileTap={{ scale: 0.96 }} onClick={sendNow} disabled={sending || !contactEmail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-bold"
              style={{ background: C.A, color: "#060d10", opacity: sending || !contactEmail ? 0.5 : 1 }}>
              <Mail size={12} /> {sending ? "Sending…" : "Send Now"}
            </motion.button>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-bold"
                style={{ background: `${C.teal}15`, color: C.teal }}>
                <MessageSquare size={12} /> Send via WhatsApp
              </a>
            )}
            <button onClick={discard} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-bold" style={{ background: `${C.red}12`, color: C.red }}>
              <Trash2 size={12} /> Discard
            </button>
          </div>
        </>
      )}

      {err && <p className="text-[11.5px] mt-2 flex items-center gap-1.5" style={{ color: C.red }}><AlertTriangle size={11} /> {err}</p>}
    </div>
  );
};

/* ── Meeting email helpers ─────────────────────────────────────────────── */
const parseMeetingEmail = (content) => {
  const match = content.match(/\[MEETING_EMAIL\]([\s\S]*?)\[\/MEETING_EMAIL\]/i);
  if (!match) return null;
  const block = match[1];
  const to      = block.match(/^To:\s*(.+)/m)?.[1]?.trim();
  const subject = block.match(/^Subject:\s*(.+)/m)?.[1]?.trim();
  const bodyIdx = block.search(/^Body:\s*$/m);
  const body    = bodyIdx >= 0 ? block.slice(block.indexOf("\n", bodyIdx) + 1).trim() : null;
  return to && subject && body ? { to, subject, body } : null;
};
const stripMeetingEmail = (content) =>
  content.replace(/\[MEETING_EMAIL\][\s\S]*?\[\/MEETING_EMAIL\]/i, "").trim();

const MeetingEmailCard = ({ email }) => {
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    setSending(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/ai-manager/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ to: email.to, toName: "", subject: email.subject, body: email.body }),
      });
      if (res.ok) setSent(true);
    } catch { } finally { setSending(false); }
  };
  return (
    <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.A}40`, background: C.Adim, maxWidth: "85%" }}>
      <div className="px-3.5 py-2.5 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${C.A}25` }}>
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.A }}>Meeting Email</p>
          <p className="text-[11.5px] truncate" style={{ color: C.M }}>To: {email.to}</p>
          <p className="text-[11.5px] truncate" style={{ color: C.M }}>Sub: {email.subject}</p>
        </div>
        {sent ? (
          <div className="flex items-center gap-1 text-[11px] flex-shrink-0 mt-1" style={{ color: C.teal }}>
            <CheckCircle2 size={12} /> Sent
          </div>
        ) : (
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={handleSend} disabled={sending} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold mt-0.5"
            style={{ background: C.A, color: "#060d10", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "Send Email"}
          </motion.button>
        )}
      </div>
      <p className="px-3.5 py-2.5 text-[11.5px] whitespace-pre-wrap line-clamp-5" style={{ color: C.P }}>{email.body}</p>
    </div>
  );
};

/* ── AI Manager tab ────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  "Is week kitni inquiries aayi? Koi urgent hai?",
  "Sab pending consultations bata do",
  "New e-commerce project ke liye team structure suggest karo",
  "Umer ke liye aaj ka priority kya honi chahiye?",
];

const ARIA_SECRET = "WEBAURIX";

const AIManagerTab = ({ messages, tasks, sending, error, onSend, onCycleStatus, unlocked, onUnlock }) => {
  const [draft, setDraft]               = useState("");
  const [ttsEnabled, setTtsEnabled]     = useState(true);
  const [listening, setListening]       = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [pendingVoice, setPendingVoice] = useState(null);
  const [codeInput, setCodeInput]       = useState("");
  const [codeError, setCodeError]       = useState(false);
  const scrollRef      = useRef(null);
  const recognitionRef = useRef(null);
  const ttsEnabledRef  = useRef(true);
  const prevMsgCount   = useRef(null);

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, pendingVoice]);

  /* Speak new AI replies — prefer female voice */
  useEffect(() => {
    if (prevMsgCount.current === null) { prevMsgCount.current = messages.length; return; }
    if (!ttsEnabledRef.current || !window.speechSynthesis || messages.length <= prevMsgCount.current) {
      prevMsgCount.current = messages.length; return;
    }
    const newMsgs = messages.slice(prevMsgCount.current);
    prevMsgCount.current = messages.length;
    const aiMsg = [...newMsgs].reverse().find(m => m.role === "assistant");
    if (!aiMsg) return;

    const FEMALE = ['female','woman','samantha','zira','hazel','aria','victoria','moira','karen','allison','heera','google us english','google uk english female'];
    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(stripMeetingEmail(aiMsg.content));
      utt.lang = "en-US"; utt.rate = 1.0;
      const fem = voices.find(v => v.lang.startsWith("en") && FEMALE.some(k => v.name.toLowerCase().includes(k)));
      if (fem) utt.voice = fem;
      utt.onstart = () => setSpeaking(true);
      utt.onend   = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utt);
    };
    if (window.speechSynthesis.getVoices().length > 0) doSpeak();
    else { window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; }; }
  }, [messages]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  /* Speak a string directly (used for lock-screen prompts & code feedback) */
  const speakDirect = (text) => {
    if (!window.speechSynthesis) return;
    const FEMALE = ['female','woman','samantha','zira','hazel','aria','victoria','moira','karen','allison','heera','google us english','google uk english female'];
    const go = () => {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US"; utt.rate = 1.0;
      const fem = voices.find(v => v.lang.startsWith("en") && FEMALE.some(k => v.name.toLowerCase().includes(k)));
      if (fem) utt.voice = fem;
      utt.onstart = () => setSpeaking(true);
      utt.onend   = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utt);
    };
    if (window.speechSynthesis.getVoices().length > 0) go();
    else { window.speechSynthesis.onvoiceschanged = () => { go(); window.speechSynthesis.onvoiceschanged = null; }; }
  };

  /* Speak welcome greeting when lock screen mounts */
  useEffect(() => {
    if (!unlocked) {
      const timer = setTimeout(() => {
        speakDirect("Hello, Sir. I am ARIA, Chief of Staff at Webaurix. Please enter your access code to continue.");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const submitCode = () => {
    if (codeInput.trim().toUpperCase() === ARIA_SECRET) {
      setCodeError(false);
      onUnlock();
      speakDirect("Access granted. Welcome back, Sir. Ready when you are.");
    } else {
      setCodeError(true);
      speakDirect("Incorrect code, Sir. Please try again.");
      setCodeInput("");
    }
  };

  const hasSR      = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const startListening = (forCode = false) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    recognitionRef.current = r;
    r.lang = "en-US";
    r.continuous = true;      // keep listening — don't stop at first pause
    r.interimResults = true;  // fire onresult as user speaks, not just at end
    r.maxAlternatives = 1;

    let silenceTimer = null;
    let finalText = "";

    r.onresult = (e) => {
      /* accumulate final segments; grab latest interim for display */
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      const combined = (finalText + interim).trim();

      /* reset the 2.5-second silence countdown on every new word */
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const text = (finalText.trim() || combined).trim();
        r.stop();
        if (!text) { setListening(false); return; }
        if (forCode) {
          setCodeInput(text);
          setListening(false);
          return;
        }
        /* no extra delay — send immediately after silence detected */
        setPendingVoice({ text, timer: setTimeout(() => { setPendingVoice(null); onSend(text); }, 0) });
      }, 2500); // wait 2.5 s of silence before sending
    };

    r.onerror = () => { if (silenceTimer) clearTimeout(silenceTimer); setListening(false); };
    r.onend   = () => setListening(false);
    r.start();
    setListening(true);
  };

  const toggleMic = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    startListening(false);
  };

  const cancelPending = () => {
    if (pendingVoice?.timer) clearTimeout(pendingVoice.timer);
    setDraft(pendingVoice?.text || "");
    setPendingVoice(null);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    onSend(text);
  };

  /* ── Lock screen ─────────────────────────────────────────────────────── */
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 520 }}>
        <div className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-5"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* animated ARIA orb */}
          <div className="relative flex items-center justify-center">
            <motion.div className="w-16 h-16 rounded-full flex items-center justify-center text-[28px]"
              style={{ background: C.Adim, border: `2px solid ${C.A}` }}
              animate={{ boxShadow: speaking ? [`0 0 0 0 ${C.Aglow}`,`0 0 18px 8px ${C.Aglow}`,`0 0 0 0 ${C.Aglow}`] : `0 0 0 0 transparent` }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
              🤖
            </motion.div>
            {speaking && (
              <div className="absolute -bottom-3 flex items-end gap-[3px]">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-[3px] rounded-full" style={{ background: C.A }}
                    animate={{ height: ["5px","12px","5px"] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            )}
          </div>

          <div className="text-center mt-2">
            <h2 className="text-[18px] font-bold mb-1" style={{ color: C.P }}>ARIA — AI Chief of Staff</h2>
            <p className="text-[12px]" style={{ color: C.M }}>
              Enter your secret access code to continue
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(false); }}
              onKeyDown={e => e.key === "Enter" && submitCode()}
              placeholder="Access code…"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-[14px] font-mono outline-none transition-all"
              style={{
                background: C.card2, color: C.P,
                border: `1px solid ${codeError ? C.red : C.border}`,
              }}
            />
            {codeError && (
              <p className="text-[11px] text-center" style={{ color: C.red }}>
                Incorrect code — please try again
              </p>
            )}
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.96 }} onClick={submitCode}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: C.A, color: "#fff" }}>
                Verify
              </motion.button>
              {hasSR && (
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => startListening(true)}
                  className="px-3 py-2.5 rounded-xl flex items-center justify-center"
                  style={{ background: listening ? C.Adim : C.card2, border: `1px solid ${listening ? C.A : C.border}`, color: listening ? C.A : C.M }}>
                  {listening ? <Mic size={15} /> : <MicOff size={15} />}
                </motion.button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-center mt-1" style={{ color: C.M }}>
            Webaurix internal system — unauthorized access is logged
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-[22px] font-bold" style={{ color: C.P }}>AI Manager</h2>
            {speaking && (
              <div className="flex items-end gap-[3px] pb-0.5">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-[3px] rounded-full" style={{ background: C.A }}
                    animate={{ height: ["6px","14px","6px"] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />
                ))}
              </div>
            )}
          </div>
          <p className="text-[13px]" style={{ color: C.M }}>
            Ask about clients, get decisions, assign tasks, or schedule meetings — in English or Urdu.
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { if (ttsEnabled) { window.speechSynthesis?.cancel(); setSpeaking(false); } setTtsEnabled(v => !v); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold flex-shrink-0 mt-1"
          style={{ background: ttsEnabled ? C.Adim : C.card2, border: `1px solid ${ttsEnabled ? C.A : C.border}`, color: ttsEnabled ? C.A : C.M }}>
          {ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span>{speaking ? "Speaking…" : ttsEnabled ? "Voice On" : "Voice Off"}</span>
        </motion.button>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr)" }}>
        {/* chat pane */}
        <div className="rounded-2xl flex flex-col" style={{ border: `1px solid ${C.border}`, background: C.card, height: 560 }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {messages.length === 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-[12px] font-semibold mb-3" style={{ color: C.M }}>Try asking ARIA:</p>
                {QUICK_PROMPTS.map((q, i) => (
                  <button key={i} onClick={() => setDraft(q)}
                    className="block w-full text-left text-[12px] px-3 py-2 rounded-xl transition-colors"
                    style={{ background: C.card2, color: C.M, border: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.A}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    {q}
                  </button>
                ))}
              </div>
            ) : messages.map((m) => {
              const meetingEmail   = m.role === "assistant" ? parseMeetingEmail(m.content) : null;
              const displayContent = meetingEmail ? stripMeetingEmail(m.content) : m.content;
              return (
                <div key={m.id}>
                  {displayContent && (
                    <div className="flex" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12.5px] whitespace-pre-wrap"
                        style={{
                          background: m.role === "user" ? C.A : C.card2,
                          color: m.role === "user" ? "#060d10" : C.P,
                          border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                        }}>
                        {displayContent}
                      </div>
                    </div>
                  )}
                  {meetingEmail && <MeetingEmailCard email={meetingEmail} />}
                </div>
              );
            })}
            {sending && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: C.M }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 rounded-full border-t-transparent"
                  style={{ borderColor: `${C.A}35`, borderTopColor: C.A }} />
                ARIA is thinking…
              </div>
            )}
          </div>

          {/* voice auto-send countdown */}
          <AnimatePresence>
            {pendingVoice && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="px-4 py-2 flex items-center justify-between gap-3"
                style={{ borderTop: `1px solid ${C.border}`, background: C.Adim }}>
                <p className="text-[12px] truncate" style={{ color: C.A }}>
                  "{pendingVoice.text.slice(0, 60)}{pendingVoice.text.length > 60 ? "…" : ""}"
                </p>
                <button onClick={cancelPending} className="text-[11px] font-bold flex-shrink-0" style={{ color: C.M }}>
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="px-4 py-2 text-[12px] flex items-center gap-2" style={{ color: C.red, borderTop: `1px solid ${C.border}` }}>
              <AlertTriangle size={13} />
              <span>{isLocalDev ? "AI Manager only works on the live site — open webaurix.com/admin to test" : error}</span>
            </div>
          )}

          <div className="p-3 flex items-end gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
            {hasSR && (
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleMic}
                  title={listening ? "Stop listening" : "Speak to ARIA"}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: listening ? `${C.red}22` : C.card2, border: `1px solid ${listening ? C.red : C.border}`, color: listening ? C.red : C.M }}>
                  {listening
                    ? <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.65, repeat: Infinity }}><MicOff size={15} /></motion.div>
                    : <Mic size={15} />}
                </motion.button>
              </div>
            )}
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2} placeholder={listening ? "Listening… speak now" : "Ask ARIA anything about your clients, team, or business…"}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-[12.5px] outline-none resize-none"
              style={{ background: C.card2, border: `1px solid ${C.border}`, color: C.P }}
              onFocus={(e) => { e.target.style.borderColor = C.A; }}
              onBlur={(e) => { e.target.style.borderColor = C.border; }} />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={send} disabled={sending || !draft.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: C.A, color: "#060d10", opacity: sending || !draft.trim() ? 0.5 : 1 }}>
              <Send size={15} />
            </motion.button>
          </div>
        </div>

        {/* task board */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "start" }}>
          {AI_ROLES.map((role) => {
            const roleTasks = tasks.filter((t) => t.role === role.id);
            return (
              <div key={role.id} className="rounded-2xl p-3" style={{ border: `1px solid ${C.border}`, background: C.card }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: ROLE_COLOR(role.id) }}>{role.label}</p>
                  <span className="text-[11px] font-semibold" style={{ color: C.M }}>{roleTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {roleTasks.length === 0 ? (
                    <p className="text-[11.5px]" style={{ color: C.M }}>No tasks yet.</p>
                  ) : roleTasks.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-xl" style={{ background: C.card2, border: `1px solid ${C.border}` }}>
                      <p className="text-[12px] font-semibold mb-1" style={{ color: C.P }}>{t.title}</p>
                      {t.description && <p className="text-[11px] mb-2 line-clamp-3" style={{ color: C.M }}>{t.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <Badge label={t.priority || "medium"} color={PRIORITY_COLOR(t.priority)} />
                        <button onClick={() => onCycleStatus(t)}
                          className="text-[10.5px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: `${C.A}12`, color: C.A }}>
                          {STATUS_LABEL[t.status] || "Pending"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════
   MAIN ADMIN PANEL
════════════════════════════════════ */
export default function AdminPanel() {
  const [user,   setUser]   = useState(null);
  const [activeTab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /* theme */
  const [isDark, setIsDark] = useState(() => localStorage.getItem("adminTheme") !== "light");
  const toggleTheme = () => setIsDark(d => {
    const next = !d;
    localStorage.setItem("adminTheme", next ? "dark" : "light");
    return next;
  });
  /* apply palette BEFORE any render */
  Object.assign(C, isDark ? DARK_C : LIGHT_C);

  const [inquiries,     setInquiries]     = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [applications,  setApplications]  = useState([]);
  const [waitlist,      setWaitlist]      = useState([]);
  const [blogPosts,     setBlogPosts]     = useState([]);
  const [caseStudies,   setCaseStudies]   = useState([]);
  const [blogEditor,    setBlogEditor]    = useState(null); // null | "new" | postObject
  const [caseEditor,    setCaseEditor]    = useState(null); // null | "new" | studyObject
  const [jobPosts,      setJobPosts]      = useState([]);
  const [jobEditor,     setJobEditor]     = useState(null); // null | "new" | jobObject
  const [contacts,      setContacts]      = useState([]);
  const [aiMessages,    setAiMessages]    = useState([]);
  const [aiTasks,       setAiTasks]       = useState([]);
  const [aiSending,     setAiSending]     = useState(false);
  const [aiError,       setAiError]       = useState(null);
  const [aiUnlocked,    setAiUnlocked]    = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); if (u) fetchAll(); });
    return unsub;
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const safe = async (col, ord = "timestamp") => {
      try {
        const snap = await getDocs(query(collection(db, col), orderBy(ord, "desc")));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        try {
          const snap = await getDocs(collection(db, col));
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { return []; }
      }
    };
    try {
      const [inq, cons, apps, wait, blogs, cases, jobs, ctcts, aiTasksData] = await Promise.all([
        safe("businessInquiries"),
        safe("consultations", "createdAt"),
        safe("job_applications", "createdAt"),
        safe("waitlist"),
        safe("blogs", "createdAt"),
        safe("case_studies", "createdAt"),
        safe("job_postings", "createdAt"),
        safe("contacts", "createdAt"),
        safe("ai_tasks", "createdAt"),
      ]);
      setInquiries(inq); setConsultations(cons); setApplications(apps);
      setWaitlist(wait); setBlogPosts(blogs); setCaseStudies(cases);
      setJobPosts(jobs); setContacts(ctcts); setAiTasks(aiTasksData);

      try {
        const msnap = await getDocs(query(collection(db, "ai_messages"), orderBy("createdAt", "asc")));
        setAiMessages(msnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setAiMessages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const weekOf  = (arr) => arr.filter(r => thisWeek(getTs(r))).length;
  const todayOf = (arr) => arr.filter(r => isToday(getTs(r))).length;

  const allItems    = useMemo(() => [...inquiries, ...consultations, ...applications, ...waitlist], [inquiries, consultations, applications, waitlist]);
  const dailyCounts = useMemo(() => getDailyCounts(allItems, 14), [allItems]);

  const donutSegs = [
    { label: "Inquiries",    value: inquiries.length,     color: C.A      },
    { label: "Consults",     value: consultations.length, color: C.blue   },
    { label: "Applications", value: applications.length,  color: C.purple },
    { label: "Waitlist",     value: waitlist.length,      color: C.amber  },
  ];

  const recentAll = useMemo(() => {
    const tag = (arr, type, color) => arr.map(r => ({ ...r, _type: type, _color: color }));
    return [
      ...tag(inquiries,     "Inquiry",     C.A),
      ...tag(consultations, "Consult",     C.blue),
      ...tag(applications,  "Application", C.purple),
      ...tag(waitlist,      "Waitlist",    C.amber),
    ].sort((a, b) => {
      const da = getTs(a); const db2 = getTs(b);
      const d1 = da?.toDate ? da.toDate() : new Date(da || 0);
      const d2 = db2?.toDate ? db2.toDate() : new Date(db2 || 0);
      return d2 - d1;
    }).slice(0, 6);
  }, [inquiries, consultations, applications, waitlist]);

  const NAV = [
    { id: "dashboard",     label: "Overview",          icon: <LayoutDashboard size={15} /> },
    { id: "inquiries",     label: "Project Inquiries",  icon: <Briefcase size={15} />,      count: inquiries.length,     dot: todayOf(inquiries) > 0 },
    { id: "consultations", label: "Consultations",      icon: <CalendarCheck size={15} />,  count: consultations.length, dot: todayOf(consultations) > 0 },
    { id: "applications",  label: "Job Applications",   icon: <UserCheck size={15} />,      count: applications.length,  dot: todayOf(applications) > 0 },
    { id: "waitlist",      label: "Waitlist",           icon: <Mail size={15} />,           count: waitlist.length,      dot: todayOf(waitlist) > 0 },
    { id: "blogs",         label: "Blog Posts",         icon: <FileText size={15} />,       count: blogPosts.length },
    { id: "case_studies",  label: "Case Studies",        icon: <Layers size={15} />,         count: caseStudies.length },
    { id: "jobs",          label: "Job Postings",         icon: <ClipboardList size={15} />,  count: jobPosts.length },
    { id: "contacts",      label: "Contact Messages",      icon: <MessageSquare size={15} />,  count: contacts.length, dot: todayOf(contacts) > 0 },
    { id: "ai_manager",    label: "AI Manager",            icon: <Bot size={15} />,            count: aiTasks.filter(t => t.status !== "done").length },
  ];

  if (!user) return <LoginScreen />;

  /* Sidebar */
  const SidebarInner = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
      {/* logo */}
      <div className="flex items-center gap-2 px-5 h-[62px] flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}>
        <img src={logoIcon} alt="" className="h-8 w-auto" />
        <img src={isDark ? logoLight : logoDark} alt="Webaurix" className="h-5 w-auto" />
        <span className="text-[8.5px] font-black tracking-[0.22em] uppercase ml-auto px-1.5 py-[2px] rounded-md"
          style={{ background: C.Adim, color: C.A }}>ADMIN</span>
      </div>

      {/* search */}
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.M }} />
          <input placeholder="Search…" readOnly
            className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none cursor-pointer"
            style={{ background: C.hover, border: `1px solid ${C.border}`, color: C.M }} />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1 py-0.5 rounded"
            style={{ background: C.hover, color: C.M }}>⌘K</span>
        </div>
      </div>

      {/* nav */}
      <div className="px-3 py-2 flex-shrink-0">
        <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase px-2 mb-2" style={{ color: `${C.M}80` }}>DASHBOARDS</p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
        {NAV.map(item => {
          const active = activeTab === item.id;
          return (
            <button key={item.id}
              onClick={() => { setTab(item.id); if (mobile) setSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left relative"
              style={{ background: active ? `${C.A}13` : "transparent", transition: "background 0.12s ease, color 0.12s ease" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.hover; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: C.A }} />
              )}
              <span style={{ color: active ? C.A : C.M }}>{item.icon}</span>
              <span className="flex-1 text-[12.5px] font-semibold" style={{ color: active ? C.P : C.M }}>{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: active ? `${C.A}20` : "rgba(255,255,255,0.06)", color: active ? C.A : C.M }}>
                  {item.count}
                </span>
              )}
              {item.dot && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.A }} />}
            </button>
          );
        })}
      </nav>

      {/* logout */}
      <div className="px-3 pb-5 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => signOut(auth)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold"
          style={{ color: C.red, transition: "background 0.12s ease" }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C.red}10`; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );

  /* ── DASHBOARD TAB CONTENT ── */
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: <Briefcase size={16} />,   label: "Project Inquiries",  value: inquiries.length,     weekVal: weekOf(inquiries),     color: C.A,      data: getDailyCounts(inquiries,     10), delay: 0.05 },
          { icon: <CalendarCheck size={16}/>, label: "Consultations",      value: consultations.length, weekVal: weekOf(consultations), color: C.blue,   data: getDailyCounts(consultations, 10), delay: 0.1  },
          { icon: <UserCheck size={16} />,   label: "Job Applications",   value: applications.length,  weekVal: weekOf(applications),  color: C.purple, data: getDailyCounts(applications,  10), delay: 0.15 },
          { icon: <Mail size={16} />,        label: "Waitlist Signups",   value: waitlist.length,      weekVal: weekOf(waitlist),      color: C.amber,  data: getDailyCounts(waitlist,      10), delay: 0.2  },
        ].map(props => <StatCard key={props.label} {...props} sparkData={props.data} />)}
      </div>

      {/* chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">

        {/* Donut + legend */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22,1,0.36,1] }}
          className="rounded-2xl p-6"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[15px] font-bold" style={{ color: C.P }}>Submissions Overview</p>
              <p className="text-[12px] mt-0.5" style={{ color: C.M }}>All time by category</p>
            </div>
            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: C.Adim, color: C.A }}>
              {allItems.length} total
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* donut */}
            <div className="flex-shrink-0">
              <DonutChart segments={donutSegs} size={190} thickness={30} />
            </div>

            {/* legend */}
            <div className="flex-1 space-y-3 w-full">
              {donutSegs.map(seg => {
                const pct = allItems.length > 0 ? Math.round((seg.value / allItems.length) * 100) : 0;
                return (
                  <div key={seg.label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12.5px] font-semibold" style={{ color: C.P }}>{seg.label}</span>
                        <span className="text-[12px] font-bold" style={{ color: seg.color }}>{seg.value}</span>
                      </div>
                      {/* progress bar */}
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.5, duration: 0.8, ease: [0.22,1,0.36,1] }}
                          style={{ background: seg.color }} />
                      </div>
                    </div>
                    <span className="text-[11px] w-8 text-right flex-shrink-0" style={{ color: C.M }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Area chart - 14-day trend */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: [0.22,1,0.36,1] }}
          className="rounded-2xl p-6 flex flex-col"
          style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[15px] font-bold" style={{ color: C.P }}>Activity Trend</p>
              <p className="text-[12px] mt-0.5" style={{ color: C.M }}>Last 14 days - all submissions</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold"
              style={{ color: C.A }}>
              <Activity size={12} />
              Live
            </div>
          </div>

          {/* big number */}
          <div className="my-4">
            <p className="text-[38px] font-black leading-none" style={{ color: C.P }}>
              <CountUp target={dailyCounts.reduce((s, v) => s + v, 0)} />
            </p>
            <p className="text-[12px] mt-1" style={{ color: C.M }}>submissions in last 14 days</p>
          </div>

          <div className="flex-1 mt-auto">
            <AreaChart data={dailyCounts} color={C.A} h={100} />
          </div>

          {/* day labels */}
          <div className="flex justify-between mt-2">
            {["14d", "7d", "3d", "1d", "Now"].map(l => (
              <span key={l} className="text-[9.5px]" style={{ color: `${C.M}70` }}>{l}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* recent submissions table */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.5, ease: [0.22,1,0.36,1] }}
        className="rounded-2xl p-6"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[15px] font-bold" style={{ color: C.P }}>Recent Submissions</p>
            <p className="text-[12px] mt-0.5" style={{ color: C.M }}>Latest entries across all forms</p>
          </div>
          <button onClick={() => setTab("inquiries")}
            className="flex items-center gap-1 text-[12px] font-semibold"
            style={{ color: C.A }}>
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="space-y-1">
          {recentAll.length === 0
            ? <p className="text-[13px] py-6 text-center" style={{ color: C.M }}>No submissions yet.</p>
            : recentAll.map((r, i) => {
              const nm = r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.email || "-";
              const ts = getTs(r);
              const d  = ts?.toDate ? ts.toDate() : new Date(ts || 0);
              return (
                <div key={r.id || i} className="flex items-center gap-4 px-3 py-3 rounded-xl"
                  style={{ transition: "background 0.12s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.hover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-black"
                    style={{ background: `${r._color}16`, color: r._color }}>
                    {nm[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: C.P }}>{nm}</p>
                    <p className="text-[11.5px] truncate" style={{ color: C.M }}>{r.email || r.service || r.jobTitle || "-"}</p>
                  </div>
                  <Badge label={r._type} color={r._color} />
                  <span className="text-[11px] flex-shrink-0 hidden sm:block" style={{ color: C.M }}>
                    {d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                  </span>
                  {isToday(ts) && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.A }} />}
                </div>
              );
            })}
        </div>
      </motion.div>
    </div>
  );

  /* ── DATE COLUMN RENDER HELPER ── */
  const dateRender = (v, r, tsKey) => {
    const ts = r[tsKey] || r.timestamp || r.createdAt;
    return (
      <span className="text-[11.5px]" style={{ color: C.M }}>
        {ts?.toDate ? ts.toDate().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "-"}
        {isToday(ts) && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: C.A }} />}
      </span>
    );
  };

  /* ── TAB CONTENT ── */
  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 rounded-full border-t-transparent"
          style={{ borderColor: `${C.A}35`, borderTopColor: C.A }} />
        <p className="text-[13px]" style={{ color: C.M }}>Loading data…</p>
      </div>
    );

    if (activeTab === "dashboard") return <DashboardContent />;

    if (activeTab === "inquiries") return (
      <div>
        <div className="mb-6">
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Project Inquiries</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Submissions from the Start a Project form.</p>
        </div>
        <DataTable
          columns={[
            { key: "name",       label: "Name",    width:"1.3fr", render:(_,r) => <span className="text-[12.5px] font-semibold" style={{color:C.P}}>{`${r.firstName||""} ${r.lastName||""}`.trim()||"-"}</span> },
            { key: "email",      label: "Email",   width:"1.5fr" },
            { key: "companyName",label: "Company", width:"1fr" },
            { key: "budget",     label: "Budget",  width:"0.9fr", render: v => v ? <Badge label={v} color={C.amber} /> : <span style={{color:C.M}}>-</span> },
            { key: "timestamp",  label: "Date",    width:"1fr",   render:(_,r) => dateRender(null,r,"timestamp") },
          ]}
          rows={inquiries} emptyMsg="No inquiries yet."
          renderDetail={r => ({ title:`${r.firstName||""} ${r.lastName||""}`.trim()||r.email, fields:[
            {label:"Full Name",     value:`${r.firstName||""} ${r.lastName||""}`.trim()},
            {label:"Email",         value:r.email},{label:"Phone",value:r.phoneNumber},
            {label:"Company",       value:r.companyName},{label:"URL",value:r.companyUrl},
            {label:"Budget",        value:r.budget},
            {label:"Services",      value:Array.isArray(r.categories)?r.categories.join(", "):r.categories},
            {label:"Project Details",value:r.projectDetails},
            {label:"Submitted At",  value:fmt(r.timestamp)},
          ], extra: (
            <AIDraftPanel row={r} collectionName="businessInquiries"
              contactName={`${r.firstName||""} ${r.lastName||""}`.trim()}
              contactEmail={r.email} contactPhone={r.phoneNumber}
              onUpdated={patch => setInquiries(prev => prev.map(x => x.id===r.id ? {...x,...patch} : x))} />
          )})}
        />
      </div>
    );

    if (activeTab === "consultations") return (
      <div>
        <div className="mb-6">
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Consultation Requests</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Bookings from the Book a Consultation page.</p>
        </div>
        <DataTable
          columns={[
            { key:"name",      label:"Name",    width:"1.3fr", render:v=><span className="text-[12.5px] font-semibold" style={{color:C.P}}>{v||"-"}</span> },
            { key:"email",     label:"Email",   width:"1.5fr" },
            { key:"service",   label:"Service", width:"1.3fr", render:v=>v?<Badge label={v} color={C.blue}/>:<span style={{color:C.M}}>-</span> },
            { key:"budget",    label:"Budget",  width:"0.9fr", render:v=><span className="text-[12px]" style={{color:C.M}}>{v||"-"}</span> },
            { key:"createdAt", label:"Date",    width:"1fr",   render:(_,r)=>dateRender(null,r,"createdAt") },
          ]}
          rows={consultations} emptyMsg="No consultation requests yet."
          renderDetail={r => ({ title:r.name||r.email, fields:[
            {label:"Name",    value:r.name},{label:"Email",value:r.email},
            {label:"Phone",   value:r.phone},{label:"Company",value:r.company},
            {label:"Service", value:r.service},{label:"Budget",value:r.budget},
            {label:"Message", value:r.message},{label:"Requested At",value:fmt(r.createdAt)},
          ], extra: (
            <AIDraftPanel row={r} collectionName="consultations"
              contactName={r.name} contactEmail={r.email} contactPhone={r.phone}
              onUpdated={patch => setConsultations(prev => prev.map(x => x.id===r.id ? {...x,...patch} : x))} />
          )})}
        />
      </div>
    );

    if (activeTab === "applications") return (
      <div>
        <div className="mb-6">
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Job Applications</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Applications submitted via the Careers page.</p>
        </div>
        <DataTable
          columns={[
            { key:"name",      label:"Name",    width:"1.3fr", render:v=><span className="text-[12.5px] font-semibold" style={{color:C.P}}>{v||"-"}</span> },
            { key:"email",     label:"Email",   width:"1.5fr" },
            { key:"jobTitle",  label:"Role",    width:"1.3fr", render:v=>v?<Badge label={v} color={C.purple}/>:<span style={{color:C.M}}>-</span> },
            { key:"department",label:"Dept",    width:"0.9fr", render:v=><span className="text-[12px]" style={{color:C.M}}>{v||"-"}</span> },
            { key:"createdAt", label:"Applied", width:"1fr",   render:(_,r)=>dateRender(null,r,"createdAt") },
          ]}
          rows={applications} emptyMsg="No applications yet."
          renderDetail={r => ({ title:r.name||r.email, fields:[
            {label:"Name",    value:r.name},{label:"Email",value:r.email},
            {label:"Phone",   value:r.phone},{label:"Role",value:r.jobTitle},
            {label:"Department",value:r.department},{label:"Portfolio",value:r.portfolio},
            {label:"Cover Note",value:r.message},{label:"Applied At",value:fmt(r.createdAt)},
          ]})}
        />
      </div>
    );

    if (activeTab === "waitlist") return (
      <div>
        <div className="mb-6">
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Waitlist</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Email signups from the waitlist form.</p>
        </div>
        <DataTable
          columns={[
            { key:"#",         label:"#",      width:"44px", render:(_,r)=><span className="text-[12px]" style={{color:C.M}}>{waitlist.findIndex(x=>x.id===r.id)+1}</span> },
            { key:"email",     label:"Email",  width:"2fr",  render:v=><span className="text-[12.5px] font-semibold" style={{color:C.P}}>{v}</span> },
            { key:"timestamp", label:"Joined", width:"1.2fr",render:(_,r)=>dateRender(null,r,"timestamp") },
          ]}
          rows={waitlist} emptyMsg="No waitlist signups yet."
          renderDetail={r => ({ title:r.email, fields:[
            {label:"Email",value:r.email},{label:"Joined At",value:fmt(r.timestamp)},
          ]})}
        />
      </div>
    );

    if (activeTab === "blogs") return (
      <BlogsTab
        posts={blogPosts}
        onNew={() => setBlogEditor("new")}
        onEdit={(p) => setBlogEditor(p)}
        onDelete={async (id) => {
          if (!window.confirm("Delete this post permanently?")) return;
          await deleteDoc(doc(db, "blogs", id));
          setBlogPosts(prev => prev.filter(p => p.id !== id));
        }}
        onTogglePublish={async (post) => {
          await updateDoc(doc(db, "blogs", post.id), { published: !post.published, updatedAt: serverTimestamp() });
          setBlogPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: !p.published } : p));
        }}
      />
    );

    if (activeTab === "case_studies") return (
      <CaseStudiesTab
        studies={caseStudies}
        onNew={() => setCaseEditor("new")}
        onEdit={(s) => setCaseEditor(s)}
        onDelete={async (id) => {
          if (!window.confirm("Delete this case study permanently?")) return;
          await deleteDoc(doc(db, "case_studies", id));
          setCaseStudies(prev => prev.filter(s => s.id !== id));
        }}
      />
    );

    if (activeTab === "jobs") return (
      <JobsTab
        jobs={jobPosts}
        onNew={() => setJobEditor("new")}
        onEdit={(j) => setJobEditor(j)}
        onDelete={async (id) => {
          if (!window.confirm("Delete this job posting permanently?")) return;
          await deleteDoc(doc(db, "job_postings", id));
          setJobPosts(prev => prev.filter(j => j.id !== id));
        }}
        onToggleActive={async (job) => {
          await updateDoc(doc(db, "job_postings", job.id), { active: !job.active, updatedAt: serverTimestamp() });
          setJobPosts(prev => prev.map(j => j.id === job.id ? { ...j, active: !j.active } : j));
        }}
      />
    );

    if (activeTab === "ai_manager") return (
      <AIManagerTab
        messages={aiMessages}
        tasks={aiTasks}
        sending={aiSending}
        error={aiError}
        unlocked={aiUnlocked}
        onUnlock={() => setAiUnlocked(true)}
        onSend={async (text) => {
          setAiError(null);
          setAiSending(true);
          try {
            const userPayload = { role: "user", content: text, createdAt: serverTimestamp() };
            const userRef = await addDoc(collection(db, "ai_messages"), userPayload);
            setAiMessages(prev => [...prev, { id: userRef.id, ...userPayload, createdAt: new Date() }]);

            const idToken = await auth.currentUser.getIdToken();
            const history = [...aiMessages, { role: "user", content: text }]
              .slice(-12).map(m => ({ role: m.role, content: m.content }));

            let context = "";
            if (aiUnlocked) {
              const ctxParts = [];
              if (inquiries.length) {
                ctxParts.push(`== Business Inquiries (${inquiries.length} total) ==`);
                inquiries.slice(0, 25).forEach((r, i) => {
                  const name = `${r.firstName||""} ${r.lastName||""}`.trim() || "Unknown";
                  const date = r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString("en-GB") : "?";
                  const svc  = Array.isArray(r.categories) ? r.categories.join(", ") : (r.categories || "N/A");
                  ctxParts.push(`${i+1}. ${name} <${r.email}> | Service: ${svc} | Budget: ${r.budget||"N/A"} | Email sent: ${r.aiDraftStatus||"none"} | Date: ${date}`);
                  const msg = (r.projectDetails || "").trim();
                  if (msg) ctxParts.push(`   "${msg.slice(0, 150)}"`);
                });
              }
              if (consultations.length) {
                ctxParts.push(`== Consultation Requests (${consultations.length} total) ==`);
                consultations.slice(0, 25).forEach((r, i) => {
                  const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("en-GB") : "?";
                  ctxParts.push(`${i+1}. ${r.name||"?"} <${r.email}> | Service: ${r.service||"N/A"} | Budget: ${r.budget||"N/A"} | Email sent: ${r.aiDraftStatus||"none"} | Date: ${date}`);
                  if (r.message) ctxParts.push(`   "${r.message.slice(0, 150)}"`);
                });
              }
              context = ctxParts.join("\n");
            }

            const res = await fetch("/api/ai-manager/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ message: text, history, context }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(d.error || `Error ${res.status}`);
            }
            const { reply, tasks: newTasks } = await res.json();

            const assistantPayload = { role: "assistant", content: reply, createdAt: serverTimestamp() };
            const assistantRef = await addDoc(collection(db, "ai_messages"), assistantPayload);
            setAiMessages(prev => [...prev, { id: assistantRef.id, ...assistantPayload, createdAt: new Date() }]);

            if (Array.isArray(newTasks) && newTasks.length) {
              const created = [];
              for (const t of newTasks) {
                const payload = {
                  title: t.title, description: t.description || "", role: t.role,
                  priority: t.priority || "medium", status: "pending",
                  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                };
                const ref = await addDoc(collection(db, "ai_tasks"), payload);
                created.push({ id: ref.id, ...payload, createdAt: new Date(), updatedAt: new Date() });
              }
              setAiTasks(prev => [...created, ...prev]);
            }
          } catch (e) {
            setAiError(e?.message || "Couldn't reach the AI Manager. Try again.");
          } finally {
            setAiSending(false);
          }
        }}
        onCycleStatus={async (task) => {
          const next = STATUS_FLOW[(STATUS_FLOW.indexOf(task.status) + 1) % STATUS_FLOW.length];
          await updateDoc(doc(db, "ai_tasks", task.id), { status: next, updatedAt: serverTimestamp() });
          setAiTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
        }}
      />
    );

    if (activeTab === "contacts") return (
      <div>
        <div className="mb-6">
          <h2 className="text-[22px] font-bold mb-1" style={{ color: C.P }}>Contact Messages</h2>
          <p className="text-[13px]" style={{ color: C.M }}>Submissions from the Contact Us page.</p>
        </div>
        <DataTable
          columns={[
            { key: "name",    label: "Name",    width: "1.2fr", render: (v) => <span className="text-[12.5px] font-semibold" style={{ color: C.P }}>{v || "-"}</span> },
            { key: "email",   label: "Email",   width: "1.5fr" },
            { key: "phone",   label: "Phone",   width: "1fr",   render: (v) => <span className="text-[12px]" style={{ color: C.M }}>{v || "-"}</span> },
            { key: "service", label: "Service", width: "1.2fr", render: (v) => v ? <Badge label={v} color={C.A} /> : <span style={{ color: C.M }}>-</span> },
            { key: "budget",  label: "Budget",  width: "1fr",   render: (v) => <span className="text-[12px]" style={{ color: C.M }}>{v || "-"}</span> },
            { key: "createdAt", label: "Date",  width: "1fr",   render: (_, r) => dateRender(null, r, "createdAt") },
          ]}
          rows={contacts} emptyMsg="No contact messages yet."
          renderDetail={(r) => ({ title: r.name || r.email, fields: [
            { label: "Name",       value: r.name },
            { label: "Email",      value: r.email },
            { label: "Phone",      value: r.phone },
            { label: "Service",    value: r.service },
            { label: "Budget",     value: r.budget },
            { label: "Message",    value: r.message },
            { label: "Received At",value: fmt(r.createdAt) },
          ]})}
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: C.bg }}>
      <Helmet>
        <title>Admin Panel | Webaurix</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Blog Editor Overlay */}
      <AnimatePresence>
        {blogEditor && (
          <BlogEditor
            existing={blogEditor}
            onClose={() => setBlogEditor(null)}
            onSave={(saved) => {
              setBlogPosts(prev => {
                const exists = prev.find(p => p.id === saved.id);
                return exists
                  ? prev.map(p => p.id === saved.id ? saved : p)
                  : [saved, ...prev];
              });
              if (blogEditor === "new") setBlogEditor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Case Study Editor Overlay */}
      <AnimatePresence>
        {caseEditor && (
          <CaseStudyEditor
            existing={caseEditor}
            onClose={() => setCaseEditor(null)}
            onSave={(saved) => {
              setCaseStudies(prev => {
                const exists = prev.find(s => s.id === saved.id);
                return exists
                  ? prev.map(s => s.id === saved.id ? saved : s)
                  : [saved, ...prev];
              });
              if (caseEditor === "new") setCaseEditor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Job Editor Overlay */}
      <AnimatePresence>
        {jobEditor && (
          <JobEditor
            existing={jobEditor}
            onClose={() => setJobEditor(null)}
            onSave={(saved) => {
              setJobPosts(prev => {
                const exists = prev.find(j => j.id === saved.id);
                return exists
                  ? prev.map(j => j.id === saved.id ? saved : j)
                  : [saved, ...prev];
              });
              if (jobEditor === "new") setJobEditor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* bg ambient glow */}
      <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% -5%, rgba(104,181,204,0.06), transparent)" }} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 z-10 relative">
        <SidebarInner />
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36 }}
              className="fixed left-0 top-0 bottom-0 z-40 lg:hidden w-[240px]">
              <SidebarInner mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Topbar */}
        <div className="flex items-center justify-between px-5 sm:px-7 h-[62px] flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}`, background: `${C.sidebar}cc`, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: C.hover, color: C.M }}><Menu size={16} /></button>
            {/* breadcrumb */}
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: C.M }}>
              <span>Dashboards</span>
              <ChevronRight size={12} />
              <span className="font-semibold" style={{ color: C.P }}>
                {NAV.find(n => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* today badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.M }}>
              <Clock size={11} />
              {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}
            </div>

            {/* theme toggle */}
            <motion.button whileTap={{ scale:0.9 }} onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:C.card, color:C.M, border:`1px solid ${C.border}`, transition:"all 0.18s" }}
              onMouseEnter={e=>{ e.currentTarget.style.color=C.A; e.currentTarget.style.borderColor=`${C.A}40`; }}
              onMouseLeave={e=>{ e.currentTarget.style.color=C.M; e.currentTarget.style.borderColor=C.border; }}>
              {isDark ? <Sun size={14}/> : <Moon size={14}/>}
            </motion.button>

            {/* refresh */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={fetchAll} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: C.card, color: C.M, border: `1px solid ${C.border}` }}>
              <motion.span animate={loading ? { rotate: 360 } : {}}
                transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={12} />
              </motion.span>
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>

            {/* user */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black"
                style={{ background: C.Adim, color: C.A }}>
                {user.email?.[0]?.toUpperCase() || "A"}
              </div>
              <span className="text-[12px] font-semibold hidden sm:block" style={{ color: C.M }}>
                {user.email?.split("@")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Content + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-7 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22,1,0.36,1] }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right panel - only on dashboard, desktop */}
          {activeTab === "dashboard" && (
            <div className="hidden xl:flex flex-col w-[272px] flex-shrink-0">
              <RightPanel
                inquiries={inquiries} consultations={consultations}
                applications={applications} waitlist={waitlist} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
