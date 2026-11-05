"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/* =================================================================
   Categories
   Values saved in the database stay in Thai so they keep matching
   the list in supabase/functions/categorize/index.ts.
   Only the label shown on screen changes with the language.
   ================================================================= */
const CATEGORIES = ["อาหาร", "เดินทาง", "ที่พัก", "ช้อปปิ้ง", "บันเทิง", "สุขภาพ", "เงินเดือน", "อื่นๆ"];
const CAT_ICON: Record<string, string> = {
  อาหาร: "🍜", เดินทาง: "🚆", ที่พัก: "🏠", ช้อปปิ้ง: "🛍️", บันเทิง: "🎬",
  สุขภาพ: "💊", เงินเดือน: "💼", อื่นๆ: "📦",
};
const CAT_EN: Record<string, string> = {
  อาหาร: "Food", เดินทาง: "Transport", ที่พัก: "Housing", ช้อปปิ้ง: "Shopping",
  บันเทิง: "Entertainment", สุขภาพ: "Health", เงินเดือน: "Salary", อื่นๆ: "Other",
};

/* =================================================================
   Language (TH / EN)
   ================================================================= */
type Lang = "th" | "en";

const DICT = {
  th: {
    locale: "th-TH",
    weekdays: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    loading: "กำลังโหลด…",
    brandTitle: "บัญชีเงินของฉัน",
    brandSub: "จดรายรับรายจ่าย แล้วให้ AI ช่วยจัดหมวดให้",
    login: "เข้าสู่ระบบ",
    signup: "สมัครใหม่",
    email: "อีเมล",
    password: "รหัสผ่าน",
    working: "กำลังดำเนินการ…",
    createAccount: "สร้างบัญชี",
    checkEmail: "สมัครแล้ว เปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน",
    loginFailed: "เข้าสู่ระบบไม่สำเร็จ",
    logout: "ออกจากระบบ",
    prevMonth: "เดือนก่อน",
    nextMonth: "เดือนถัดไป",
    balanceLabel: "คงเหลือเดือนนี้",
    currency: "บาท",
    income: "รายรับ",
    expense: "รายจ่าย",
    dailySpend: "ใช้จ่ายรายวัน",
    viewMonth: "ดูทั้งเดือน",
    byCategory: "รายจ่ายตามหมวด",
    allItems: "รายการทั้งหมด",
    noItemsDay: "วันนี้ยังไม่มีรายการ",
    noItemsMonth: "เดือนนี้ยังไม่มีรายการ",
    addFirst: "เพิ่มรายการแรก",
    noDetail: "ไม่มีรายละเอียด",
    noCategory: "ไม่ระบุหมวด",
    deleteItem: "ลบรายการ",
    confirmDelete: "ลบรายการนี้?",
    addItem: "เพิ่มรายการ",
    amount: "จำนวนเงิน",
    detail: "รายละเอียด",
    detailPh: "เช่น ข้าวมันไก่, ค่า BTS",
    category: "หมวดหมู่",
    categoryHint: "ไม่เลือกก็ได้ AI จะเลือกให้ตอนบันทึก",
    aiPick: "✨ ให้ AI เลือก",
    aiThinking: "กำลังคิด…",
    date: "วันที่",
    cancel: "ยกเลิก",
    save: "บันทึก",
    saving: "กำลังบันทึก…",
    needNote: "พิมพ์รายละเอียดก่อน แล้ว AI จะเลือกหมวดให้",
    aiDown: "AI ใช้งานไม่ได้ตอนนี้ เลือกหมวดเองได้เลย",
    amountInvalid: "ใส่จำนวนเงินที่มากกว่า 0",
    spent: (day: string, amt: string) => `${day} ใช้ไป ${amt} บาท`,
    theme: "ธีม",
    light: "โหมดสว่าง",
    system: "ตามเครื่อง",
    dark: "โหมดมืด",
    language: "ภาษา",
  },
  en: {
    locale: "en-US",
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    loading: "Loading…",
    brandTitle: "My Money",
    brandSub: "Track income and spending, and let AI sort the categories",
    login: "Log in",
    signup: "Sign up",
    email: "Email",
    password: "Password",
    working: "Working…",
    createAccount: "Create account",
    checkEmail: "Account created. Open your email to confirm it before logging in",
    loginFailed: "Couldn't log in",
    logout: "Log out",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    balanceLabel: "Left this month",
    currency: "THB",
    income: "Income",
    expense: "Spending",
    dailySpend: "Daily spending",
    viewMonth: "Show whole month",
    byCategory: "Spending by category",
    allItems: "All items",
    noItemsDay: "Nothing on this day yet",
    noItemsMonth: "Nothing this month yet",
    addFirst: "Add your first item",
    noDetail: "No details",
    noCategory: "No category",
    deleteItem: "Delete item",
    confirmDelete: "Delete this item?",
    addItem: "Add item",
    amount: "Amount",
    detail: "Details",
    detailPh: "e.g. chicken rice, BTS fare",
    category: "Category",
    categoryHint: "Optional. AI picks one when you save",
    aiPick: "✨ Let AI pick",
    aiThinking: "Thinking…",
    date: "Date",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    needNote: "Type the details first, then AI can pick a category",
    aiDown: "AI isn't available right now. Pick a category yourself",
    amountInvalid: "Enter an amount above 0",
    spent: (day: string, amt: string) => `${day}: spent ${amt} THB`,
    theme: "Theme",
    light: "Light",
    system: "Match device",
    dark: "Dark",
    language: "Language",
  },
};
type Dict = (typeof DICT)["th"];

/* =================================================================
   Preferences: language + theme, saved in this browser
   ================================================================= */
type Theme = "system" | "light" | "dark";
type Prefs = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Dict;
};
const PrefsContext = createContext<Prefs | null>(null);
const usePrefs = () => useContext(PrefsContext)!;

const store = {
  get(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {}
  },
};

function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  const [theme, setThemeState] = useState<Theme>("system");

  // Load saved choices once
  useEffect(() => {
    const l = store.get("lang");
    if (l === "th" || l === "en") setLangState(l);
    const th = store.get("theme");
    if (th === "light" || th === "dark") setThemeState(th);
  }, []);

  // Apply to <html>
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo<Prefs>(
    () => ({
      lang,
      theme,
      t: DICT[lang],
      setLang: (l) => { setLangState(l); store.set("lang", l); },
      setTheme: (x) => { setThemeState(x); store.set("theme", x === "system" ? null : x); },
    }),
    [lang, theme]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

function PrefsBar() {
  const { lang, setLang, theme, setTheme, t } = usePrefs();
  const themes: { v: Theme; icon: string; label: string }[] = [
    { v: "light", icon: "☀️", label: t.light },
    { v: "system", icon: "🖥️", label: t.system },
    { v: "dark", icon: "🌙", label: t.dark },
  ];
  return (
    <div className="prefs">
      <div className="pill" role="radiogroup" aria-label={t.language}>
        {(["th", "en"] as Lang[]).map((l) => (
          <button key={l} role="radio" aria-checked={lang === l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
            {l === "th" ? "TH" : "EN"}
          </button>
        ))}
      </div>
      <div className="pill" role="radiogroup" aria-label={t.theme}>
        {themes.map((o) => (
          <button key={o.v} role="radio" aria-checked={theme === o.v} aria-label={o.label} title={o.label}
            className={theme === o.v ? "on" : ""} onClick={() => setTheme(o.v)}>
            {o.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   Helpers
   ================================================================= */
type TxType = "income" | "expense";
type Tx = {
  id: string;
  type: TxType;
  amount: number;
  category: string | null;
  note: string | null;
  occurred_on: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const thisMonth = () => today().slice(0, 7);
const parseMonth = (m: string) => m.split("-").map(Number) as [number, number];
const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = parseMonth(m);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthLabel = (m: string, locale: string) => {
  const [y, mo] = parseMonth(m);
  return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
};
const dayLabel = (iso: string, locale: string) => {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" });
};
const money = (n: number, locale: string) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
const catLabel = (c: string | null | undefined, lang: Lang) => (c && lang === "en" ? CAT_EN[c] ?? c : c ?? "");

/* =================================================================
   Page
   ================================================================= */
export default function Home() {
  return (
    <PrefsProvider>
      <style>{css}</style>
      <App />
    </PrefsProvider>
  );
}

function App() {
  const { t } = usePrefs();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="shell"><p className="muted pad">{t.loading}</p></main>;
  return user ? <Tracker user={user} /> : <AuthForm />;
}

/* ---------------- Login / Sign up ---------------- */

function AuthForm() {
  const { t } = usePrefs();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg(t.checkEmail);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(`${t.loginFailed} (${error.message})`);
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="auth-top"><PrefsBar /></div>
      <div className="auth-brand">
        <span className="logo">฿</span>
        <h1>{t.brandTitle}</h1>
        <p className="muted">{t.brandSub}</p>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>{t.login}</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>{t.signup}</button>
        </div>
        <label className="field">
          <span>{t.email}</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>{t.password}</span>
          <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy}>
          {busy ? t.working : mode === "login" ? t.login : t.createAccount}
        </button>
        {msg && <p className="note">{msg}</p>}
      </form>
    </main>
  );
}

/* ---------------- Main app ---------------- */

function Tracker({ user }: { user: User }) {
  const { t, lang } = usePrefs();
  const L = t.locale;
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", `${month}-01`)
      .lt("occurred_on", `${shiftMonth(month, 1)}-01`)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    else setRows(data as Tx[]);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    setSelectedDay(null);
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) setMsg(error.message);
    else load();
  }

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCat: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const r of rows) {
      const a = Number(r.amount);
      if (r.type === "income") income += a;
      else {
        expense += a;
        const c = r.category || "";
        byCat[c] = (byCat[c] || 0) + a;
        byDay[r.occurred_on] = (byDay[r.occurred_on] || 0) + a;
      }
    }
    const maxDay = Math.max(0, ...Object.values(byDay));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    return { income, expense, balance: income - expense, cats, byDay, maxDay };
  }, [rows]);

  const visible = selectedDay ? rows.filter((r) => r.occurred_on === selectedDay) : rows;
  const grouped = useMemo(() => {
    const g: Record<string, Tx[]> = {};
    for (const r of visible) (g[r.occurred_on] ||= []).push(r);
    return Object.entries(g);
  }, [visible]);

  const scale = Math.max(stats.income, stats.expense, 1);

  return (
    <main className="shell">
      <header className="topbar">
        <span className="logo small">฿</span>
        <PrefsBar />
      </header>
      <div className="who">
        <span className="muted">{user.email}</span>
        <button className="btn-text" onClick={() => supabase.auth.signOut()}>{t.logout}</button>
      </div>

      {msg && <button className="toast" onClick={() => setMsg("")}>{msg}</button>}

      {/* Month + balance */}
      <section className="month">
        <div className="month-nav">
          <button className="icon" aria-label={t.prevMonth} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <h1>{monthLabel(month, L)}</h1>
          <button className="icon" aria-label={t.nextMonth} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth()}>›</button>
        </div>

        <p className="balance-label">{t.balanceLabel}</p>
        <p className={`balance ${stats.balance < 0 ? "neg" : ""}`}>
          {stats.balance < 0 ? "−" : ""}{money(Math.abs(stats.balance), L)}<small> {t.currency}</small>
        </p>

        <div className="flow">
          <div className="flow-row">
            <span>{t.income}</span>
            <div className="flow-track"><div className="flow-fill in" style={{ width: `${(stats.income / scale) * 100}%` }} /></div>
            <b className="pos">{money(stats.income, L)}</b>
          </div>
          <div className="flow-row">
            <span>{t.expense}</span>
            <div className="flow-track"><div className="flow-fill out" style={{ width: `${(stats.expense / scale) * 100}%` }} /></div>
            <b className="neg">{money(stats.expense, L)}</b>
          </div>
        </div>
      </section>

      {/* Spending calendar */}
      <section className="panel">
        <div className="panel-head">
          <h2>{t.dailySpend}</h2>
          {selectedDay && <button className="btn-text" onClick={() => setSelectedDay(null)}>{t.viewMonth}</button>}
        </div>
        <SpendCalendar
          month={month}
          byDay={stats.byDay}
          maxDay={stats.maxDay}
          selected={selectedDay}
          onSelect={(d) => setSelectedDay(d === selectedDay ? null : d)}
        />
      </section>

      {/* Categories */}
      {stats.cats.length > 0 && (
        <section className="panel">
          <h2>{t.byCategory}</h2>
          <ul className="cats">
            {stats.cats.map(([c, v]) => (
              <li key={c || "none"}>
                <span className="cat-icon" aria-hidden>{CAT_ICON[c] ?? "•"}</span>
                <div className="cat-body">
                  <div className="cat-line"><span>{c ? catLabel(c, lang) : t.noCategory}</span><b>{money(v, L)}</b></div>
                  <div className="cat-track"><div style={{ width: `${(v / stats.expense) * 100}%` }} /></div>
                </div>
                <span className="cat-pct">{Math.round((v / stats.expense) * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Transactions */}
      <section className="panel">
        <h2>{selectedDay ? dayLabel(selectedDay, L) : t.allItems}</h2>
        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : grouped.length === 0 ? (
          <div className="empty">
            <p>{selectedDay ? t.noItemsDay : t.noItemsMonth}</p>
            <button className="btn-primary slim" onClick={() => setSheetOpen(true)}>{t.addFirst}</button>
          </div>
        ) : (
          grouped.map(([d, items]) => (
            <div key={d} className="day">
              {!selectedDay && <h3>{dayLabel(d, L)}</h3>}
              <ul>
                {items.map((r) => (
                  <li key={r.id} className="tx">
                    <span className="cat-icon" aria-hidden>{CAT_ICON[r.category ?? ""] ?? "•"}</span>
                    <div className="tx-body">
                      <span>{r.note || catLabel(r.category, lang) || t.noDetail}</span>
                      <span className="muted small">{r.category ? catLabel(r.category, lang) : t.noCategory}</span>
                    </div>
                    <b className={r.type === "income" ? "pos" : "neg"}>
                      {r.type === "income" ? "+" : "−"}{money(Number(r.amount), L)}
                    </b>
                    <button className="icon del" aria-label={t.deleteItem} onClick={() => remove(r.id)}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <button className="fab" aria-label={t.addItem} onClick={() => setSheetOpen(true)}>＋</button>

      {sheetOpen && (
        <AddSheet
          defaultDate={selectedDay ?? (month === thisMonth() ? today() : `${month}-01`)}
          onClose={() => setSheetOpen(false)}
          onSaved={(savedDate) => {
            setSheetOpen(false);
            if (savedDate.slice(0, 7) !== month) setMonth(savedDate.slice(0, 7));
            else load();
          }}
          onError={setMsg}
        />
      )}
    </main>
  );
}

/* ---------------- Spending calendar ---------------- */

function SpendCalendar({
  month, byDay, maxDay, selected, onSelect,
}: {
  month: string;
  byDay: Record<string, number>;
  maxDay: number;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const { t } = usePrefs();
  const [y, mo] = parseMonth(month);
  const first = new Date(y, mo - 1, 1).getDay();
  const days = new Date(y, mo, 0).getDate();
  const now = today();

  const cells: (string | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];

  return (
    <div className="cal">
      {t.weekdays.map((w) => <span key={w} className="cal-wd">{w}</span>)}
      {cells.map((iso, i) => {
        if (!iso) return <span key={`b${i}`} />;
        const spent = byDay[iso] || 0;
        const level = maxDay ? spent / maxDay : 0;
        const tint = spent ? Math.round(18 + level * 72) : 0;
        return (
          <button
            key={iso}
            className={`cal-day ${iso === now ? "today" : ""} ${iso === selected ? "sel" : ""} ${iso > now ? "future" : ""}`}
            style={spent ? ({ "--tint": `${tint}%` } as React.CSSProperties) : undefined}
            data-spent={spent ? "1" : undefined}
            onClick={() => onSelect(iso)}
            aria-label={t.spent(dayLabel(iso, t.locale), money(spent, t.locale))}
            aria-pressed={iso === selected}
          >
            <span>{Number(iso.slice(8))}</span>
            {spent > 0 && <small>{spent >= 1000 ? `${(spent / 1000).toFixed(1)}k` : Math.round(spent)}</small>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Add sheet ---------------- */

function AddSheet({
  defaultDate, onClose, onSaved, onError,
}: {
  defaultDate: string;
  onClose: () => void;
  onSaved: (date: string) => void;
  onError: (m: string) => void;
}) {
  const { t, lang } = usePrefs();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function askAI(text: string): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke("categorize", { body: { note: text } });
    if (error || !data?.category) return null;
    return data.category as string;
  }

  async function suggest() {
    if (!note.trim()) return setHint(t.needNote);
    setSuggesting(true);
    setHint("");
    const cat = await askAI(note);
    if (cat) setCategory(cat);
    else setHint(t.aiDown);
    setSuggesting(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return setHint(t.amountInvalid);
    setSaving(true);

    let cat = category;
    if (!cat && note.trim()) cat = (await askAI(note)) ?? "";

    const { error } = await supabase.from("transactions").insert({
      type,
      amount: value,
      note: note.trim() || null,
      category: cat || null,
      occurred_on: date,
    });
    setSaving(false);
    if (error) return onError(error.message);
    onSaved(date);
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.addItem}
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <div className="sheet-grip" aria-hidden />
        <div className="seg big">
          <button type="button" className={type === "expense" ? "on out" : ""} onClick={() => setType("expense")}>{t.expense}</button>
          <button type="button" className={type === "income" ? "on in" : ""} onClick={() => setType("income")}>{t.income}</button>
        </div>

        <label className="amount">
          <span className="sr">{t.amount}</span>
          <span className="cur">฿</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t.detail}</span>
          <input placeholder={t.detailPh} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="field">
          <span>{t.category} <em className="muted">{t.categoryHint}</em></span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                className={`chip ${category === c ? "on" : ""}`}
                onClick={() => setCategory(category === c ? "" : c)}
                aria-pressed={category === c}
              >
                {CAT_ICON[c]} {catLabel(c, lang)}
              </button>
            ))}
            <button type="button" className="chip ai" onClick={suggest} disabled={suggesting}>
              {suggesting ? t.aiThinking : t.aiPick}
            </button>
          </div>
        </div>

        <label className="field">
          <span>{t.date}</span>
          <input type="date" required value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>

        {hint && <p className="note">{hint}</p>}

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" disabled={saving}>{saving ? t.saving : t.save}</button>
        </div>
      </form>
    </div>
  );
}

/* =================================================================
   Styles
   Light by default. Dark when the device is dark (and the user did
   not choose light), or when the user picks dark.
   ================================================================= */

const DARK_VARS = `
  --paper:#0D1917; --surface:#15231F; --ink:#E3EEEA; --muted:#93A8A2; --line:#25372F;
  --in:#4CC48D; --out:#F0789A; --focus:#7FA8FF; --shadow:rgba(0,0,0,.5);
  color-scheme: dark;
`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap');

:root {
  --paper:#E9EFEC; --surface:#FFFFFF; --ink:#14302B; --muted:#5D716C; --line:#D3DDD9;
  --in:#1D7F55; --out:#B5385C; --focus:#2C6BED; --shadow:rgba(20,48,43,.55);
  --r-lg:22px; --r-md:14px; --r-sm:10px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { ${DARK_VARS} }
}
:root[data-theme="dark"] { ${DARK_VARS} }

* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans", "IBM Plex Sans Thai", system-ui, sans-serif; font-size:16px; line-height:1.55;
  -webkit-font-smoothing:antialiased; transition:background-color .2s ease, color .2s ease; }
h1, h2, h3, .balance, .amount input, .logo { font-family:"Bai Jamjuree", "IBM Plex Sans Thai", sans-serif; }
b, .balance, .amount input, .cal-day small, .cat-pct { font-variant-numeric: tabular-nums; }
h2 { font-size:1.05rem; margin:0 0 14px; font-weight:600; }
h3 { font-size:.85rem; font-weight:500; color:var(--muted); margin:18px 0 4px; }
ul { list-style:none; margin:0; padding:0; }
button { font:inherit; color:inherit; cursor:pointer; }
button:disabled { opacity:.45; cursor:default; }
:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.muted { color:var(--muted); } .small { font-size:.8rem; }
.pos { color:var(--in); } .neg { color:var(--out); }
.sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
.pad { padding:24px; }

/* layout */
.shell { max-width:720px; margin:0 auto; padding:16px 16px 110px; }
.topbar { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; }
.who { display:flex; align-items:center; justify-content:flex-end; gap:10px; font-size:.85rem; min-width:0; margin-bottom:4px; }
.who .muted { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60vw; }
.logo { display:inline-grid; place-items:center; width:56px; height:56px; border-radius:18px;
  background:var(--ink); color:var(--paper); font-size:1.9rem; font-weight:700; }
.logo.small { width:38px; height:38px; border-radius:12px; font-size:1.25rem; }

/* language + theme pills */
.prefs { display:flex; gap:8px; }
.pill { display:flex; padding:3px; gap:2px; background:var(--surface); border:1px solid var(--line); border-radius:99px; }
.pill button { border:0; background:transparent; border-radius:99px; padding:4px 10px; font-size:.8rem; font-weight:600; color:var(--muted); min-width:34px; }
.pill button.on { background:var(--ink); color:var(--paper); }

/* buttons */
.btn-primary { width:100%; border:0; border-radius:var(--r-md); padding:14px 18px;
  background:var(--ink); color:var(--paper); font-weight:600; }
.btn-primary.slim { width:auto; padding:10px 18px; }
.btn-ghost { border:1px solid var(--line); background:transparent; border-radius:var(--r-md); padding:14px 18px; }
.btn-text { border:0; background:none; padding:4px 0; color:var(--ink); text-decoration:underline; text-underline-offset:3px; font-size:.85rem; }
.icon { border:0; background:none; width:40px; height:40px; border-radius:50%; font-size:1.5rem; line-height:1; }
.icon:hover:not(:disabled) { background:var(--line); }

/* segmented control */
.seg { display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:4px; background:var(--paper); border-radius:var(--r-md); margin-bottom:18px; }
.seg button { border:0; background:transparent; border-radius:var(--r-sm); padding:10px; font-weight:500; color:var(--muted); }
.seg .on { background:var(--surface); color:var(--ink); box-shadow:0 1px 0 var(--line); }
.seg.big .on.out { background:var(--out); color:#fff; }
.seg.big .on.in { background:var(--in); color:#fff; }

/* fields */
.field { display:block; margin-bottom:16px; }
.field > span { display:block; font-size:.85rem; color:var(--muted); margin-bottom:6px; }
.field em { font-style:normal; font-size:.78rem; margin-left:4px; }
.field input { width:100%; padding:12px 14px; font:inherit; color:var(--ink);
  background:var(--paper); border:1px solid transparent; border-radius:var(--r-sm); }
.field input:focus { border-color:var(--ink); outline:none; }
.note { font-size:.88rem; background:var(--paper); border-left:3px solid var(--out); padding:10px 12px; border-radius:6px; margin:4px 0 12px; }

/* auth */
.auth { min-height:100vh; display:grid; place-content:center; gap:28px; padding:24px; position:relative; }
.auth-top { position:absolute; top:16px; right:16px; }
.auth-brand { text-align:center; }
.auth-brand h1 { font-size:1.9rem; margin:16px 0 4px; letter-spacing:-.01em; }
.auth-brand p { margin:0; }
.auth-card { width:min(380px, 100%); background:var(--surface); border-radius:var(--r-lg); padding:22px; }

/* month header */
.month { padding:8px 4px 20px; }
.month-nav { display:flex; align-items:center; gap:4px; margin-left:-10px; }
.month-nav h1 { font-size:1.15rem; font-weight:600; margin:0; }
.balance-label { margin:18px 0 0; color:var(--muted); font-size:.9rem; }
.balance { font-size:clamp(2.6rem, 11vw, 4.2rem); font-weight:700; line-height:1.05; margin:2px 0 22px; letter-spacing:-.02em; }
.balance small { font-size:.32em; font-weight:500; color:var(--muted); letter-spacing:0; }
.flow { display:grid; gap:10px; }
.flow-row { display:grid; grid-template-columns:72px 1fr auto; align-items:center; gap:12px; font-size:.9rem; }
.flow-row span { color:var(--muted); }
.flow-track { height:10px; background:var(--surface); border-radius:99px; overflow:hidden; }
.flow-fill { height:100%; border-radius:99px; transition:width .5s ease; }
.flow-fill.in { background:var(--in); } .flow-fill.out { background:var(--out); }

/* panels */
.panel { background:var(--surface); border-radius:var(--r-lg); padding:20px; margin-bottom:12px; }
.panel-head { display:flex; justify-content:space-between; align-items:baseline; }

/* calendar */
.cal { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; }
.cal-wd { text-align:center; font-size:.75rem; color:var(--muted); padding-bottom:2px; }
.cal-day { aspect-ratio:1; border:0; border-radius:12px; background:var(--paper);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; padding:2px; min-width:0; }
.cal-day span { font-size:.85rem; font-weight:500; }
.cal-day small { font-size:.62rem; opacity:.85; line-height:1.1; }
.cal-day[data-spent] { background:color-mix(in srgb, var(--out) var(--tint), var(--paper)); }
.cal-day.today { box-shadow:inset 0 0 0 2px var(--ink); }
.cal-day.sel { outline:2px solid var(--ink); outline-offset:2px; }
.cal-day.future { opacity:.4; }

/* categories */
.cats { display:grid; gap:14px; }
.cats li { display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; }
.cat-icon { width:38px; height:38px; display:grid; place-items:center; background:var(--paper); border-radius:12px; font-size:1.1rem; }
.cat-line { display:flex; justify-content:space-between; font-size:.92rem; margin-bottom:6px; }
.cat-track { height:6px; background:var(--paper); border-radius:99px; overflow:hidden; }
.cat-track div { height:100%; background:var(--ink); border-radius:99px; }
.cat-pct { font-size:.8rem; color:var(--muted); width:4ch; text-align:right; }

/* transactions */
.tx { display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; gap:12px; padding:10px 0; }
.tx + .tx { border-top:1px solid var(--line); }
.tx-body { display:flex; flex-direction:column; min-width:0; }
.tx-body span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.del { width:32px; height:32px; font-size:.85rem; color:var(--muted); }
.empty { text-align:center; padding:18px 0 6px; color:var(--muted); }
.empty p { margin:0 0 14px; }

/* toast */
.toast { display:block; width:100%; text-align:left; border:0; border-left:3px solid var(--out);
  background:var(--surface); padding:12px 14px; border-radius:var(--r-sm); margin-bottom:12px; }

/* floating add button */
.fab { position:fixed; right:max(20px, calc(50vw - 340px)); bottom:24px; width:62px; height:62px; border:0;
  border-radius:20px; background:var(--ink); color:var(--paper); font-size:1.8rem;
  box-shadow:0 10px 24px -8px var(--shadow); }

/* bottom sheet */
.backdrop { position:fixed; inset:0; background:rgba(8,20,17,.45); display:flex; align-items:flex-end; justify-content:center; z-index:10; }
.sheet { width:min(560px, 100%); max-height:92vh; overflow-y:auto; background:var(--surface);
  border-radius:26px 26px 0 0; padding:10px 20px calc(20px + env(safe-area-inset-bottom));
  animation:rise .28s cubic-bezier(.2,.8,.2,1); }
.sheet-grip { width:40px; height:4px; border-radius:99px; background:var(--line); margin:4px auto 16px; }
.amount { display:flex; align-items:baseline; gap:6px; margin:4px 0 20px; border-bottom:2px solid var(--line); }
.amount:focus-within { border-color:var(--ink); }
.cur { font-family:"Bai Jamjuree", sans-serif; font-size:1.8rem; color:var(--muted); }
.amount input { flex:1; min-width:0; border:0; background:transparent; color:var(--ink); font-size:2.8rem; font-weight:600; padding:4px 0; outline:none; }
.chips { display:flex; flex-wrap:wrap; gap:8px; }
.chip { border:1px solid var(--line); background:transparent; border-radius:99px; padding:7px 12px; font-size:.88rem; }
.chip.on { background:var(--ink); color:var(--paper); border-color:var(--ink); }
.chip.ai { border-style:dashed; }
.sheet-actions { display:grid; grid-template-columns:1fr 2fr; gap:10px; margin-top:8px; }

@keyframes rise { from { transform:translateY(100%); } to { transform:none; } }
@media (prefers-reduced-motion: reduce) {
  .sheet { animation:none; } .flow-fill { transition:none; } body { transition:none; }
}
@media (min-width:640px) {
  .backdrop { align-items:center; }
  .sheet { border-radius:26px; }
}
input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
`;
