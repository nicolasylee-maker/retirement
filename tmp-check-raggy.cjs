const { createClient } = require("@supabase/supabase-js");
const URL = "https://kovxoeovijedvxmulbke.supabase.co";
const SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnhvZW92aWplZHZ4bXVsYmtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ2ODQ3NiwiZXhwIjoyMDg4MDQ0NDc2fQ.HJC0MKt7WIfCOHG70zy16NkD8mL6pGSZfy9iECqxKS4";
const c = createClient(URL, SERVICE_ROLE);
(async () => {
  const { data: { users } } = await c.auth.admin.listUsers();
  const raggy = users.find(u => u.email === "raggydiaper@gmail.com");
  console.log("raggydiaper user id:", raggy?.id);
  
  const { data: scenarios } = await c.from("scenarios").select("id, user_id, name, data, updated_at, created_at").eq("user_id", raggy.id).order("updated_at", { ascending: false });
  console.log("\nScenario count:", scenarios.length);
  scenarios.forEach(s => {
    const d = s.data;
    console.log("---");
    console.log("  DB row id:", s.id);
    console.log("  DB name col:", s.name);
    console.log("  data.id:", d?.id);
    console.log("  data.name:", d?.name);
    console.log("  created:", s.created_at);
    console.log("  updated:", s.updated_at);
  });
})();
