"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// Must match the list in supabase/functions/categorize/index.ts
const CATEGORIES = ["อาหาร", "เดินทาง", "ที่พัก", "ช้อปปิ้ง", "บันเทิง", "สุขภาพ", "เงินเดือน", "อื่นๆ"];
const CAT_ICON: Record<string, string> = {
  อาหาร: "🍜", เดินทาง: "🚆", ที่พัก: "🏠", ช้อปปิ้ง: "🛍️", บันเทิง: "🎬",
  สุขภาพ: "💊", เงินเดือน: "💼", อื่นๆ: "📦",
};
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type TxType = "income" | "expense";
type Tx = {
  id: string;
  type: TxType;
  amount: number;
  category: string | null;
  note: string | null;
  occurred_on: string;
};

/* ---------- date + number helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const thisMonth = () => today().slice(0, 7);
const parseMonth = (m: string) => m.split("-").map(Number) as [number, number];
const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = parseMonth(m);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthLabel = (m: string) => {
  const [y, mo] = parseMonth(m);
  return new Date(y, mo - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
};
const dayLabel = (iso: string) => {
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" });
};
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

/* =================================================================== */

export default function Home() {
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

  return (
    <>
      <style>{css}</style>
      {!ready ? (
        <main className="shell"><p className="muted pad">กำลังโหลด…</p></main>
      ) : user ? (
        <Tracker user={user} />
      ) : (
        <AuthForm />
      )}
    </>
  );
}

/* ---------------- Login / Sign up ---------------- */

function AuthForm() {
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
      else if (!data.session) setMsg("สมัครแล้ว เปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(`${error.message} (${error.code ?? error.status})`);
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="auth-brand">
        <span className="logo">฿</span>
        <h1>บัญชีเงินของฉัน</h1>
        <p className="muted">จดรายรับรายจ่าย แล้วให้ AI ช่วยจัดหมวดให้</p>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>เข้าสู่ระบบ</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>สมัครใหม่</button>
        </div>
        <label className="field">
          <span>อีเมล</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy}>
          {busy ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
        </button>
        {msg && <p className="note">{msg}</p>}
      </form>
    </main>
  );
}

/* ---------------- Main app ---------------- */

function Tracker({ user }: { user: User }) {
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
    if (!confirm("ลบรายการนี้?")) return;
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
        const c = r.category || "ไม่ระบุ";
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
        <div className="who">
          <span className="muted">{user.email}</span>
          <button className="btn-text" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
        </div>
      </header>

      {msg && (
        <button className="toast" onClick={() => setMsg("")}>{msg}</button>
      )}

      {/* Month + balance */}
      <section className="month">
        <div className="month-nav">
          <button className="icon" aria-label="เดือนก่อน" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <h1>{monthLabel(month)}</h1>
          <button className="icon" aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth()}>›</button>
        </div>

        <p className="balance-label">คงเหลือเดือนนี้</p>
        <p className={`balance ${stats.balance < 0 ? "neg" : ""}`}>
          {stats.balance < 0 ? "−" : ""}{baht(Math.abs(stats.balance))}<small> บาท</small>
        </p>

        <div className="flow">
          <div className="flow-row">
            <span>รายรับ</span>
            <div className="flow-track"><div className="flow-fill in" style={{ width: `${(stats.income / scale) * 100}%` }} /></div>
            <b className="pos">{baht(stats.income)}</b>
          </div>
          <div className="flow-row">
            <span>รายจ่าย</span>
            <div className="flow-track"><div className="flow-fill out" style={{ width: `${(stats.expense / scale) * 100}%` }} /></div>
            <b className="neg">{baht(stats.expense)}</b>
          </div>
        </div>
      </section>

      {/* Spending calendar — the signature element */}
      <section className="panel">
        <div className="panel-head">
          <h2>ใช้จ่ายรายวัน</h2>
          {selectedDay && (
            <button className="btn-text" onClick={() => setSelectedDay(null)}>ดูทั้งเดือน</button>
          )}
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
          <h2>รายจ่ายตามหมวด</h2>
          <ul className="cats">
            {stats.cats.map(([c, v]) => (
              <li key={c}>
                <span className="cat-icon" aria-hidden>{CAT_ICON[c] ?? "•"}</span>
                <div className="cat-body">
                  <div className="cat-line"><span>{c}</span><b>{baht(v)}</b></div>
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
        <h2>{selectedDay ? dayLabel(selectedDay) : "รายการทั้งหมด"}</h2>
        {loading ? (
          <p className="muted">กำลังโหลด…</p>
        ) : grouped.length === 0 ? (
          <div className="empty">
            <p>{selectedDay ? "วันนี้ยังไม่มีรายการ" : "เดือนนี้ยังไม่มีรายการ"}</p>
            <button className="btn-primary slim" onClick={() => setSheetOpen(true)}>เพิ่มรายการแรก</button>
          </div>
        ) : (
          grouped.map(([d, items]) => (
            <div key={d} className="day">
              {!selectedDay && <h3>{dayLabel(d)}</h3>}
              <ul>
                {items.map((r) => (
                  <li key={r.id} className="tx">
                    <span className="cat-icon" aria-hidden>{CAT_ICON[r.category ?? ""] ?? "•"}</span>
                    <div className="tx-body">
                      <span>{r.note || r.category || "ไม่มีรายละเอียด"}</span>
                      <span className="muted small">{r.category || "ไม่ระบุหมวด"}</span>
                    </div>
                    <b className={r.type === "income" ? "pos" : "neg"}>
                      {r.type === "income" ? "+" : "−"}{baht(Number(r.amount))}
                    </b>
                    <button className="icon del" aria-label="ลบรายการ" onClick={() => remove(r.id)}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <button className="fab" aria-label="เพิ่มรายการ" onClick={() => setSheetOpen(true)}>＋</button>

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
  const [y, mo] = parseMonth(month);
  const first = new Date(y, mo - 1, 1).getDay();
  const days = new Date(y, mo, 0).getDate();
  const t = today();

  const cells: (string | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];

  return (
    <div className="cal">
      {WEEKDAYS.map((w) => <span key={w} className="cal-wd">{w}</span>)}
      {cells.map((iso, i) => {
        if (!iso) return <span key={`b${i}`} />;
        const spent = byDay[iso] || 0;
        const level = maxDay ? spent / maxDay : 0;
        const tint = spent ? Math.round(18 + level * 72) : 0;
        return (
          <button
            key={iso}
            className={`cal-day ${iso === t ? "today" : ""} ${iso === selected ? "sel" : ""} ${iso > t ? "future" : ""}`}
            style={spent ? ({ "--tint": `${tint}%` } as React.CSSProperties) : undefined}
            data-spent={spent ? "1" : undefined}
            onClick={() => onSelect(iso)}
            aria-label={`${dayLabel(iso)} ใช้ไป ${baht(spent)} บาท`}
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
    if (!note.trim()) return setHint("พิมพ์รายละเอียดก่อน แล้ว AI จะเลือกหมวดให้");
    setSuggesting(true);
    setHint("");
    const cat = await askAI(note);
    if (cat) setCategory(cat);
    else setHint("AI ใช้งานไม่ได้ตอนนี้ เลือกหมวดเองได้เลย");
    setSuggesting(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return setHint("ใส่จำนวนเงินที่มากกว่า 0");
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
        aria-label="เพิ่มรายการ"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <div className="sheet-grip" aria-hidden />
        <div className="seg big">
          <button type="button" className={type === "expense" ? "on out" : ""} onClick={() => setType("expense")}>รายจ่าย</button>
          <button type="button" className={type === "income" ? "on in" : ""} onClick={() => setType("income")}>รายรับ</button>
        </div>

        <label className="amount">
          <span className="sr">จำนวนเงิน</span>
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
          <span>รายละเอียด</span>
          <input placeholder="เช่น ข้าวมันไก่, ค่า BTS" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="field">
          <span>หมวดหมู่ <em className="muted">ไม่เลือกก็ได้ AI จะเลือกให้ตอนบันทึก</em></span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                className={`chip ${category === c ? "on" : ""}`}
                onClick={() => setCategory(category === c ? "" : c)}
                aria-pressed={category === c}
              >
                {CAT_ICON[c]} {c}
              </button>
            ))}
            <button type="button" className="chip ai" onClick={suggest} disabled={suggesting}>
              {suggesting ? "กำลังคิด…" : "✨ ให้ AI เลือก"}
            </button>
          </div>
        </div>

        <label className="field">
          <span>วันที่</span>
          <input type="date" required value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>

        {hint && <p className="note">{hint}</p>}

        <div className="sheet-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Styles ---------------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap');

:root {
  --paper:#E9EFEC; --surface:#FFFFFF; --ink:#14302B; --muted:#5D716C; --line:#D3DDD9;
  --in:#1D7F55; --out:#B5385C; --focus:#2C6BED;
  --r-lg:22px; --r-md:14px; --r-sm:10px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper:#0D1917; --surface:#15231F; --ink:#E3EEEA; --muted:#93A8A2; --line:#25372F;
    --in:#4CC48D; --out:#F0789A; --focus:#7FA8FF;
    color-scheme: dark;
  }
}

* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans Thai", system-ui, sans-serif; font-size:16px; line-height:1.55;
  -webkit-font-smoothing:antialiased; }
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
.topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.who { display:flex; align-items:center; gap:10px; font-size:.85rem; min-width:0; }
.who .muted { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:46vw; }
.logo { display:inline-grid; place-items:center; width:56px; height:56px; border-radius:18px;
  background:var(--ink); color:var(--paper); font-size:1.9rem; font-weight:700; }
.logo.small { width:38px; height:38px; border-radius:12px; font-size:1.25rem; }

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
.auth { min-height:100vh; display:grid; place-content:center; gap:28px; padding:24px; }
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
.flow-row { display:grid; grid-template-columns:56px 1fr auto; align-items:center; gap:12px; font-size:.9rem; }
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
.cat-pct { font-size:.8rem; color:var(--muted); width:3ch; text-align:right; }

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
  box-shadow:0 10px 24px -8px rgba(20,48,43,.55); }

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
@media (prefers-reduced-motion: reduce) { .sheet { animation:none; } .flow-fill { transition:none; } }
@media (min-width:640px) {
  .backdrop { align-items:center; }
  .sheet { border-radius:26px; }
}
input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
`;
