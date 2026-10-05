---
framework_version: 1.1.2
---

# Candidate Profile

<!-- SETUP: This file is populated by running /setup -->
<!-- After running /setup, all sections will be filled with your actual information -->

## Identity
- **Name:** [YOUR_NAME]
- **Location:** [YOUR_ADDRESS]
- **Phone:** [YOUR_PHONE]
- **Email:** [YOUR_EMAIL]
- **LinkedIn:** [YOUR_LINKEDIN_URL]
- **GitHub:** [YOUR_GITHUB_URL]
- **Status:** [YOUR_EMPLOYMENT_STATUS]
- **Constraints:** [YOUR_COMMUTE_OR_LOCATION_CONSTRAINTS]

### Languages
<!-- Every language you can work in professionally, with your honest level. Used by the
Language Gate in 04-job-evaluation.md and by job-scraper/search-queries.md's query-language
generation. Omit any language you don't actually work in - an undeclared language is treated as
a hard no, not a gap to smooth over. -->

| Language | Level | Notes |
|----------|-------|-------|
| [LANGUAGE] | [LEVEL, e.g. "Native" / "C2" / "B1/B2 (conversational)"] | [optional] |

## Education

| Degree | Period | Institution | Key Topics |
|--------|--------|-------------|------------|
| [DEGREE] | [YEARS] | [INSTITUTION] | [TOPICS] |

## Professional Experience

### [JOB_TITLE] - [COMPANY] ([START] - [END])
[LOCATION]
- [RESPONSIBILITY_OR_ACHIEVEMENT_1]
- [RESPONSIBILITY_OR_ACHIEVEMENT_2]
- [RESPONSIBILITY_OR_ACHIEVEMENT_3]

<!-- Add more roles as needed -->

## Independent Projects
<!-- Projects outside of employment: freelance, open source, personal -->
- **[PROJECT_NAME]**: [DESCRIPTION]

## Technical Skills

### Programming & ML
- **[LANGUAGE]** ([PROFICIENCY]): [FRAMEWORKS_AND_LIBRARIES]
- [OTHER_SKILLS]

### Domain Expertise
- [DOMAIN_1]
- [DOMAIN_2]

### Software & Tools
- [TOOL_LIST]

## Publications
<!-- List peer-reviewed publications, if any -->
1. [AUTHOR_LIST] ([YEAR]). [TITLE]. [JOURNAL]. [DOI_LINK]

## Awards
- [AWARD] - [EVENT] ([YEAR])

## References
- [NAME], [TITLE], [COMPANY] ([EMAIL], [PHONE])

More references available upon request.

## Thai Market Notes

<!-- Applies only when job-seeking in Thailand. Everything in this section is optional. -->

### Name
Keep the romanised name in the `Name` field above - it is what the CV, cover letter and
LinkedIn use. Some local applications and government forms also want the Thai spelling; if so,
add one optional line directly beneath it, otherwise leave it out entirely:

- **Name (Thai script):** [YOUR_NAME_TH]

### Document language
`CV language` (CLAUDE.md, Identity) stays **English** by default - the right answer for MNCs,
regional offices and the English-language postings that dominate Bangkok tech hiring. The
posting overrides it: when the posting itself is written in Thai (local firms, SOEs, government,
Thai-language boards), the `/apply` drafter writes **both** CV and cover letter in Thai. An
English posting from any employer keeps English documents. Posting language decides; the profile
default applies when the posting gives no signal.

**Technical terms stay in English inside Thai documents.** Tool and framework names (PyTorch,
Kubernetes, Claude Code) and job titles such as "Machine Learning Engineer" or "Data Analyst"
are written in English even in an otherwise Thai CV. This is standard Thai tech-CV convention
and it keeps ATS keyword matching literal - translating them costs keyword matches and reads as
unidiomatic. Prose, section headings and the References line still follow the document language
(see `05-cv-templates.md`).

### Personal details and dates
Photo, date of birth and nationality are customary on CVs for **local Thai employers** and
unwelcome (sometimes a compliance problem) for MNCs and Western-headquartered companies. Treat
them as a per-template toggle, never default-on: the stock template omits them, and a
local-employer variant registered via `/add-template` may carry them. Never add them unasked.

Dates use **CE years** by default. Use Buddhist Era (BE = CE + 543) only when the posting is in
Thai *and* the employer is government or an SOE, and label it explicitly (e.g. `2566 (B.E.)`).
