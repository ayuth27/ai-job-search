# Template: thai-cv

- **Type:** CV
- **Source extension:** .tex
- **Engine/toolchain:** xelatex (display label only)
- **Page limit:** 2 page(s)
- **Fonts:** Sarabun (Thai + Latin, SIL OFL, bundled in `cover_letters/OpenFonts/fonts/sarabun/`) for Thai script; Lato (bundled in `cover_letters/OpenFonts/fonts/lato/`) for Latin runs via `ucharclasses`; Font Awesome 5 for contact icons (ships with the `fontawesome5` TeX package)
- **Class/packages:** `moderncv` (banking style, blue), `fontspec`, `ucharclasses`, `fontawesome5` (pulled in by moderncv), `geometry`, `needspace`, `hyperref` (loaded by moderncv)

## Compile command

    cd cv && xelatex -interaction=nonstopmode -halt-on-error <file>.tex

Run it twice; moderncv needs a second pass for the `\lastpage`/hyperref references.

## Style rules

- **Document language follows the posting.** Use this template only when the posting is in Thai (see `01-candidate-profile.md`, "Thai Market Notes"). English postings keep the stock English template.
- **Technical terms stay in English inside Thai prose.** Tool and framework names (PyTorch, Kubernetes, Claude Code) and job titles ("Machine Learning Engineer", "Data Analyst") are written in English. `ucharclasses` switches those runs to Lato automatically; never translate them.
- **Section headings and the References line are Thai and must stay Thai:** ประวัติส่วนตัว, ทักษะหลัก, ประสบการณ์ทำงาน, การศึกษา, ภาษา, ผลงานตีพิมพ์, รางวัล, บุคคลอ้างอิง, and `ยินดีให้ข้อมูลเมื่อได้รับการร้องขอ` under References. (`รางวัลและเกียรติคุณ` is an equally formal alternative if honours and awards are listed together.)
- **Dates are CE years with an ASCII hyphen** (`2021-2024`, not `2021--2024`). Use Buddhist Era only for Thai-language government/SOE postings, and label it: `2566 (B.E.)`.
- Section order, moderncv blue accents, bold category labels in ทักษะหลัก, and the `\vspace{1pt}` / `\vspace{3pt}` spacing convention are unchanged from the stock template.
- Contact details (email, phone, address) stay literal text next to the icons - ATS parsers read the text layer, not the glyphs.
- **Photo, date of birth and nationality are OFF by default.** The commented `\photo` / `\extrainfo` block near the end of the preamble is for local Thai employers only; never enable it unasked, and never for MNCs. Note that `.gitignore` excludes `*.jpg`/`*.png`, so a photo file is not committed - it must exist locally in `cv/` at compile time.
- `\needspace{5\baselineskip}` sits before every `\cventry`; keep it when adding entries.

## Known pitfalls

- **Font paths are relative to the compile directory.** The template hard-codes `../cover_letters/OpenFonts/fonts/...`, which is correct when compiling from `cv/` (where `/apply` writes). To test-compile inside `templates/cv/thai-cv/`, prefix the four `Path =` values with `../../` (i.e. `../../../cover_letters/...`) or copy the scratch file into `cv/` and compile there. A wrong path fails loudly with `fontspec: The font "Sarabun" cannot be found`.
- **moderncv loads `fontspec` itself under xelatex/lualatex.** All `\setmainfont`/`\setsansfont`/`\newfontfamily` calls must come *after* `\documentclass`, as they do here. Because the class is loaded with the `sans` option, `\familydefault` is `\sfdefault`: setting only `\setmainfont` leaves the whole CV in the default sans font and no Thai renders. Keep both calls.
- **Do not add `\usepackage[utf8]{inputenc}`** (or `[T1]{fontenc}`) - `inputenc` is not usable with XeTeX and the stock template's `\ifpdftex` guard is pointless here, since this template cannot be compiled with pdflatex at all.
- **`ucharclasses` transitions override any font selected mid-paragraph**, including the Font Awesome glyphs moderncv uses for contact icons. The body therefore sets `\XeTeXinterchartokenstate=0` around `\makecvtitle` and back to `1` afterwards. If icons ever render as blanks or as `.notdef` boxes elsewhere in the document, wrap that icon in `{\XeTeXinterchartokenstate=0 ...}`.
- **`\setTransitionsForThai{...}{...}`** takes (entering Thai)(leaving Thai). The generic equivalent, if a `ucharclasses` version does not define the per-block macro, is `\setTransitionTo{Thai}{\thaifont}` plus `\setTransitionFrom{Thai}{\latinfont}`.
- **Thai has no inter-word spaces**, so without `\XeTeXlinebreaklocale "th"` and `\XeTeXlinebreakskip = 0pt plus 1pt` a Thai paragraph is one unbreakable word that runs off the right margin. Both lines are in the preamble; do not remove them. They require a XeTeX built with ICU (every TeX Live / MiKTeX build is).
- **Both font families declare Bold/Italic/BoldItalic**, so `\textbf{}` survives a font transition. If a Latin family without a bold face is substituted, bold English terms inside Thai bullets will silently render upright.
- The stock template's LaTeX rules still apply: escape `&`, `%`, `$`, `#`, `_`; brace a bullet whose text starts with `[` as `\item {[text]}`.
