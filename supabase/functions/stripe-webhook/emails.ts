// Branded billing emails (receipt, failed payment, renewal reminder, cancellation scheduled, Pro ended).
// Same look as the account emails in supabase/templates. Each builder returns { subject, preheader, html }.

export const APP = "https://app.capitolreceipts.com";
const F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const usd = (cents: number) => "$" + (cents / 100).toFixed(cents % 100 ? 2 : 0);
export const day = (sec: number) => new Date(sec * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export type Plan = "monthly" | "yearly";
const planName = (p: Plan) => p === "yearly" ? "Pro · yearly" : "Pro · monthly";
const planPhrase = (p: Plan) => p === "yearly" ? "your yearly Pro plan" : "your monthly Pro plan";

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:#0f1f40;border-radius:10px"><a href="${href}" style="display:inline-block;padding:13px 22px;font:700 15px ${F};color:#ffffff;text-decoration:none">${label}</a></td></tr></table>`;

const rows = (items: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;border-top:1px solid #e6e8ec">${items.map(([k, v], i) =>
    `<tr><td style="padding:11px 0;border-bottom:1px solid #e6e8ec;font:14.5px ${F};color:#6b7280">${k}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #e6e8ec;font:${i === 0 ? "700 " : ""}14.5px ${F};color:#0f1f40">${v}</td></tr>`).join("")}</table>`;

function shell(o: { title: string; preheader: string; pro?: boolean; body: string; foot: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0f1f40;padding:18px 28px"><span style="font:800 18px ${F};color:#ffffff"><span style="background:#c8323a;padding:2px 7px;border-radius:5px">Capitol</span> Receipts</span>${o.pro ? `<span style="font:700 11px ${F};background:#ffffff;color:#0f1f40;padding:3px 8px;border-radius:999px;margin-left:8px;vertical-align:2px">PRO</span>` : ""}</td></tr>
<tr><td style="padding:28px 28px 8px">
<h1 style="margin:0 0 10px;font:800 24px/1.25 ${F};color:#0f1f40">${o.title}</h1>
${o.body}
</td></tr>
<tr><td style="padding:18px 28px 26px"><p style="margin:0;padding-top:16px;border-top:1px solid #e6e8ec;font:12.5px/1.55 ${F};color:#6b7280">${o.foot}</p></td></tr>
</table>
<p style="margin:14px 0 0;font:12px/1.5 ${F};color:#6b7280">Capitol Receipts · Squared Away Labs LLC<br><a href="${APP}" style="color:#6b7280">app.capitolreceipts.com</a> · <a href="https://www.capitolreceipts.com/terms" style="color:#6b7280">Terms</a> · <a href="https://www.capitolreceipts.com/privacy" style="color:#6b7280">Privacy</a></p>
</td></tr></table></body></html>`;
}
const p = (t: string) => `<p style="margin:0 0 12px;font:16px/1.55 ${F};color:#1f2937">${t}</p>`;
const small = (t: string) => `<p style="margin:14px 0 0;font:13.5px/1.55 ${F};color:#6b7280">${t}</p>`;
const manage = `Manage or cancel any time from <a href="${APP}/?go=pro" style="color:#2557a8">the Pro screen</a> in the app.`;

export function receipt(o: { amount: number; plan: Plan; paidAt: number; periodEnd?: number; number?: string; card?: string; invoiceUrl?: string; pdfUrl?: string; email: string }) {
  const items: [string, string][] = [["Amount paid", usd(o.amount)], ["Plan", planName(o.plan)], ["Date", day(o.paidAt)]];
  if (o.periodEnd) items.push(["Next renewal", day(o.periodEnd)]);
  if (o.card) items.push(["Paid with", esc(o.card)]);
  if (o.number) items.push(["Receipt number", esc(o.number)]);
  const links = [o.invoiceUrl && `<a href="${o.invoiceUrl}" style="color:#2557a8">View invoice</a>`, o.pdfUrl && `<a href="${o.pdfUrl}" style="color:#2557a8">Download PDF</a>`].filter(Boolean).join(" · ");
  return {
    subject: `Your Capitol Receipts receipt · ${usd(o.amount)}`,
    preheader: `Thanks for supporting nonpartisan records. ${usd(o.amount)} paid for ${planPhrase(o.plan)}.`,
    html: shell({
      title: "Thanks. You're paid up.", pro: true,
      preheader: `${usd(o.amount)} paid for ${planPhrase(o.plan)}.`,
      body: p("Your payment went through and Pro is active: daily trade alerts, your stock watchlist, the conflict radar and CSV downloads.") + rows(items) +
        (links ? small(links) : "") + button(`${APP}/?go=pro`, "Open Capitol Receipts"),
      foot: `This receipt was sent to ${esc(o.email)}. ${manage} Questions about a charge? Reply to this email.`,
    }),
  };
}

export function failed(o: { amount: number; plan: Plan; nextTry?: number; email: string }) {
  return {
    subject: "Your Capitol Receipts payment didn't go through",
    preheader: "Update your card to keep Pro.",
    html: shell({
      title: "Your payment didn't go through", pro: true, preheader: "Update your card to keep Pro.",
      body: p(`We couldn't charge ${usd(o.amount)} for ${planPhrase(o.plan)}. This usually means the card expired or the bank declined it.`) +
        p(o.nextTry ? `We'll try again on <b>${day(o.nextTry)}</b>. Update your card before then to keep Pro without a break.` : "Update your card to keep Pro without a break.") +
        button(`${APP}/?go=pro`, "Update my card") + small("Open the Pro screen and tap <b>Manage</b> to change your payment method."),
      foot: `Sent to ${esc(o.email)}. If you meant to stop, you don't need to do anything; Pro will end and your account stays free.`,
    }),
  };
}

export function upcoming(o: { amount: number; plan: Plan; renewsAt: number; email: string }) {
  return {
    subject: `Pro renews on ${day(o.renewsAt)}`,
    preheader: `${usd(o.amount)} for another year of Pro.`,
    html: shell({
      title: "Your Pro year renews soon", pro: true, preheader: `${usd(o.amount)} on ${day(o.renewsAt)}.`,
      body: p(`Heads up: ${planPhrase(o.plan)} renews automatically on <b>${day(o.renewsAt)}</b> for <b>${usd(o.amount)}</b>. You don't need to do anything to keep it.`) +
        p("Want to switch to monthly or cancel? Do it before that date and you won't be charged.") + button(`${APP}/?go=pro`, "Review my plan"),
      foot: `Sent to ${esc(o.email)}. ${manage}`,
    }),
  };
}

export function trialEnding(o: { amount: number; plan: Plan; endsAt: number; email: string }) {
  return {
    subject: `Your free week of Pro ends ${day(o.endsAt)}`,
    preheader: `Then ${usd(o.amount)} for ${planPhrase(o.plan)} unless you cancel.`,
    html: shell({
      title: "Your free week ends soon", pro: true, preheader: `Then ${usd(o.amount)} unless you cancel.`,
      body: p(`Your free week of Pro ends on <b>${day(o.endsAt)}</b>. After that, the card you added will be charged <b>${usd(o.amount)}</b> for ${planPhrase(o.plan)}.`) +
        p("Keeping Pro? You don't need to do anything. Not for you? Cancel before that date and you won't be charged.") +
        button(`${APP}/?go=pro`, "Review my plan"),
      foot: `Sent to ${esc(o.email)}. ${manage}`,
    }),
  };
}

export function canceling(o: { plan: Plan; endsAt: number; email: string; trial?: boolean }) {
  return {
    subject: "Your Pro plan is set to end",
    preheader: `You'll keep Pro until ${day(o.endsAt)}.`,
    html: shell({
      title: "Your Pro plan is set to end", pro: true, preheader: `You'll keep Pro until ${day(o.endsAt)}.`,
      body: p(o.trial ? `You've cancelled before your free week ended, so you won't be charged. You'll keep every Pro feature until <b>${day(o.endsAt)}</b>.` : `You've cancelled ${planPhrase(o.plan)}. You won't be charged again, and you'll keep every Pro feature until <b>${day(o.endsAt)}</b>.`) +
        p("After that your account stays free, along with everyone you follow. Changed your mind? You can keep Pro with one tap.") +
        button(`${APP}/?go=pro`, "Keep Pro"),
      foot: `Sent to ${esc(o.email)}. We'd love to know why you left. Just reply to this email.`,
    }),
  };
}

export function ended(o: { email: string }) {
  return {
    subject: "Your Pro plan has ended",
    preheader: "Your account is still here, and it's free.",
    html: shell({
      title: "Your Pro plan has ended", preheader: "Your account is still here, and it's free.",
      body: p("Pro has ended on your account, so daily alerts, the watchlist, the conflict radar and CSV downloads are switched off. Every profile and record is still free, and you'll get a weekly update for up to 5 people you follow.") +
        button(`${APP}/?go=pro`, "Come back to Pro"),
      foot: `Sent to ${esc(o.email)}. Thanks for supporting nonpartisan records while you did.`,
    }),
  };
}
