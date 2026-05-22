# Swapping the mock for real Supabase

The mocked `src/utils/supabase.ts` exports a set of functions that the rest of the app uses. When you wire in real Supabase, you can either:

1. **Replace the file** so the function names stay the same and call sites don't change. _(Recommended.)_
2. Use `@supabase/supabase-js` directly at call sites and delete the helpers.

This doc covers option 1.

## Function-by-function mapping

| Mock helper | Real Supabase equivalent |
| --- | --- |
| `getWhitelist()` | Read `import.meta.env.VITE_WHITELISTED_EMAILS`. Same as the mock — no change needed. |
| `isWhitelisted(email)` | Same — pure client-side check against the env var. |
| `upsertUser(email)` | `supabase.from('users').upsert({ email, whitelisted, last_login: new Date().toISOString() }, { onConflict: 'email' })` |
| `issueAuthCode(email)` | Call a Supabase Edge Function (e.g. `request-code`) that generates the code server-side, inserts a row in `auth_codes`, and emails it via SendGrid. **Do NOT generate the code on the client in production.** |
| `verifyAuthCode(email, code)` | Call an Edge Function (`verify-code`) that selects an unused, unexpired row, marks it `used = true`, and returns success. |
| `listPosts(limit?)` | `supabase.from('posts').select().order('created_at', { ascending: false }).limit(limit ?? 1000)` |
| `createPost({ title, content, image_url, author_email })` | `supabase.from('posts').insert({ ... }).select().single()` |
| `listMessages()` | `supabase.from('messages').select().order('created_at')` |
| `sendMessage(sender_email, content)` | `supabase.from('messages').insert({ sender_email, content }).select().single()` |
| `subscribe(channel, cb)` | `supabase.channel(channel).on('postgres_changes', { event: '*', schema: 'public', table: channel }, cb).subscribe()` — return the unsubscribe function. |
| `getSession()` / `setSession(email)` / `clearSession()` | Either keep the localStorage approach (with a real JWT issued by the Edge Function) or move to Supabase Auth's `signInWithOtp`. |

## Image uploads

`PostForm.tsx` currently reads the image as a base64 data URL. Replace with:

```ts
const { data, error } = await supabase
  .storage
  .from('post-images')
  .upload(`${crypto.randomUUID()}-${file.name}`, file, { upsert: false });
if (error) throw error;
const { data: pub } = supabase.storage.from('post-images').getPublicUrl(data.path);
setImageUrl(pub.publicUrl);
```

Create the bucket once with public read access:

```sql
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true);
```

## Edge Function: request-code (skeleton)

```ts
// supabase/functions/request-code/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHITELIST = (Deno.env.get("WHITELISTED_EMAILS") ?? "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

serve(async (req) => {
  const { email } = await req.json();
  const normalized = String(email).trim().toLowerCase();
  if (!WHITELIST.includes(normalized)) {
    return new Response(JSON.stringify({ ok: false, reason: "not_whitelisted" }), { status: 403 });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.from("auth_codes").insert({
    email: normalized,
    code,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  // Send the email via SendGrid:
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: normalized }] }],
      from: { email: "noreply@your-domain.com", name: "Self-Healing" },
      subject: `Sign-in code: ${code}`,
      content: [{ type: "text/plain", value: `Your code is ${code}. It expires in 10 minutes.` }],
    }),
  });
  return new Response(JSON.stringify({ ok: true }));
});
```

## Edge Function: verify-code (skeleton)

```ts
// supabase/functions/verify-code/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { email, code } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data } = await supabase
    .from("auth_codes")
    .select()
    .eq("email", String(email).toLowerCase())
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return new Response(JSON.stringify({ ok: false }), { status: 401 });

  await supabase.from("auth_codes").update({ used: true }).eq("id", data.id);
  // Issue your own JWT here, or use supabase.auth.signInWithOtp under the hood.
  return new Response(JSON.stringify({ ok: true, token: crypto.randomUUID() }));
});
```
