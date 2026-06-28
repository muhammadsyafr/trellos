---
version: alpha
name: Trello Calm Productivity
description: A bright, friendly, task-oriented system with a clean editorial voice and strong blue calls to action.
colors:
  primary: "#0052CC"
  secondary: "#172B4D"
  tertiary: "#6554C0"
  neutral: "#F4F5F7"
  surface: "#FFFFFF"
  on-surface: "#091E42"
  error: "#DE350B"
  primary-60: "#4C9AFF"
  primary-70: "#2684FF"
  primary-80: "#0065FF"
  border: "#DFE1E6"
typography:
  headline-display:
    fontFamily: "Charlie Display"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: "52px"
    letterSpacing: "0px"
  headline-lg:
    fontFamily: "Charlie Display"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: "48px"
    letterSpacing: "0px"
  headline-md:
    fontFamily: "Charlie Display"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: "36px"
    letterSpacing: "0px"
  headline-sm:
    fontFamily: "Charlie Display"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Charlie Text"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "30px"
    letterSpacing: "0px"
  body-md:
    fontFamily: "Charlie Text"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Charlie Text"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Charlie Text"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "0px"
  label-md:
    fontFamily: "Charlie Text"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Charlie Text"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0px"
  caption:
    fontFamily: "Charlie Text"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0px"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "90px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "50px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  banner:
    backgroundColor: "#D9E6FF"
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
---

# Trello Calm Productivity

## Overview
Trello presents a cheerful, approachable productivity brand that feels lightweight rather than enterprise-heavy. The page uses a lot of open white space, a restrained navy text palette, and one vivid blue accent to keep the experience crisp and trustworthy. It is clearly aimed at teams and individuals who want organization without friction, with a friendly tone that still reads professional.

## Colors
- **Primary (#0052CC):** The signature Trello blue used for major CTAs, links, and interactive emphasis. It feels confident, energetic, and highly recognizable.
- **Secondary (#172B4D):** A deep blue-gray used for navigation, body emphasis, and supporting text. It provides the brand’s main readable contrast against white surfaces.
- **Tertiary (#6554C0):** A soft violet accent that can support secondary highlights or illustrative moments without competing with the primary blue.
- **Neutral (#F4F5F7):** A pale cool neutral for quiet backgrounds, subtle panels, and separation layers when pure white would feel too stark.
- **Surface (#FFFFFF):** The dominant canvas color across the header, content areas, cards, and form controls.
- **On-surface (#091E42):** The darkest ink tone for strong hierarchy, headline weight, and high-contrast text.
- **Border (#DFE1E6):** A light structural gray for inputs, dividers, and low-emphasis outlines.
- **Primary variants (#4C9AFF, #2684FF, #0065FF):** Brighter and darker steps that can support hover, active, and accessible interaction states.
- **Error (#DE350B):** A clear warm red reserved for destructive or validation states.

## Typography
The system uses two complementary families: **Charlie Display** for headlines and **Charlie Text** for everything supporting readability and interface clarity. Headings are medium-weight and slightly compact, giving the page a polished editorial character without becoming ornate. Body copy stays regular weight, with a larger-than-average size in key marketing sections to keep the voice friendly and easy to scan. Labels and navigation text lean medium-weight for crispness; capitalization is mostly sentence case, with occasional uppercase utility labels for section kicks.

## Layout
The layout is centered and spacious, with a hero composition that balances left-aligned copy and right-side illustration. Vertical rhythm is generous, using broad section gaps and clear separation between navigation, announcement bar, hero, and follow-up content. Form controls and CTA buttons sit close together to support quick conversion, while surrounding whitespace keeps the page from feeling dense. The overall spacing strategy feels based on a simple modular scale: small UI gaps around 6px to 16px, standard content spacing around 24px, and large section breathing room around 48px to 90px.

## Elevation & Depth
The interface is mostly flat and clean, relying on contrast, spacing, and color rather than dramatic shadows. Where depth is needed, it is subtle: cards and controls use light borders or soft shadowing to separate themselves from the white background. This keeps the page feeling modern and fast, while the illustrated hero art provides most of the visual drama.

## Shapes
The shape language is calm and approachable, with small-to-medium radii on interactive elements and cards. Inputs and buttons use softly rounded corners rather than pill forms, which keeps the interface efficient and pragmatic. The result is friendly but not playful; it feels more like a refined SaaS product than a consumer app.

## Components
Buttons should be crisp, legible, and conversion-focused. `button-primary` uses Trello blue with white text, a compact rounded corner, and medium padding for strong emphasis. `button-secondary` stays white with a bordered treatment and darker text for less urgent actions. `button-tertiary` is text-only and should be used for inline actions such as “Watch video” or supplemental links.

Cards should use `card` styling: white surface, subtle radius, moderate padding, and restrained shadow or border separation. They should never feel heavy or deeply elevated. Inputs should be simple and functional, with white fill, light borders, and a height that matches the main button rhythm. Forms should prioritize clarity over decoration.

Links are an important brand cue: they use the primary blue and remain understated rather than underlined-heavy. Announcement bars should be soft and informational, with a pale blue background and centered copy. Any icon buttons, chips, or nav items should remain minimal, using color only for emphasis and not for loud decoration.

## Do's and Don'ts
- Do keep layouts airy and centered, with generous whitespace around primary marketing content.
- Do use Trello blue for the highest-priority action and link states.
- Do pair Charlie Display for headlines with Charlie Text for body and interface copy.
- Do keep borders and shadows subtle so the experience stays light and uncluttered.
- Don't introduce heavy gradients, dark backgrounds, or dramatic glassmorphism.
- Don't over-round controls into pills unless a specific CTA calls for it.
- Don't use multiple competing accent colors for primary actions.
- Don't crowd the hero or form areas; the design depends on clarity and breathing room.