# Kiro - Requirements: ai-haggling
Status: AGREED with the owner, 23 Nov 2026 (ideas 1, 2 and 4; no free chat).
AI: **Google Gemini** (`gemini-3.5-flash-lite`, paid tier) since 25 Nov 2026. Was Amazon Bedrock (Amazon Nova Lite,
eu-west-2), which gave the account a 0-token quota (`docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`); the Bedrock path
remains behind `AI_PROVIDER=bedrock`. Gemini's terms require an 18+ service: the game is 18+ from 25 Nov.

## Overview
Three AI features that never let a player type freely to the AI:
a nightly diary, a reaction to anything in a Photo Treat photo, and a daily folklore riddle.
Every entry lives in a scrapbook book that keeps every page, ever.

## Requirements (EARS)
### R1 Every scrapbook page is kept
1. WHEN a scrapbook entry is made on the phone, THE SYSTEM SHALL save it to the cloud the next time the phone syncs.
2. THE SYSTEM SHALL NOT delete scrapbook entries when syncing (sync-conflict R4.1).
3. Each entry SHALL have a kind: `care`, `diary`, `photo`, `riddle`, `weather`, `milestone`.

### R2 The scrapbook book
1. THE care screen SHALL offer "Open the scrapbook", opening the book in a new tab (like the graveyard).
2. THE book SHALL show every entry ever, newest first, as pages of an ornate book.
3. THE book SHALL offer tabs: All, Diary, Photos and riddles, and one tab per life week (Week 1-6).
4. THE book SHALL show only the signed-in carer's own Hagglings.
5. WHERE the owner supplies `/art/scrapbook-cover.jpeg`, THE book cover SHALL use it; otherwise a drawn leather cover.

### R3 The nightly diary
1. ONCE per Haggling per local day, at the carer's 21:00 (or later that evening), THE SYSTEM SHALL write a diary entry in the Haggling's own voice.
2. THE entry SHALL draw on that day only: the weather readings and their place, the care given, the life stage, the season or special day, and the day of life.
3. Place SHALL be a town name at most: the home place, or the nearest town to the stored rough area. Never coordinates.
4. THE SYSTEM SHALL NOT use news.
5. WHEN the weather was a storm, THE entry SHALL be about the storm.
6. THE entry SHALL be 1-3 sentences, at most 300 characters, name the Haggling, and contain no blocked word, link, email address or number longer than 4 digits.
7. IF the AI fails, is slow (10 s), is switched off, or its text fails R3.6, THEN THE SYSTEM SHALL write a diary line from the written templates instead. The game never depends on the AI.
8. Departed Hagglings SHALL get no diary.
9. THE hidden demo menu SHALL offer "Write tonight's diary now" for demo eggs.

### R4 "What's that?" Photo Treat
1. WHEN a photo is not one of the five treats, THE SYSTEM SHALL send only Rekognition's object labels (never the photo, never people) to the AI and return a one-sentence reaction in the Haggling's voice.
2. A reaction SHALL NOT change the bars and SHALL NOT use up the day's Photo Treat.
3. THE reaction SHALL follow R3.6 (one sentence, at most 200 characters) and fall back to a written line.
4. IF only people were seen, THEN THE Haggling SHALL simply wave (written line, no AI call).

### R5 Folklore riddle (second game)
1. THE SYSTEM SHALL offer one Scottish folklore riddle per day, the same for every carer, with three answers to pick from.
2. THE riddle SHALL be written by the AI once a day from a rotating topic list, checked (R5.3), stored, and reused for everyone that day.
3. A riddle SHALL have a question of at most 300 characters, three different answers of at most 40 characters each, exactly one right answer, an explanation of at most 200 characters, and no blocked word; the right answer SHALL NOT appear in the question.
4. IF the AI fails or R5.3 fails, THEN THE SYSTEM SHALL use a riddle from the written bank.
5. Each Haggling SHALL get one guess per day. Right: Mood +8 and a scrapbook page. Wrong: Mood +2 ("nice try") and the explanation.

### R6 Limits and safety
1. THE SYSTEM SHALL make at most 400 AI calls per day across the whole game; above that, R3.7 and R4.3 fallbacks apply.
2. Prompts SHALL contain no email address, carer name, coordinates or free text typed by the carer except the Haggling's name (at most 30 characters).
3. THE AI SHALL be called only from Edge Functions, with the AWS key in Supabase secrets.
4. Weather, diary and riddles SHALL NOT change Health XP.
