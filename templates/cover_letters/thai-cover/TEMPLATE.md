# Template: thai-cover

- **Type:** Cover letter
- **Source extension:** .tex
- **Engine/toolchain:** xelatex (display label only)
- **Page limit:** 1 page(s)
- **Fonts:** Sarabun (Thai + Latin, SIL OFL, bundled in `cover_letters/OpenFonts/fonts/sarabun/`) as the main font; Lato (bundled in `cover_letters/OpenFonts/fonts/lato/`) for Latin runs via `ucharclasses`
- **Class/packages:** `cover-th.cls` (this folder - a Thai fork of the stock `cover.cls`), `fontspec`, `ucharclasses`, `xltxtra`, `xunicode`, `geometry`, `titlesec`, `textpos`, `hyperref`, `xcolor`, `cite`, `fancyhdr`

## Compile command

    cd cover_letters && xelatex -interaction=nonstopmode -halt-on-error <file>.tex

`cover-th.cls` must sit in `cover_letters/` next to the `.tex` file (copy it there once), and the font paths inside it resolve relative to that directory.

## Style rules

- **Use this template only when the posting is in Thai** (see `01-candidate-profile.md`, "Thai Market Notes"). English postings keep the stock `cover.cls`.
- **All macro names are unchanged** from `cover.cls` - `\namesection`, `\currentdate`, `\lettercontent`, `\closing`, `\signature`, `\companyname`, `\companyaddress`, `\tightemize` - so the stock guidance in `06-cover-letter-templates.md` still applies verbatim.
- **Salutation:** `เรียน` followed by the recipient's title and name. Fallback when the recipient is unknown: `เรียน ผู้จัดการฝ่ายสรรหาบุคลากร`. **Closing:** `ขอแสดงความนับถือ`.
- **Technical terms stay in English** inside Thai prose - tool names, framework names and job titles ("Machine Learning Engineer"). `ucharclasses` switches those runs to Lato automatically.
- **Write the date out in Thai** (`15 กันยายน 2569` is BE; `15 กันยายน 2026` is CE). `\today` prints an English date, which is why the template ships a placeholder rather than `\today`. Use CE unless the employer is government or an SOE.
- Structure and word budget are unchanged: 3-4 body blocks, 250-300 words, one page including the signature block.

## Known pitfalls

- **`\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}`.** The macro appends `\\`, which errors with "There's no line here to end" after `\end{itemize}` and produces no PDF. Close `\lettercontent{}` first, then wrap the list in the matching font: `{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`. Note the path is `sarabun/`, not the stock `raleway/` - a Raleway wrapper renders Thai bullets as blank boxes.
- **No trailing `\\` inside `\closing{}`** - the class appends its own.
- **`ucharclasses` transitions override any font selected mid-paragraph.** `\namesection` therefore sets `\XeTeXinterchartokenstate=0` inside both of its groups so the 40pt display name and the contact line keep their declared font. If a glyph elsewhere renders as a blank box, wrap it the same way.
- **`\uppercase` and `\scshape` were dropped** from `\titleformat{\section}`, `\titleformat{\subsection}`, `\runsubsection` and `\descript`: Thai has no case, and faked small caps on Thai text produce scaled, misaligned glyphs. Latin headings therefore render in mixed case in this class - that is intentional.
- **Thai has no inter-word spaces**, so `\XeTeXlinebreaklocale "th"` and `\XeTeXlinebreakskip = 0pt plus 1pt` in the class are what allow a Thai paragraph to break at all. Without them a paragraph runs off the right margin as a single word. They need a XeTeX built with ICU (all TeX Live / MiKTeX builds are).
- **Thai line height:** Sarabun's tone marks and upper vowels stack two levels above the base line. `\fontsize{11pt}{13pt}` is the stock leading and is tight for Thai; if marks collide with the line above, raise the second number to `15pt` in `\lettercontent` (and the bullet wrapper) rather than shrinking the text.
- Escape `&`, `%`, `$`, `#`, `_` as usual; brace a bullet whose text starts with `[` as `\item {[text]}`.
