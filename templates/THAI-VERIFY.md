# Thai templates - local verification checklist

Nothing in `templates/cv/thai-cv/` or `templates/cover_letters/thai-cover/` has been
compiled: the machine they were authored on had no LaTeX and no Thai fonts. Work through
this list once, on a machine with a TeX distribution, before registering either template
with `/add-template`.

## 0. Prerequisites

Sarabun (SIL OFL, Cadson Demak) is already in the repo at
`cover_letters/OpenFonts/fonts/sarabun/` - four TTFs plus `OFL.txt`. It does not need to be
installed system-wide; both templates load it by path.

TeX packages (TinyTeX / TeX Live):

```bash
tlmgr install moderncv fontspec ucharclasses fontawesome5 needspace geometry \
  hyperref xltxtra xunicode titlesec textpos fancyhdr cite xcolor etoolbox iftex \
  l3packages l3kernel euenc realscripts metalogo
```

MiKTeX installs missing packages on demand, so normally you only need to say yes to the
prompts. To pre-install:

```powershell
miktex packages install moderncv fontspec ucharclasses fontawesome5 needspace geometry hyperref xltxtra xunicode titlesec textpos fancyhdr cite xcolor etoolbox iftex l3packages l3kernel euenc realscripts metalogo
```

(MiKTeX before 21.x: `mpm --admin --install=<package>`, one package per call.)

Confirm the engine can see the fonts at all before debugging anything else:

```bash
cd /path/to/ai-job-search/cover_letters
fc-query OpenFonts/fonts/sarabun/Sarabun-Regular.ttf | head -3
```

## 1. Compile the CV

The template's `Path =` values are relative to `cv/`, so compile there, not inside the
template folder.

```bash
cd /path/to/ai-job-search/cv
cp ../templates/cv/thai-cv/template.tex _compile_test.tex
# fill the [PLACEHOLDER] tokens with realistic Thai dummy content first
xelatex -interaction=nonstopmode -halt-on-error _compile_test.tex
xelatex -interaction=nonstopmode -halt-on-error _compile_test.tex
```

Expected: `Output written on _compile_test.pdf (2 pages, ...)`.

- [ ] Exactly **2 pages**
- [ ] Thai renders as Thai, not as blank boxes or `.notdef` squares
- [ ] English technical terms render in Lato (visibly different from the Thai Sarabun run)
- [ ] Contact icons (phone, envelope, home) still render - they come from fontawesome5 and
      are the thing most likely to be broken by a `ucharclasses` transition
- [ ] Thai paragraphs break at the right margin instead of running off the page
      (if they run off, `\XeTeXlinebreaklocale "th"` is not taking effect)
- [ ] Tone marks and upper vowels do not collide with the line above
- [ ] No orphaned `\cventry` title at a page foot with its bullets on the next page
- [ ] Section headings are the Thai ones, References reads `ยินดีให้ข้อมูลเมื่อได้รับการร้องขอ`

## 2. Compile the cover letter

```bash
cd /path/to/ai-job-search/cover_letters
cp ../templates/cover_letters/thai-cover/cover-th.cls .
cp ../templates/cover_letters/thai-cover/template.tex _compile_test.tex
xelatex -interaction=nonstopmode -halt-on-error _compile_test.tex
```

Expected: `Output written on _compile_test.pdf (1 page, ...)`.

- [ ] Exactly **1 page**, signature block included
- [ ] Bullet font matches the body font (both Sarabun) - the wrapper path must be
      `OpenFonts/fonts/sarabun/`, not `raleway/`
- [ ] The 40pt name in `\namesection` is not swapped to another font mid-line
- [ ] Salutation `เรียน ...` and closing `ขอแสดงความนับถือ` render correctly

## 3. Verify the text layer (ATS)

```bash
cd /path/to/ai-job-search
python tools/verify_pdf.py cv/_compile_test.pdf --pages 2 --dump-text cv/_compile_test.txt
python tools/verify_pdf.py cover_letters/_compile_test.pdf --pages 1 \
  --dump-text cover_letters/_compile_test.txt
```

Open each `.txt` and check:

- [ ] **No `(cid:NNN)` markers and no `�` replacement characters.** Either means the
      subsetted font reached the PDF without a usable Unicode mapping, and an ATS sees the
      same garbage. This is the single most likely Thai-specific failure.
- [ ] **Thai combining marks are intact.** Thai vowels and tone marks (U+0E31, U+0E34-U+0E3A,
      U+0E47-U+0E4E) are *always* separate codepoints - that is normal and not a bug. What is
      a bug: marks that arrive reordered relative to their base consonant, or dropped
      entirely. Compare a copied line against the `.tex` source character by character:
      ```bash
      python3 -c "import sys,unicodedata as u; [print(hex(ord(c)), u.name(c,'?')) for c in open(sys.argv[1],encoding='utf-8').read()[:80]]" cv/_compile_test.txt
      ```
- [ ] **SARA AM (U+0E33) survives.** Shapers routinely decompose it into NIKHAHIT (U+0E4D) +
      SARA AA (U+0E32) in the text layer. The page looks right, and a string search for a
      word containing `ำ` fails. NFC does **not** recompose it, so if the dump shows the
      decomposed pair, a keyword containing `ำ` will not match in an ATS either. Prefer
      keywords without it, or accept the miss knowingly.
- [ ] **`--contains` folds, the dump does not.** `verify_pdf.py --contains` normalises both
      sides to NFC (plus whitespace and LaTeX's dash/quote substitutions), so a `--contains`
      check can pass on text that the raw `--dump-text` output shows in a different
      normalisation form. The dump is the ATS's view; when the two disagree, trust the dump.
      ```bash
      python tools/verify_pdf.py cv/_compile_test.pdf --contains "[YOUR_EMAIL]" --contains "Machine Learning Engineer"
      ```
- [ ] **Email and phone appear as literal text**, not only as icons or link targets.
- [ ] **Word spacing is absent in the Thai runs.** Expected: Thai is written without spaces,
      so the dump has long unbroken Thai strings. Latin technical terms must still be
      space-delimited - if they are glued to adjacent Thai text, ATS keyword matching on
      them may still work but check a couple by eye.
- [ ] **Reading order matches the page** (single-column moderncv, so it should).
- [ ] Every experience date reads `YYYY-YYYY` with an ASCII hyphen in the dump.

Delete `_compile_test.*` from `cv/` and `cover_letters/` when done.

## 4. Register the templates

Only after both test compiles pass:

```
/add-template templates/cv/thai-cv/template.tex
/add-template --use thai-cv

/add-template templates/cover_letters/thai-cover/template.tex
/add-template --use thai-cover
```

`--use` writes the `ACTIVE-TEMPLATE` block into `05-cv-templates.md` and
`06-cover-letter-templates.md`, which is what makes `/apply` compile with
`xelatex` instead of `lualatex`. Check with `/add-template --list`.

Switch back with `/add-template --use default` whenever the posting is in English - the
Thai templates are for Thai-language postings only (see `01-candidate-profile.md`,
"Thai Market Notes").

## 5. If something fails

| Symptom | Cause |
|---|---|
| `fontspec: The font "Sarabun-Regular" cannot be found` | Compiling from the wrong directory; `Path =` is relative to `cv/` or `cover_letters/` |
| Whole document in the wrong font, no Thai | Only `\setmainfont` took effect; moderncv's `sans` option routes through `\sfdefault`, so `\setsansfont` is required too |
| Thai paragraph runs off the right margin | `\XeTeXlinebreaklocale "th"` missing, or XeTeX built without ICU |
| Contact icons blank or boxed | A `ucharclasses` transition fired over the fontawesome5 font; widen the `\XeTeXinterchartokenstate=0` guard around the icon |
| `Undefined control sequence \setTransitionsForThai` | Old `ucharclasses`; use `\setTransitionTo{Thai}{\thaifont}` and `\setTransitionFrom{Thai}{\latinfont}` |
| Bold English terms inside Thai bullets render upright | The Latin family lost its `BoldFont` declaration |
