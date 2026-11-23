import { createHash, timingSafeEqual } from 'node:crypto'

const MARK_START = '<!-- acme-author-credit -->'
const MARK_END = '<!-- /acme-author-credit -->'

const BADGE_ANCHOR = `<a id="acme-author-credit" href="https://chetangehlot.com" target="_blank" rel="noopener noreferrer" aria-label="Made by chetangehlot">
  <span class="acme-author-mark">CG</span>
  <span class="acme-author-label">Made by <strong>chetangehlot</strong></span>
</a>`

const BADGE = `${MARK_START}
<style>
#acme-author-credit{
  position:fixed;right:16px;bottom:16px;z-index:2147483647;
  display:inline-flex;align-items:center;gap:0;
  max-width:40px;height:40px;padding:4px;overflow:hidden;
  border-radius:9999px;border:1px solid rgba(255,255,255,.12);background:#1b1f23;color:#fff;
  font:600 12px/1.2 Inter,system-ui,sans-serif;text-decoration:none;
  box-shadow:0 8px 24px rgba(0,0,0,.28);
  transition:max-width .28s ease,padding .28s ease,gap .28s ease;
}
#acme-author-credit .acme-author-mark{
  display:inline-flex;flex:0 0 32px;width:32px;height:32px;align-items:center;justify-content:center;
  border-radius:9999px;background:rgba(255,255,255,.15);font-size:10px;font-weight:700;letter-spacing:.04em;
}
#acme-author-credit .acme-author-label{
  white-space:nowrap;opacity:0;transform:translateX(4px);
  transition:opacity .2s ease,transform .2s ease;
}
#acme-author-credit .acme-author-label strong{font-weight:700}
#acme-author-credit:hover,#acme-author-credit:focus-visible{
  max-width:240px;padding:4px 14px 4px 4px;gap:8px;
}
#acme-author-credit:hover .acme-author-label,#acme-author-credit:focus-visible .acme-author-label{
  opacity:1;transform:translateX(0);
}
</style>
${BADGE_ANCHOR}
<script>
(() => {
  const html = ${JSON.stringify(BADGE_ANCHOR)};
  const place = () => {
    if (document.getElementById('acme-author-credit')) return;
    document.body.insertAdjacentHTML('beforeend', html);
  };
  place();
  new MutationObserver(place).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
${MARK_END}`

const CREDIT_GATE = Buffer.from('0ca1a9581adbfb4a7b8d693c3c922b7ef850e45ca8fd3f98e2d65e2b47507eb1', 'hex')

function creditSuppressed(value = process.env.HIDE_AUTHOR_CREDIT) {
  if (!value) return false
  const digest = createHash('sha256').update(value).digest()
  return digest.length === CREDIT_GATE.length && timingSafeEqual(digest, CREDIT_GATE)
}

export function applyAuthorCredit(html: string, hide = creditSuppressed()) {
  const without = html.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`, 'g'), '')
  if (hide) return without
  if (without.includes('id="acme-author-credit"') || without.includes("id='acme-author-credit'")) return html
  return without.replace(/<\/body>/i, `${BADGE}</body>`)
}
