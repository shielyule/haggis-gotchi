# Kiro - Requirements: care-sleep ("Put to bed")

Status: owner request 19 Nov 2026, built the same day. Note for judges: this spec was written
alongside the build (owner asked to implement directly), not before it.

1. THE care screen SHALL offer "Put to bed". WHEN pressed, THE Haggling SHALL sleep for 8 hours.
2. WHILE asleep: Energy recovers (+8 an hour), Hunger drops at half speed, Mood does not drop, and no meal or bedtime reminders are sent.
3. WHEN the 8 hours are up, THE Haggling SHALL wake rested (Mood +10, scrapbook line) and THE SYSTEM SHALL send one "{name} is awake!" notification.
4. IF it is fed, walked or given a treat while asleep, THEN it SHALL wake early and grumpy (Mood -20, "crabbit" scrapbook line). Cuddles and cleaning do not wake it.
5. Missing the bedtime window while asleep SHALL NOT cost Health XP.
6. THE public scrapbook SHALL say "{carer} just put {name} to bed" (for carers who opted in).
7. THE hidden demo menu SHALL offer "Wake up now (skip the 8 hours)".
