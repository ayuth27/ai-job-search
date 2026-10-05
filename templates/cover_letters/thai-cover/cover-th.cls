% Intro Options
\ProvidesClass{cover-th}[2026/09/16 Thai cover letter class]
\NeedsTeXFormat{LaTeX2e}
\DeclareOption{print}{\def\@cv@print{}}
\DeclareOption*{%
  \PassOptionsToClass{\CurrentOption}{article}
}
\ProcessOptions\relax
\LoadClass{article}

% Package Imports
\usepackage[hmargin=2.3cm, vmargin=2.3cm]{geometry}
\usepackage[hidelinks]{hyperref}
\usepackage[usenames,dvipsnames]{xcolor}
\usepackage{titlesec}
\usepackage[absolute]{textpos}
\usepackage{fontspec,xltxtra,xunicode}

% Publications
\usepackage{cite}
\renewcommand\refname{\vskip -1.5cm}

% Color definitions
\definecolor{date}{HTML}{666666}
\definecolor{primary}{HTML}{2b2b2b}
\definecolor{headings}{HTML}{6A6A6A}
\definecolor{subheadings}{HTML}{333333}

% Set main fonts
\setmainfont[Color=primary, Path = OpenFonts/fonts/sarabun/,BoldItalicFont=Sarabun-BoldItalic,BoldFont=Sarabun-Bold,ItalicFont=Sarabun-Italic]{Sarabun-Regular}
\setsansfont[Scale=MatchLowercase,Mapping=tex-text, Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}

% Thai script stays Sarabun, Latin runs (English technical terms) fall back to Lato
\newfontfamily\thaifont[Path = OpenFonts/fonts/sarabun/,BoldItalicFont=Sarabun-BoldItalic,BoldFont=Sarabun-Bold,ItalicFont=Sarabun-Italic]{Sarabun-Regular}
\newfontfamily\latinfont[Path = OpenFonts/fonts/lato/,BoldItalicFont=Lato-BolIta,BoldFont=Lato-Bol,ItalicFont=Lato-RegIta]{Lato-Reg}
\usepackage{ucharclasses}
\setTransitionsForThai{\thaifont}{\latinfont}

% Thai is written without spaces between words; ICU line breaking plus a
% stretchable inter-character skip is what lets XeTeX break a Thai paragraph.
\XeTeXlinebreaklocale "th"
\XeTeXlinebreakskip = 0pt plus 1pt

% Date command
\setlength{\TPHorizModule}{1mm}
\setlength{\TPVertModule}{1mm}
\newcommand{\lastupdated}{\begin{textblock}{60}(155,5)
\color{date}\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{8pt}{10pt}\selectfont
ปรับปรุงล่าสุด \today
\end{textblock}}

% Name command
\newcommand{\namesection}[3]{
\centering{
\XeTeXinterchartokenstate=0
\fontsize{40pt}{60pt}
\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\selectfont #1
\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Bold}\selectfont #2
} \\[5pt]
\centering{
\XeTeXinterchartokenstate=0
\color{headings}
\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{14pt}\selectfont #3}
\noindent\makebox[\linewidth]{\color{headings}\rule{\paperwidth}{0.0pt}}
\vspace{0pt}
}

% Section seperators
\titlespacing{\section}{0pt}{0pt}{0pt}
\titlespacing{\subsection}{0pt}{0pt}{0pt}
\newcommand{\sectionsep}{\vspace{8pt}}

% Headings command
\titleformat{\section}{\color{headings}
\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{16pt}{24pt}\selectfont \raggedright}{}{0em}{}

% Subeadings command
\titleformat{\subsection}{
\color{subheadings}\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Bold}\fontsize{12pt}{12pt}\selectfont\bfseries}{}{0em}{}

\newcommand{\runsubsection}[1]{
\color{subheadings}\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Bold}\fontsize{12pt}{12pt}\selectfont\bfseries {#1} \normalfont}

% Descriptors command
\newcommand{\descript}[1]{
\color{subheadings}\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\} \normalfont}

% Location command
\newcommand{\location}[1]{
\color{headings}\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{10pt}{12pt}\selectfont {#1\\} \normalfont}

% Bullet Lists with fewer gaps command
\newenvironment{tightemize}{
\vspace{-\topsep}\begin{itemize}\itemsep1pt \parskip0pt \parsep0pt}
{\end{itemize}\vspace{-\topsep}}

% Cover Letter
\newcommand{\companyname}[1]{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Bold}\fontsize{12pt}{14pt}\selectfont {#1 \\} \normalfont}

\newcommand{\companyaddress}[1]{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\}\mbox{}\\\mbox{}\\ \normalfont}

\newcommand{\currentdate}[1]{\raggedleft\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\} \normalfont}

% Letter content command
\newcommand{\lettercontent}[1]{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\}\mbox{}\\ \normalfont}

\newcommand{\closing}[1]{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\}\mbox{}\\\mbox{}\\ \normalfont}

\newcommand{\signature}[1]{\raggedright\fontspec[Path = OpenFonts/fonts/sarabun/]{Sarabun-Regular}\fontsize{11pt}{13pt}\selectfont {#1 \\} \normalfont}
