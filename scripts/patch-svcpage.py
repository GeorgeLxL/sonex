import io
p = "app/(public)/services/page.tsx"
raw = io.open(p, encoding="utf-8", newline="").read()
crlf = "\r\n" in raw
s = raw.replace("\r\n", "\n")

old = '''      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s) => (
            <a key={s.id} href={`#${s.slug}`} className="rounded-xl border border-line/60 bg-surface p-5 shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10">
              <span className="inline-flex rounded-xl bg-gradient-to-br from-accent to-violet-500 p-2.5 text-white shadow-md shadow-accent/30">
                <IconByName name={s.icon} size={20} />
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.summary}</p>
            </a>
          ))}
        </div>
      </Section>'''
new = '''      <Section>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s, i) => (
            <div key={s.id} className="relative">
              <div className="absolute inset-0 translate-x-3 translate-y-3 rounded border-2 border-dashed border-accent" />
              <a
                href={`#${s.slug}`}
                className="relative block h-full rounded border border-line/60 bg-surface p-5 shadow-md shadow-black/5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
              >
                <span className={`inline-flex rounded bg-gradient-to-br p-2.5 text-white shadow-md ${ICON_HUES[i % ICON_HUES.length]}`}>
                  <IconByName name={s.icon} size={20} />
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.summary}</p>
              </a>
            </div>
          ))}
        </div>
      </Section>'''
assert old in s, "grid block not found"
s = s.replace(old, new)

old2 = '''interface ProcessStep {'''
new2 = '''const ICON_HUES = [
  "from-accent to-violet-500 shadow-accent/30",
  "from-sky-500 to-cyan-500 shadow-sky-500/30",
  "from-emerald-500 to-teal-500 shadow-emerald-500/30",
  "from-amber-500 to-orange-500 shadow-amber-500/30",
  "from-pink-500 to-rose-500 shadow-pink-500/30",
  "from-indigo-500 to-blue-500 shadow-indigo-500/30",
];

interface ProcessStep {'''
assert old2 in s, "interface anchor not found"
s = s.replace(old2, new2)

if crlf:
    s = s.replace("\n", "\r\n")
io.open(p, "w", encoding="utf-8", newline="").write(s)
print("patched")
