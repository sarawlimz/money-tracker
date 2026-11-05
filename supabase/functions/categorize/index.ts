const CATEGORIES = ["อาหาร", "เดินทาง", "ที่พัก", "ช้อปปิ้ง", "บันเทิง", "สุขภาพ", "เงินเดือน", "อื่นๆ"];
const MODEL = "gemini-flash-latest"; // เช็คชื่อรุ่นล่าสุดใน AI Studio
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { note } = await req.json();
  const prompt = `จัดหมวดหมู่รายการนี้ ตอบเพียงคำเดียวจากรายการ: ${CATEGORIES.join(", ")}\nรายการ: ${note}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get("GEMINI_API_KEY")!,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const category = CATEGORIES.includes(raw) ? raw : "อื่นๆ"; // กัน AI ตอบนอกรายการ

  return new Response(JSON.stringify({ category }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
